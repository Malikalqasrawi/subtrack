package com.subtrack.auth.social;

/**
 * Checks an ID token issued by one sign-in provider. Supporting another provider means adding
 * another implementation; the sign-in logic does not change.
 */
public interface IdentityTokenVerifier {

	SocialProvider provider();

	/** The public client id the browser needs to start sign-in, or null if this provider is not set up. */
	String clientId();

	/** Returns the identity in the token, or throws if the token is not genuine. */
	SocialIdentity verify(String idToken);

}
