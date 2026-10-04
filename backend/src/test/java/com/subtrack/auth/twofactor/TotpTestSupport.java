package com.subtrack.auth.twofactor;

import java.time.Instant;

/** Plays the part of the authenticator app in tests. */
public final class TotpTestSupport {

	private TotpTestSupport() {
	}

	public static String currentCode(TotpAuthenticator totp, String secret) {
		return totp.codeAt(secret, Instant.now().getEpochSecond() / 30);
	}

	/** The code of the following 30-second step, which the allowed clock drift also accepts. */
	public static String nextCode(TotpAuthenticator totp, String secret) {
		return totp.codeAt(secret, Instant.now().getEpochSecond() / 30 + 1);
	}

}
