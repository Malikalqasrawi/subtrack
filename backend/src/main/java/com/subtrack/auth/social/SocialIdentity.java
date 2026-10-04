package com.subtrack.auth.social;

/**
 * Who a provider says the person is.
 *
 * @param subject the provider's permanent id for the person; unlike the email it never changes
 * @param name may be null: Apple only shares it on the very first sign-in, and not in the token
 */
public record SocialIdentity(SocialProvider provider, String subject, String email, boolean emailVerified,
		String name) {
}
