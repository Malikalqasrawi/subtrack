package com.subtrack.auth.session;

import com.subtrack.auth.AuthSession;
import com.subtrack.auth.token.AccessTokenService;
import com.subtrack.auth.token.RefreshTokenService;
import com.subtrack.user.User;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Opens and ends signed-in sessions, so callers do not juggle the two kinds of token themselves. */
@Service
public class SessionService {

	private final AccessTokenService accessTokens;

	private final RefreshTokenService refreshTokens;

	public SessionService(AccessTokenService accessTokens, RefreshTokenService refreshTokens) {
		this.accessTokens = accessTokens;
		this.refreshTokens = refreshTokens;
	}

	public AuthSession open(User user) {
		return new AuthSession(user, accessTokens.issue(user), refreshTokens.issue(user));
	}

	/** Signs the user out everywhere, for example after a password change. */
	public void endAll(UUID userId) {
		refreshTokens.revokeAll(userId);
	}

}
