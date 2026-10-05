package com.subtrack.auth.verification;

import com.subtrack.config.AppProperties;
import com.subtrack.ratelimit.RateLimitRule;
import com.subtrack.ratelimit.RateLimiter;
import com.subtrack.user.User;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Issues and checks the short codes sent by email. Each purpose has its own, independent code. */
@Service
public class VerificationService {

	private final VerificationCodeRepository codes;

	private final CodeGenerator codeGenerator;

	private final PasswordEncoder passwordEncoder;

	private final AppProperties.Verification config;

	private final Clock clock;

	private final RateLimiter rateLimiter;

	/** These count per account and purpose, so asking for a new code does not reset them. */
	private final RateLimitRule attemptLimit;

	private final RateLimitRule issueLimit;

	private final RateLimitRule globalIssueLimit;

	/**
	 * Anyone can sign up with any address, so codes for addresses nobody has confirmed yet have a
	 * budget of their own and cannot use up the one for confirmed accounts.
	 */
	private final RateLimitRule globalUnverifiedIssueLimit;

	public VerificationService(VerificationCodeRepository codes, CodeGenerator codeGenerator,
			PasswordEncoder passwordEncoder, AppProperties properties, Clock clock, RateLimiter rateLimiter) {
		this.codes = codes;
		this.codeGenerator = codeGenerator;
		this.passwordEncoder = passwordEncoder;
		this.config = properties.verification();
		this.clock = clock;
		this.rateLimiter = rateLimiter;
		this.attemptLimit = new RateLimitRule("code-attempts", "/", config.attemptsPerHour(), Duration.ofHours(1));
		this.issueLimit = new RateLimitRule("code-issue", "/", config.codesPerDay(), Duration.ofDays(1));
		this.globalIssueLimit = new RateLimitRule("code-issue-global", "/", config.globalCodesPerHour(),
				Duration.ofHours(1));
		this.globalUnverifiedIssueLimit = new RateLimitRule("code-issue-global-unverified", "/",
				config.globalUnverifiedCodesPerHour(), Duration.ofHours(1));
	}

	public Optional<String> issueCode(User user, CodePurpose purpose) {
		return issueCode(user, purpose, null);
	}

	/**
	 * Replaces any earlier code for this purpose with a fresh one and returns it, or returns
	 * empty when the previous code was issued too recently (resend cooldown).
	 */
	@Transactional
	public Optional<String> issueCode(User user, CodePurpose purpose, String target) {
		Instant now = clock.instant();
		Optional<VerificationCode> latest = codes.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(user.getId(),
				purpose);
		if (latest.isPresent() && now.isBefore(latest.get().getCreatedAt().plus(config.resendCooldown()))) {
			return Optional.empty();
		}
		RateLimitRule globalLimit = user.isEmailVerified() ? globalIssueLimit : globalUnverifiedIssueLimit;
		if (!rateLimiter.tryConsume(user.getId().toString(), issueLimit).allowed()
				|| !rateLimiter.tryConsume("all", globalLimit).allowed()) {
			return Optional.empty();
		}
		codes.deleteByUserIdAndPurpose(user.getId(), purpose);
		String code = codeGenerator.generate();
		codes.save(new VerificationCode(user, purpose, target, passwordEncoder.encode(code),
				now.plus(config.codeTtl())));
		return Optional.of(code);
	}

	/**
	 * Checks a code and uses it up on success. Reports the result as a value instead of
	 * throwing, and runs in a transaction of its own, so that a failed attempt is committed
	 * and counted even when the caller's change is rolled back.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	public VerificationResult verify(User user, CodePurpose purpose, String code) {
		if (!rateLimiter.tryConsume(limitKey(user, purpose), attemptLimit).allowed()) {
			return VerificationResult.of(VerificationOutcome.LOCKED);
		}
		Instant now = clock.instant();
		Optional<VerificationCode> latest = codes.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(user.getId(),
				purpose);
		if (latest.isEmpty()) {
			return VerificationResult.of(VerificationOutcome.INVALID);
		}
		VerificationCode current = latest.get();
		if (current.isExpired(now)) {
			return VerificationResult.of(VerificationOutcome.EXPIRED);
		}
		if (current.getAttempts() >= config.maxAttempts()) {
			return VerificationResult.of(VerificationOutcome.TOO_MANY_ATTEMPTS);
		}
		if (!passwordEncoder.matches(code, current.getCodeHash())) {
			current.registerFailedAttempt();
			return VerificationResult.of(VerificationOutcome.INVALID);
		}
		current.consume(now);
		return new VerificationResult(VerificationOutcome.VERIFIED, current.getTarget());
	}

	private static String limitKey(User user, CodePurpose purpose) {
		return user.getId() + ":" + purpose;
	}

}
