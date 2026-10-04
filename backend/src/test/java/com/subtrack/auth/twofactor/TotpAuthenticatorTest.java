package com.subtrack.auth.twofactor;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class TotpAuthenticatorTest {

	/** The shared secret from the RFC 6238 test vectors. */
	private static final String RFC_SECRET = Base32.encode("12345678901234567890".getBytes(StandardCharsets.US_ASCII));

	@Test
	void matchesTheRfc6238TestVectors() {
		TotpAuthenticator totp = at(0);
		assertThat(totp.codeAt(RFC_SECRET, 59 / 30)).isEqualTo("287082");
		assertThat(totp.codeAt(RFC_SECRET, 1111111109L / 30)).isEqualTo("081804");
		assertThat(totp.codeAt(RFC_SECRET, 1234567890L / 30)).isEqualTo("005924");
		assertThat(totp.codeAt(RFC_SECRET, 2000000000L / 30)).isEqualTo("279037");
	}

	@Test
	void acceptsTheCurrentCodeAndOneStepOfClockDrift() {
		TotpAuthenticator totp = at(1_000_000_000L);
		long step = 1_000_000_000L / 30;
		assertThat(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, step))).hasValue(step);
		assertThat(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, step - 1))).hasValue(step - 1);
		assertThat(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, step + 1))).hasValue(step + 1);
	}

	@Test
	void rejectsOldAndWrongCodes() {
		TotpAuthenticator totp = at(1_000_000_000L);
		long step = 1_000_000_000L / 30;
		assertThat(totp.matchingStep(RFC_SECRET, totp.codeAt(RFC_SECRET, step - 5))).isEmpty();
		assertThat(totp.matchingStep(RFC_SECRET, "abcdef")).isEmpty();
	}

	@Test
	void generatedSecretsAreBase32AndRoundTrip() {
		String secret = at(0).generateSecret();
		assertThat(secret).matches("[A-Z2-7]{32}");
		assertThat(Base32.encode(Base32.decode(secret))).isEqualTo(secret);
	}

	private static TotpAuthenticator at(long epochSecond) {
		return new TotpAuthenticator(Clock.fixed(Instant.ofEpochSecond(epochSecond), ZoneOffset.UTC));
	}

}
