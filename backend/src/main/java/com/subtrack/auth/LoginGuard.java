package com.subtrack.auth;

import com.subtrack.config.AppProperties;
import com.subtrack.user.User;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Stops password and two-factor code guessing without letting an attacker lock the owner out.
 * Wrong attempts lock the account only for the network address they came from, so the owner can
 * still sign in from anywhere else. As a backstop against guesses spread over many addresses, a
 * long run of wrong attempts from any addresses locks the account everywhere.
 *
 * The per-address counts are kept in memory, like the rate limits, and reset on restart. The
 * account-wide count is stored with the user.
 */
@Component
public class LoginGuard {

	private static final int CLEANUP_EVERY_N_CALLS = 1_000;

	private final int maxAttemptsPerAddress;

	private final int maxAttemptsPerAccount;

	private final Duration lockDuration;

	private final ConcurrentHashMap<Key, Attempts> attempts = new ConcurrentHashMap<>();

	private final AtomicLong calls = new AtomicLong();

	private record Key(UUID userId, String address) {
	}

	private static final class Attempts {

		private int wrong;

		private Instant firstWrongAt;

		private Instant lockedUntil;

	}

	@Autowired
	public LoginGuard(AppProperties properties) {
		this(properties.login().maxAttempts(), properties.login().accountMaxAttempts(),
				properties.login().lockDuration());
	}

	public LoginGuard(int maxAttemptsPerAddress, int maxAttemptsPerAccount, Duration lockDuration) {
		this.maxAttemptsPerAddress = maxAttemptsPerAddress;
		this.maxAttemptsPerAccount = maxAttemptsPerAccount;
		this.lockDuration = lockDuration;
	}

	/** When the lock for this user and address ends, if there is one now. */
	public Optional<Instant> lockedUntil(User user, String address, Instant now) {
		Instant until = null;
		Attempts here = attempts.get(new Key(user.getId(), address));
		if (here != null) {
			synchronized (here) {
				if (here.lockedUntil != null && now.isBefore(here.lockedUntil)) {
					until = here.lockedUntil;
				}
			}
		}
		if (user.isLoginLocked(now) && (until == null || user.getLoginLockedUntil().isAfter(until))) {
			until = user.getLoginLockedUntil();
		}
		return Optional.ofNullable(until);
	}

	/**
	 * Counts a wrong password or code. The caller saves the user.
	 * @return true if this attempt started a lock
	 */
	public boolean recordWrong(User user, String address, Instant now) {
		Instant lockUntil = now.plus(lockDuration);
		boolean locked;
		Attempts here = attempts.computeIfAbsent(new Key(user.getId(), address), key -> new Attempts());
		synchronized (here) {
			if (here.firstWrongAt == null || !now.isBefore(here.firstWrongAt.plus(lockDuration))) {
				here.wrong = 0;
				here.firstWrongAt = now;
			}
			here.wrong++;
			locked = here.wrong >= maxAttemptsPerAddress;
			if (locked) {
				here.lockedUntil = lockUntil;
				here.wrong = 0;
				here.firstWrongAt = null;
			}
		}
		boolean lockedEverywhere = user.recordFailedLogin(maxAttemptsPerAccount, lockUntil);
		cleanUp(now);
		return locked || lockedEverywhere;
	}

	/** A correct password (when no code step follows) or a correct code. The caller saves the user. */
	public void recordSuccess(User user, String address) {
		attempts.remove(new Key(user.getId(), address));
		user.recordSuccessfulLogin();
	}

	/** Proving the email through a password reset lifts the locks on every address. */
	public void clearAddresses(UUID userId) {
		attempts.keySet().removeIf(key -> Objects.equals(key.userId(), userId));
	}

	private void cleanUp(Instant now) {
		if (calls.incrementAndGet() % CLEANUP_EVERY_N_CALLS != 0) {
			return;
		}
		attempts.values().removeIf(entry -> {
			synchronized (entry) {
				boolean lockOver = entry.lockedUntil == null || !now.isBefore(entry.lockedUntil);
				boolean countOver = entry.firstWrongAt == null
						|| !now.isBefore(entry.firstWrongAt.plus(lockDuration));
				return lockOver && countOver;
			}
		});
	}

}
