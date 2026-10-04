package com.subtrack.auth;

import com.subtrack.auth.alert.SecurityAlert;
import com.subtrack.auth.alert.SecurityAlertMailer;
import com.subtrack.auth.dto.LoginRequest;
import com.subtrack.auth.dto.RegisterRequest;
import com.subtrack.auth.dto.ResetPasswordRequest;
import com.subtrack.auth.dto.VerifyEmailRequest;
import com.subtrack.auth.session.SessionService;
import com.subtrack.auth.social.SocialLoginService;
import com.subtrack.auth.social.SocialProvider;
import com.subtrack.auth.token.AccessTokenService;
import com.subtrack.auth.token.RefreshTokenService;
import com.subtrack.auth.twofactor.TwoFactorChallengeService;
import com.subtrack.auth.twofactor.TwoFactorService;
import com.subtrack.auth.verification.CodeMailer;
import com.subtrack.auth.verification.CodePurpose;
import com.subtrack.auth.verification.VerificationService;
import com.subtrack.common.error.BadRequestException;
import com.subtrack.common.error.ForbiddenException;
import com.subtrack.common.error.TooManyRequestsException;
import com.subtrack.common.error.UnauthorizedException;
import com.subtrack.config.AppProperties;
import com.subtrack.ratelimit.RateLimitRule;
import com.subtrack.ratelimit.RateLimiter;
import com.subtrack.user.User;
import com.subtrack.user.UserRepository;
import com.subtrack.user.UserService;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

	private static final String DEFAULT_CURRENCY = "USD";

	/** Second-factor guesses allowed per account, on top of the per-IP limit on the endpoint. */
	private static final RateLimitRule TWO_FACTOR_ATTEMPTS = new RateLimitRule("two-factor", "/", 5,
			Duration.ofMinutes(5));

	private final UserRepository users;

	private final UserService userService;

	private final PasswordEncoder passwordEncoder;

	private final VerificationService verificationService;

	private final CodeMailer codeMailer;

	private final SessionService sessions;

	private final AccessTokenService accessTokens;

	private final RefreshTokenService refreshTokens;

	private final TwoFactorService twoFactorService;

	private final TwoFactorChallengeService challenges;

	private final SocialLoginService socialLoginService;

	private final RateLimiter rateLimiter;

	private final SecurityAlertMailer alerts;

	/** Sign-in attempts allowed per account, on top of the per-IP limit on the endpoint. */
	private final RateLimitRule loginAttempts;

	/** Compared against when the email is unknown, so both cases take the same time. */
	private final String dummyPasswordHash;

	public AuthService(UserRepository users, UserService userService, PasswordEncoder passwordEncoder,
			VerificationService verificationService, CodeMailer codeMailer, SessionService sessions,
			AccessTokenService accessTokens, RefreshTokenService refreshTokens, TwoFactorService twoFactorService,
			TwoFactorChallengeService challenges, SocialLoginService socialLoginService, RateLimiter rateLimiter,
			SecurityAlertMailer alerts, AppProperties properties) {
		this.users = users;
		this.userService = userService;
		this.passwordEncoder = passwordEncoder;
		this.verificationService = verificationService;
		this.codeMailer = codeMailer;
		this.sessions = sessions;
		this.accessTokens = accessTokens;
		this.refreshTokens = refreshTokens;
		this.twoFactorService = twoFactorService;
		this.challenges = challenges;
		this.socialLoginService = socialLoginService;
		this.rateLimiter = rateLimiter;
		this.alerts = alerts;
		this.loginAttempts = new RateLimitRule("login", "/", properties.login().attemptsPerAccount(),
				properties.login().window());
		this.dummyPasswordHash = passwordEncoder.encode("not-a-real-password");
	}

	/**
	 * Creates an unverified account and emails a code. The caller gets the same response
	 * whether or not the email is already registered, so this cannot be used to discover
	 * who has an account.
	 */
	@Transactional
	public void register(RegisterRequest request) {
		String passwordHash = passwordEncoder.encode(request.password());
		Optional<User> existing = users.findByEmail(User.normalizeEmail(request.email()));
		if (existing.isEmpty()) {
			User user = users.save(new User(request.email(), passwordHash, request.displayName(),
					request.phoneNumber(), DEFAULT_CURRENCY));
			sendCode(user, CodePurpose.EMAIL_VERIFICATION);
			return;
		}
		User user = existing.get();
		if (user.isEmailVerified()) {
			stall();
			return;
		}
		// Unverified accounts can be claimed again. The password only changes together with a
		// new code, and verifying needs both, so whoever verifies is the one who set the password.
		Optional<String> code = verificationService.issueCode(user, CodePurpose.EMAIL_VERIFICATION);
		if (code.isEmpty()) {
			stall();
			return;
		}
		user.resetRegistration(passwordHash, request.displayName(), request.phoneNumber());
		codeMailer.send(user, CodePurpose.EMAIL_VERIFICATION, code.get());
	}

	@Transactional
	public void resendVerification(String email) {
		boolean sent = users.findByEmail(User.normalizeEmail(email))
			.filter(user -> !user.isEmailVerified())
			.map(user -> sendCode(user, CodePurpose.EMAIL_VERIFICATION))
			.orElse(false);
		if (!sent) {
			stall();
		}
	}

	public AuthSession verifyEmail(VerifyEmailRequest request) {
		User user = findByCredentials(request.email(), request.password())
			.filter(found -> !found.isEmailVerified())
			.orElseThrow(AuthService::invalidCode);
		verificationService.verify(user, CodePurpose.EMAIL_VERIFICATION, request.code()).requireVerified();
		return sessions.open(userService.markEmailVerified(user.getId()));
	}

	public SignInResult login(LoginRequest request) {
		User user = findByCredentials(request.email(), request.password())
			.orElseThrow(() -> new UnauthorizedException("INVALID_CREDENTIALS", "Incorrect email or password"));
		if (!user.isEmailVerified()) {
			throw new ForbiddenException("EMAIL_NOT_VERIFIED", "Verify your email before signing in");
		}
		return afterFirstFactor(user);
	}

	public SignInResult socialLogin(SocialProvider provider, String idToken, String suggestedName) {
		return afterFirstFactor(socialLoginService.signIn(provider, idToken, suggestedName));
	}

	/** The second step of signing in for accounts with two-factor authentication. */
	public AuthSession completeTwoFactor(String challengeToken, String code) {
		UUID userId = challenges.verify(challengeToken)
			.orElseThrow(() -> new UnauthorizedException("CHALLENGE_EXPIRED", "That took too long. Sign in again."));
		if (!rateLimiter.tryConsume(userId.toString(), TWO_FACTOR_ATTEMPTS).allowed()) {
			throw new TooManyRequestsException("Too many wrong codes. Wait a few minutes and try again.");
		}
		if (!twoFactorService.verify(userId, code)) {
			throw new BadRequestException("INVALID_2FA_CODE", "That code is not valid");
		}
		return sessions.open(userService.getById(userId));
	}

	/** Emails a reset code if the address has an account; the response is the same either way. */
	@Transactional
	public void forgotPassword(String email) {
		boolean sent = users.findByEmail(User.normalizeEmail(email))
			.map(user -> sendCode(user, CodePurpose.PASSWORD_RESET))
			.orElse(false);
		if (!sent) {
			stall();
		}
	}

	public void resetPassword(ResetPasswordRequest request) {
		User user = users.findByEmail(User.normalizeEmail(request.email())).orElseThrow(AuthService::invalidCode);
		verificationService.verify(user, CodePurpose.PASSWORD_RESET, request.code()).requireVerified();
		userService.resetPassword(user.getId(), passwordEncoder.encode(request.newPassword()));
		// Whoever knew the old password is signed out everywhere.
		sessions.endAll(user.getId());
		alerts.send(user.getEmail(), SecurityAlert.PASSWORD_CHANGED);
	}

	public AuthSession refresh(String refreshToken) {
		RefreshTokenService.Rotation rotation = refreshTokens.rotate(refreshToken)
			.orElseThrow(() -> new UnauthorizedException("INVALID_REFRESH_TOKEN", "Session expired, sign in again"));
		return new AuthSession(rotation.user(), accessTokens.issue(rotation.user()), rotation.newToken());
	}

	public void logout(String refreshToken) {
		refreshTokens.revoke(refreshToken);
	}

	/** Every way of signing in ends here, so two-factor cannot be skipped by picking another way in. */
	private SignInResult afterFirstFactor(User user) {
		if (user.isTotpEnabled()) {
			return new SignInResult.TwoFactorRequired(challenges.issue(user));
		}
		return new SignInResult.SignedIn(sessions.open(user));
	}

	private Optional<User> findByCredentials(String email, String password) {
		String normalized = User.normalizeEmail(email);
		if (!rateLimiter.tryConsume(normalized, loginAttempts).allowed()) {
			throw new TooManyRequestsException("Too many sign-in attempts. Wait a few minutes and try again.");
		}
		Optional<User> user = users.findByEmail(normalized);
		String hash = user.map(User::getPasswordHash).orElse(dummyPasswordHash);
		boolean matches = passwordEncoder.matches(password, hash);
		return matches ? user : Optional.empty();
	}

	private boolean sendCode(User user, CodePurpose purpose) {
		Optional<String> code = verificationService.issueCode(user, purpose);
		code.ifPresent(value -> codeMailer.send(user, purpose, value));
		return code.isPresent();
	}

	/** Spends the time that hashing a code would, so a request that sends nothing is not faster. */
	private void stall() {
		passwordEncoder.matches("not-a-real-password", dummyPasswordHash);
	}

	private static BadRequestException invalidCode() {
		return new BadRequestException("INVALID_CODE", "That code is invalid or has expired");
	}

}
