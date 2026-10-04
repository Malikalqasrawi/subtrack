package com.subtrack.auth.token;

import com.subtrack.auth.AuthenticatedUser;
import com.subtrack.config.AppProperties;
import com.subtrack.user.User;
import com.subtrack.user.UserRepository;
import io.jsonwebtoken.Claims;
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
public class JwtAccessTokenService implements AccessTokenService {

	private static final String EMAIL_CLAIM = "email";

	private static final String VERSION_CLAIM = "ver";

	/** Tokens signed with the same key for another purpose carry a different audience and are refused here. */
	private static final String AUDIENCE = "subtrack-api";

	private final SecretKey key;

	private final Duration timeToLive;

	private final Clock clock;

	private final UserRepository users;

	public JwtAccessTokenService(AppProperties properties, Clock clock, UserRepository users) {
		this.users = users;
		this.key = Keys.hmacShaKeyFor(properties.jwt().secret().getBytes(StandardCharsets.UTF_8));
		this.timeToLive = properties.jwt().accessTokenTtl();
		this.clock = clock;
	}

	@Override
	public String issue(User user) {
		Instant now = clock.instant();
		return Jwts.builder()
			.subject(user.getId().toString())
			.audience().add(AUDIENCE).and()
			.claim(EMAIL_CLAIM, user.getEmail())
			.claim(VERSION_CLAIM, user.getTokenVersion())
			.issuedAt(Date.from(now))
			.expiration(Date.from(now.plus(timeToLive)))
			.signWith(key)
			.compact();
	}

	@Override
	public Optional<AuthenticatedUser> verify(String token) {
		try {
			Claims claims = Jwts.parser()
				.verifyWith(key)
				.requireAudience(AUDIENCE)
				.clock(() -> Date.from(clock.instant()))
				.build()
				.parseSignedClaims(token)
				.getPayload();
			UUID userId = UUID.fromString(claims.getSubject());
			Integer version = claims.get(VERSION_CLAIM, Integer.class);
			// A token from before a password change or "sign out everywhere", or for a deleted account.
			if (version == null || !users.findTokenVersionById(userId).filter(version::equals).isPresent()) {
				return Optional.empty();
			}
			return Optional.of(new AuthenticatedUser(userId, claims.get(EMAIL_CLAIM, String.class)));
		}
		catch (JwtException | IllegalArgumentException ex) {
			return Optional.empty();
		}
	}

	@Override
	public Duration timeToLive() {
		return timeToLive;
	}

}
