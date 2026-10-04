package com.subtrack.auth.twofactor;

import com.subtrack.config.AppProperties;
import com.subtrack.user.User;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtTwoFactorChallengeService implements TwoFactorChallengeService {

	/** Different from the access-token audience, so a challenge can never be used as an access token. */
	static final String AUDIENCE = "subtrack-2fa-challenge";

	private static final Duration TIME_TO_LIVE = Duration.ofMinutes(5);

	private final SecretKey key;

	private final Clock clock;

	public JwtTwoFactorChallengeService(AppProperties properties, Clock clock) {
		this.key = Keys.hmacShaKeyFor(properties.jwt().secret().getBytes(StandardCharsets.UTF_8));
		this.clock = clock;
	}

	@Override
	public String issue(User user) {
		Instant now = clock.instant();
		return Jwts.builder()
			.subject(user.getId().toString())
			.audience().add(AUDIENCE).and()
			.issuedAt(Date.from(now))
			.expiration(Date.from(now.plus(TIME_TO_LIVE)))
			.signWith(key)
			.compact();
	}

	@Override
	public Optional<UUID> verify(String challengeToken) {
		try {
			String subject = Jwts.parser()
				.verifyWith(key)
				.requireAudience(AUDIENCE)
				.clock(() -> Date.from(clock.instant()))
				.build()
				.parseSignedClaims(challengeToken)
				.getPayload()
				.getSubject();
			return Optional.of(UUID.fromString(subject));
		}
		catch (JwtException | IllegalArgumentException ex) {
			return Optional.empty();
		}
	}

}
