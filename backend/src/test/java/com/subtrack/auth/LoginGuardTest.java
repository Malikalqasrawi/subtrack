package com.subtrack.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.subtrack.user.User;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class LoginGuardTest {

	private static final Duration LOCK = Duration.ofMinutes(15);

	private static final String HOME = "10.0.0.1";

	private static final String ATTACKER = "203.0.113.7";

	private final Instant now = Instant.parse("2026-01-01T10:00:00Z");

	private final LoginGuard guard = new LoginGuard(5, 30, LOCK);

	private final User user = new User("malik@example.com", "hash", "Malik", "+962791234567", "USD");

	@Test
	void fiveWrongAttemptsLockTheAddressTheyCameFrom() {
		for (int i = 0; i < 4; i++) {
			assertThat(guard.recordWrong(user, ATTACKER, now)).isFalse();
		}
		assertThat(guard.lockedUntil(user, ATTACKER, now)).isEmpty();
		assertThat(guard.recordWrong(user, ATTACKER, now)).isTrue();
		assertThat(guard.lockedUntil(user, ATTACKER, now)).contains(now.plus(LOCK));
	}

	@Test
	void theOwnerCanStillSignInFromAnotherAddress() {
		for (int i = 0; i < 5; i++) {
			guard.recordWrong(user, ATTACKER, now);
		}
		assertThat(guard.lockedUntil(user, HOME, now)).isEmpty();
	}

	@Test
	void theLockEndsAfterTheLockTime() {
		for (int i = 0; i < 5; i++) {
			guard.recordWrong(user, ATTACKER, now);
		}
		assertThat(guard.lockedUntil(user, ATTACKER, now.plus(LOCK).minusSeconds(1))).isPresent();
		assertThat(guard.lockedUntil(user, ATTACKER, now.plus(LOCK))).isEmpty();
	}

	@Test
	void olderWrongAttemptsStopCounting() {
		for (int i = 0; i < 4; i++) {
			guard.recordWrong(user, ATTACKER, now);
		}
		assertThat(guard.recordWrong(user, ATTACKER, now.plus(LOCK))).isFalse();
		assertThat(guard.lockedUntil(user, ATTACKER, now.plus(LOCK))).isEmpty();
	}

	@Test
	void aSuccessClearsTheCountForThatAddress() {
		for (int i = 0; i < 4; i++) {
			guard.recordWrong(user, HOME, now);
		}
		guard.recordSuccess(user, HOME);
		assertThat(guard.recordWrong(user, HOME, now)).isFalse();
		assertThat(user.hasFailedLogins()).isTrue();
	}

	@Test
	void thirtyWrongAttemptsFromManyAddressesLockTheAccountEverywhere() {
		for (int i = 0; i < 29; i++) {
			guard.recordWrong(user, "198.51.100." + i, now);
		}
		assertThat(guard.lockedUntil(user, HOME, now)).isEmpty();
		assertThat(guard.recordWrong(user, "198.51.100.200", now)).isTrue();
		assertThat(guard.lockedUntil(user, HOME, now)).contains(now.plus(LOCK));
	}

	@Test
	void aNewPasswordLiftsTheAccountWideLock() {
		for (int i = 0; i < 30; i++) {
			guard.recordWrong(user, "198.51.100." + i, now);
		}
		user.changePassword("new-hash");
		guard.clearAddresses(user.getId());
		assertThat(guard.lockedUntil(user, HOME, now)).isEmpty();
	}

	@Test
	void anEmailWithoutAnAccountIsLockedLikeARealOne() {
		for (int i = 0; i < 4; i++) {
			guard.recordWrong("nobody@example.com", ATTACKER, now);
		}
		assertThat(guard.lockedUntil("nobody@example.com", ATTACKER, now)).isEmpty();
		guard.recordWrong("nobody@example.com", ATTACKER, now);

		assertThat(guard.lockedUntil("nobody@example.com", ATTACKER, now)).contains(now.plus(LOCK));
		assertThat(guard.lockedUntil("nobody@example.com", HOME, now)).isEmpty();
		assertThat(guard.lockedUntil("someone-else@example.com", ATTACKER, now)).isEmpty();
		assertThat(guard.lockedUntil("nobody@example.com", ATTACKER, now.plus(LOCK))).isEmpty();
	}

	@Test
	void thirtyWrongAttemptsLockAnEmailWithoutAnAccountEverywhereToo() {
		for (int i = 0; i < 29; i++) {
			guard.recordWrong("nobody@example.com", "198.51.100." + i, now);
		}
		assertThat(guard.lockedUntil("nobody@example.com", HOME, now)).isEmpty();
		guard.recordWrong("nobody@example.com", "198.51.100.200", now);

		assertThat(guard.lockedUntil("nobody@example.com", HOME, now)).contains(now.plus(LOCK));
	}

}
