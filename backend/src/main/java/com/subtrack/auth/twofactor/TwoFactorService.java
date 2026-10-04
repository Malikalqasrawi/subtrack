package com.subtrack.auth.twofactor;

import com.subtrack.auth.alert.SecurityAlert;
import com.subtrack.auth.alert.SecurityAlertMailer;
import com.subtrack.auth.twofactor.dto.TwoFactorSetupResponse;
import com.subtrack.common.SecretBox;
import com.subtrack.common.Sha256;
import com.subtrack.common.error.BadRequestException;
import com.subtrack.common.error.ConflictException;
import com.subtrack.user.User;
import com.subtrack.user.UserRepository;
import com.subtrack.user.UserService;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalLong;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TwoFactorService {

	private static final int RECOVERY_CODE_COUNT = 8;

	/** No 0, 1, I or O, so a code read aloud or copied by hand is unambiguous. */
	private static final String RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

	private final UserService userService;

	private final RecoveryCodeRepository recoveryCodes;

	private final TotpAuthenticator totp;

	private final Clock clock;

	private final SecurityAlertMailer alerts;

	private final SecretBox secretBox;

	private final UserRepository users;

	private final SecureRandom random = new SecureRandom();

	public TwoFactorService(UserService userService, RecoveryCodeRepository recoveryCodes, TotpAuthenticator totp,
			Clock clock, SecurityAlertMailer alerts, SecretBox secretBox, UserRepository users) {
		this.secretBox = secretBox;
		this.users = users;
		this.userService = userService;
		this.recoveryCodes = recoveryCodes;
		this.totp = totp;
		this.clock = clock;
		this.alerts = alerts;
	}

	/** Creates a new secret. Two-factor is not on until {@link #enable} confirms the app works. */
	@Transactional
	public TwoFactorSetupResponse beginSetup(UUID userId) {
		User user = userService.getById(userId);
		if (user.isTotpEnabled()) {
			throw new ConflictException("TWO_FACTOR_ALREADY_ON", "Two-factor authentication is already on");
		}
		String secret = totp.generateSecret();
		user.beginTotpSetup(secretBox.seal(secret));
		return new TwoFactorSetupResponse(secret, totp.provisioningUri(secret, user.getEmail()));
	}

	/** Turns two-factor on and returns the recovery codes, which are shown this one time only. */
	@Transactional
	public List<String> enable(UUID userId, String code) {
		User user = userService.getById(userId);
		if (user.isTotpEnabled()) {
			throw new ConflictException("TWO_FACTOR_ALREADY_ON", "Two-factor authentication is already on");
		}
		if (user.getTotpSecret() == null) {
			throw new BadRequestException("TWO_FACTOR_NOT_STARTED", "Start two-factor setup first");
		}
		OptionalLong step = totp.matchingStep(secretBox.open(user.getTotpSecret()), code.trim());
		if (step.isEmpty()) {
			throw invalidCode();
		}
		user.enableTotp(step.getAsLong());

		recoveryCodes.deleteByUserId(userId);
		List<String> codes = new ArrayList<>();
		for (int i = 0; i < RECOVERY_CODE_COUNT; i++) {
			String recoveryCode = newRecoveryCode();
			recoveryCodes.save(new RecoveryCode(user, Sha256.hex(normalize(recoveryCode))));
			codes.add(recoveryCode);
		}
		alerts.send(user.getEmail(), SecurityAlert.TWO_FACTOR_ENABLED);
		return codes;
	}

	@Transactional
	public void disable(UUID userId, String code) {
		User user = userService.getById(userId);
		if (!user.isTotpEnabled()) {
			return;
		}
		if (!accepts(user, code)) {
			throw invalidCode();
		}
		user.disableTotp();
		recoveryCodes.deleteByUserId(userId);
		alerts.send(user.getEmail(), SecurityAlert.TWO_FACTOR_DISABLED);
	}

	/**
	 * Checks the second factor at sign-in: an authenticator code or an unused recovery code.
	 * Returns a value instead of throwing so that "this code has now been used" is committed.
	 */
	@Transactional
	public boolean verify(UUID userId, String code) {
		User user = userService.getById(userId);
		return user.isTotpEnabled() && accepts(user, code);
	}

	/** Encrypts secrets saved before they were encrypted. Returns how many accounts were changed. */
	@Transactional
	public int encryptStoredSecrets() {
		List<User> plain = users.findWithUnencryptedTotpSecret();
		plain.forEach(user -> user.replaceTotpSecret(secretBox.seal(user.getTotpSecret())));
		return plain.size();
	}

	private boolean accepts(User user, String code) {
		String trimmed = code.trim();
		if (trimmed.matches("\\d{6}")) {
			OptionalLong step = totp.matchingStep(secretBox.open(user.getTotpSecret()), trimmed);
			// A code that was already used is refused, so one seen over the shoulder cannot be replayed.
			return step.isPresent() && user.acceptTotpStep(step.getAsLong());
		}
		return recoveryCodes.findByUserIdAndCodeHashAndUsedAtIsNull(user.getId(), Sha256.hex(normalize(trimmed)))
			.map(recoveryCode -> {
				recoveryCode.markUsed(clock.instant());
				return true;
			})
			.orElse(false);
	}

	private String newRecoveryCode() {
		StringBuilder code = new StringBuilder();
		for (int i = 0; i < 10; i++) {
			if (i == 5) {
				code.append('-');
			}
			code.append(RECOVERY_ALPHABET.charAt(random.nextInt(RECOVERY_ALPHABET.length())));
		}
		return code.toString();
	}

	private static String normalize(String recoveryCode) {
		return recoveryCode.toUpperCase().replaceAll("[^A-Z0-9]", "");
	}

	private static BadRequestException invalidCode() {
		return new BadRequestException("INVALID_2FA_CODE", "That code is not valid");
	}

}
