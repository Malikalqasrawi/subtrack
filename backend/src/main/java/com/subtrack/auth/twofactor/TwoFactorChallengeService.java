package com.subtrack.auth.twofactor;

import com.subtrack.user.User;
import java.util.Optional;
import java.util.UUID;

/**
 * Proof that someone passed the first sign-in step (password, Google or Apple) and now only
 * owes the second factor. It grants no access to the API by itself.
 */
public interface TwoFactorChallengeService {

	String issue(User user);

	/** Returns the user the challenge belongs to, or empty if it is invalid or expired. */
	Optional<UUID> verify(String challengeToken);

}
