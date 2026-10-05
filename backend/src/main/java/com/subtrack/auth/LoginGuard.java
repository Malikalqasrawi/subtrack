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
 *
 * An email that has no account is counted and locked the same way, entirely in memory.
 * Otherwise the lock itself would show which emails have an account.
 */
@Component
public class LoginGuard {

	private static final int CLEANUP_EVERY_N_CALLS = 1_000;

	/** Stands in for the address in the count that covers every address. */
	private static final String EVERYWHERE = "*";

	/** How long the count for an email without an account is remembered across all addresses. */
	private static final Duration UNKNOWN_ACCOUNT_MEMORY = Duration.ofDays(1);

	private final int maxAttemptsPerAddress;

	private final int maxAttemptsPerAccount;

	private final Duration lockDuration;

	private final ConcurrentHashMap<Key, Attempts> attempts = new ConcurrentHashMap<>();

	private final AtomicLong calls = new AtomicLong();

	/** @param account a user's id, or the email itself when no account has it */
	private record Key(Object account, String address) {
	}

	private static final class Attempts {

		private int wrong;

		private Instant countEndsAt;

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
		Instant here = lockOf(new Key(user.getId(), address), now);
		Instant everywhere = user.isLoginLocked(now) ? user.getLoginLockedUntil() : null;
		return later(here, everywhere);
	}

	/** The same question for an email that has no account. */
	public Optional<Instant> lockedUntil(String email, String address, Instant now) {
		return later(lockOf(new Key(email, address), now), lockOf(new Key(email, EVERYWHERE), now));
	}

	/**
	 * Counts a wrong password or code. The caller saves the user.
	 * @return true if this attempt started a lock
	 */
	public boolean recordWrong(User user, String address, Instant now) {
		boolean locked = count(new Key(user.getId(), address), maxAttemptsPerAddress, lockDuration, now);
		boolean lockedEverywhere = user.recordFailedLogin(maxAttemptsPerAccount, now.plus(lockDuration));
		cleanUp(now);
		return locked || lockedEverywhere;
	}

	/** Counts a wrong password for an email that has no account. */
	public void recordWrong(String email, String address, Instant now) {
		count(new Key(email, address), maxAttemptsPerAddress, lockDuration, now);
		count(new Key(email, EVERYWHERE), maxAttemptsPerAccount, UNKNOWN_ACCOUNT_MEMORY, now);
		cleanUp(now);
	}

	/** A correct password (when no code step follows) or a correct code. The caller saves the user. */
	public void recordSuccess(User user, String address) {
		attempts.remove(new Key(user.getId(), address));
		user.recordSuccessfulLogin();
	}

	/** Proving the email through a password reset lifts the locks on every address. */
	public void clearAddresses(UUID userId) {
		attempts.keySet().removeIf(key -> Objects.equals(key.account(), userId));
	}

	/**
	 * Counts one wrong attempt.
	 * @param memory how long attempts keep counting before the count starts again
	 * @return true if this attempt started a lock
	 */
	private boolean count(Key key, int maxAttempts, Duration memory, Instant now) {
		Attempts counted = attempts.computeIfAbsent(key, created -> new Attempts());
		synchronized (counted) {
			if (counted.countEndsAt == null || !now.isBefore(counted.countEndsAt)) {
				counted.wrong = 0;
				counted.countEndsAt = now.plus(memory);
			}
			counted.wrong++;
			if (counted.wrong < maxAttempts) {
				return false;
			}
			counted.lockedUntil = now.plus(lockDuration);
			counted.wrong = 0;
			counted.countEndsAt = null;
			return true;
		}
	}

	private Instant lockOf(Key key, Instant now) {
		Attempts counted = attempts.get(key);
		if (counted == null) {
			return null;
		}
		synchronized (counted) {
			return counted.lockedUntil != null && now.isBefore(counted.lockedUntil) ? counted.lockedUntil : null;
		}
	}

	private static Optional<Instant> later(Instant first, Instant second) {
		if (first == null || second == null) {
			return Optional.ofNullable(first == null ? second : first);
		}
		return Optional.of(first.isAfter(second) ? first : second);
	}

	private void cleanUp(Instant now) {
		if (calls.incrementAndGet() % CLEANUP_EVERY_N_CALLS != 0) {
			return;
		}
		attempts.values().removeIf(entry -> {
			synchronized (entry) {
				boolean lockOver = entry.lockedUntil == null || !now.isBefore(entry.lockedUntil);
				boolean countOver = entry.countEndsAt == null || !now.isBefore(entry.countEndsAt);
				return lockOver && countOver;
			}
		});
	}

}
