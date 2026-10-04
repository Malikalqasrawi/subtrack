package com.subtrack.auth.session;

import com.subtrack.auth.AuthSession;
import com.subtrack.auth.dto.AuthResponse;
import com.subtrack.auth.token.AccessTokenService;
import com.subtrack.user.dto.UserResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

/**
 * Hands a new session to the client in the form that client can keep safely. A browser gets the
 * refresh token as an HttpOnly cookie, out of reach of page scripts. The mobile app has no cookie
 * jar, so it gets the token in the answer and stores it in the phone's secure storage.
 */
@Component
public class SessionResponses {

	/** Sent by the mobile app with the value {@link #APP}. */
	public static final String CLIENT_HEADER = "X-Subtrack-Client";

	public static final String APP = "app";

	private final AccessTokenService accessTokens;

	private final RefreshCookieFactory refreshCookies;

	public SessionResponses(AccessTokenService accessTokens, RefreshCookieFactory refreshCookies) {
		this.accessTokens = accessTokens;
		this.refreshCookies = refreshCookies;
	}

	public ResponseEntity<AuthResponse> respond(AuthSession session, String client) {
		return APP.equals(client) ? forApp(session) : forBrowser(session);
	}

	public ResponseEntity<AuthResponse> forBrowser(AuthSession session) {
		return ResponseEntity.ok()
			.header(HttpHeaders.SET_COOKIE, refreshCookies.create(session.refreshToken()).toString())
			.body(body(session));
	}

	public ResponseEntity<AuthResponse> forApp(AuthSession session) {
		return ResponseEntity.ok().body(body(session).withRefreshToken(session.refreshToken()));
	}

	private AuthResponse body(AuthSession session) {
		return AuthResponse.signedIn(session.accessToken(), accessTokens.timeToLive().toSeconds(),
				UserResponse.from(session.user()));
	}

}
