package com.subtrack.auth.session;

import com.subtrack.auth.token.RefreshTokenService;
import com.subtrack.config.AppProperties;
import java.time.Duration;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/**
 * Builds the refresh-token cookie. It is HttpOnly so page scripts can never read it, is only
 * sent to the auth endpoints, and SameSite=Strict keeps other sites from using it.
 */
@Component
public class RefreshCookieFactory {

	public static final String NAME = "refresh_token";

	private final boolean secure;

	private final Duration timeToLive;

	public RefreshCookieFactory(AppProperties properties, RefreshTokenService refreshTokens) {
		this.secure = properties.cookies().secure();
		this.timeToLive = refreshTokens.timeToLive();
	}

	public ResponseCookie create(String refreshToken) {
		return build(refreshToken, timeToLive);
	}

	public ResponseCookie expire() {
		return build("", Duration.ZERO);
	}

	private ResponseCookie build(String value, Duration maxAge) {
		return ResponseCookie.from(NAME, value)
			.httpOnly(true)
			.secure(secure)
			.sameSite("Strict")
			.path("/api/auth")
			.maxAge(maxAge)
			.build();
	}

}
