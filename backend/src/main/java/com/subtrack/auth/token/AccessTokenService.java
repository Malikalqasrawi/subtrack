package com.subtrack.auth.token;

import com.subtrack.auth.AuthenticatedUser;
import com.subtrack.user.User;
import java.time.Duration;
import java.util.Optional;

/** Issues and checks short-lived access tokens. The token format is an implementation detail. */
public interface AccessTokenService {

	String issue(User user);

	/** Returns the user the token was issued to, or empty if it is invalid or expired. */
	Optional<AuthenticatedUser> verify(String token);

	Duration timeToLive();

}
