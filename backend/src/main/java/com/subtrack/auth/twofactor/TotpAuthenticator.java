package com.subtrack.auth.twofactor;

import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.OptionalLong;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * Time-based one-time passwords (RFC 6238) as used by Google Authenticator, Authy, 1Password
 * and similar apps: HMAC-SHA1, six digits, a new code every 30 seconds.
 */
@Component
public class TotpAuthenticator {

	private static final String ISSUER = "Subtrack";

	private static final int PERIOD_SECONDS = 30;

	private static final int DIGITS = 6;

	/** Codes from one step before or after "now" are accepted, to allow for clock drift. */
	private static final int ALLOWED_DRIFT_STEPS = 1;

	private final Clock clock;

	private final SecureRandom random = new SecureRandom();

	public TotpAuthenticator(Clock clock) {
		this.clock = clock;
	}

	public String generateSecret() {
		byte[] secret = new byte[20];
		random.nextBytes(secret);
		return Base32.encode(secret);
	}

	/** The link encoded in the QR code an authenticator app scans. */
	public String provisioningUri(String secret, String accountEmail) {
		String label = URLEncoder.encode(ISSUER + ":" + accountEmail, StandardCharsets.UTF_8).replace("+", "%20");
		return "otpauth://totp/%s?secret=%s&issuer=%s&digits=%d&period=%d".formatted(label, secret, ISSUER, DIGITS,
				PERIOD_SECONDS);
	}

	/** The time step the code belongs to, or empty if it is not valid right now. */
	public OptionalLong matchingStep(String secret, String code) {
		long currentStep = clock.instant().getEpochSecond() / PERIOD_SECONDS;
		for (long step = currentStep - ALLOWED_DRIFT_STEPS; step <= currentStep + ALLOWED_DRIFT_STEPS; step++) {
			// Constant-time comparison, so response time does not leak how many digits matched.
			if (MessageDigest.isEqual(codeAt(secret, step).getBytes(StandardCharsets.UTF_8),
					code.getBytes(StandardCharsets.UTF_8))) {
				return OptionalLong.of(step);
			}
		}
		return OptionalLong.empty();
	}

	String codeAt(String secret, long step) {
		try {
			Mac mac = Mac.getInstance("HmacSHA1");
			mac.init(new SecretKeySpec(Base32.decode(secret), "HmacSHA1"));
			byte[] hash = mac.doFinal(ByteBuffer.allocate(Long.BYTES).putLong(step).array());
			int offset = hash[hash.length - 1] & 0x0F;
			int binary = ((hash[offset] & 0x7F) << 24) | ((hash[offset + 1] & 0xFF) << 16)
					| ((hash[offset + 2] & 0xFF) << 8) | (hash[offset + 3] & 0xFF);
			return String.format("%0" + DIGITS + "d", binary % (int) Math.pow(10, DIGITS));
		}
		catch (GeneralSecurityException ex) {
			throw new IllegalStateException(ex);
		}
	}

}
