package com.subtrack.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.subtrack.user.dto.UserResponse;

/**
 * Either a signed-in session, or (when {@code twoFactorRequired} is true) a challenge token to
 * send back together with the second-factor code.
 *
 * @param refreshToken only for the mobile app, which keeps it in the phone's secure storage;
 * browsers get it as an HttpOnly cookie instead and never see it here
 */
public record AuthResponse(String accessToken, Long expiresInSeconds, UserResponse user, boolean twoFactorRequired,
		String challengeToken, @JsonInclude(JsonInclude.Include.NON_NULL) String refreshToken) {

	public static AuthResponse signedIn(String accessToken, long expiresInSeconds, UserResponse user) {
		return new AuthResponse(accessToken, expiresInSeconds, user, false, null, null);
	}

	public static AuthResponse secondFactorNeeded(String challengeToken) {
		return new AuthResponse(null, null, null, true, challengeToken, null);
	}

	public AuthResponse withRefreshToken(String refreshToken) {
		return new AuthResponse(accessToken, expiresInSeconds, user, twoFactorRequired, challengeToken, refreshToken);
	}

}
