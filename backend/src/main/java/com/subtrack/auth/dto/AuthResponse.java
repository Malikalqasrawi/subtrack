package com.subtrack.auth.dto;

import com.subtrack.user.dto.UserResponse;

/**
 * Either a signed-in session, or (when {@code twoFactorRequired} is true) a challenge token to
 * send back together with the second-factor code.
 */
public record AuthResponse(String accessToken, Long expiresInSeconds, UserResponse user, boolean twoFactorRequired,
		String challengeToken) {

	public static AuthResponse signedIn(String accessToken, long expiresInSeconds, UserResponse user) {
		return new AuthResponse(accessToken, expiresInSeconds, user, false, null);
	}

	public static AuthResponse secondFactorNeeded(String challengeToken) {
		return new AuthResponse(null, null, null, true, challengeToken);
	}

}
