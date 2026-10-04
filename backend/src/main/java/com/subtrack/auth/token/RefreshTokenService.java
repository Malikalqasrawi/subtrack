package com.subtrack.auth.token;

import com.subtrack.common.Sha256;
import com.subtrack.config.AppProperties;
import com.subtrack.user.User;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {

	private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

	private final RefreshTokenRepository tokens;

	private final Duration timeToLive;

	private final Clock clock;

	private final SecureRandom random = new SecureRandom();

	public RefreshTokenService(RefreshTokenRepository tokens, AppProperties properties, Clock clock) {
		this.tokens = tokens;
		this.timeToLive = properties.jwt().refreshTokenTtl();
		this.clock = clock;
	}

	/** A refresh token after rotation: who it belongs to and the new value to hand to the client. */
	public record Rotation(User user, String newToken) {
	}

	@Transactional
	public String issue(User user) {
		byte[] bytes = new byte[32];
		random.nextBytes(bytes);
		String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		tokens.save(new RefreshToken(user, Sha256.hex(token), clock.instant().plus(timeToLive)));
		return token;
	}

	/**
	 * Exchanges a refresh token for a new one; each token works once. Presenting a token that
	 * was already used means it was probably stolen, so every session of that user is ended.
	 * Returns empty (rather than throwing) so that revocation is committed.
	 */
	@Transactional
	public Optional<Rotation> rotate(String token) {
		Instant now = clock.instant();
		Optional<RefreshToken> found = tokens.findByTokenHash(Sha256.hex(token));
		if (found.isEmpty()) {
			return Optional.empty();
		}
		RefreshToken current = found.get();
		if (current.isRevoked()) {
			log.warn("Refresh token reuse detected for user {}", current.getUser().getId());
			tokens.revokeAllForUser(current.getUser().getId(), now);
			return Optional.empty();
		}
		if (current.isExpired(now)) {
			return Optional.empty();
		}
		current.revoke(now);
		return Optional.of(new Rotation(current.getUser(), issue(current.getUser())));
	}

	@Transactional
	public void revoke(String token) {
		tokens.findByTokenHash(Sha256.hex(token)).ifPresent(found -> found.revoke(clock.instant()));
	}

	@Transactional
	public void revokeAll(UUID userId) {
		tokens.revokeAllForUser(userId, clock.instant());
	}

	public Duration timeToLive() {
		return timeToLive;
	}

	@Scheduled(cron = "0 30 3 * * *")
	@Transactional
	public void deleteExpired() {
		tokens.deleteExpiredBefore(clock.instant());
	}

}
