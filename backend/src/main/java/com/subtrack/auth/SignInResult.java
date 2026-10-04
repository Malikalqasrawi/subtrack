package com.subtrack.auth;

/**
 * What the first sign-in step produces. Sealed, so the compiler makes every caller handle both
 * cases: nobody can forget the second factor and hand out a session by accident.
 */
public sealed interface SignInResult {

	record SignedIn(AuthSession session) implements SignInResult {
	}

	record TwoFactorRequired(String challengeToken) implements SignInResult {
	}

}
