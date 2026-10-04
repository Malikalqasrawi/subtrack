package com.subtrack.auth.social;

import com.subtrack.common.error.BadRequestException;
import com.subtrack.common.error.UnauthorizedException;
import java.util.List;
import java.util.Set;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

/**
 * Everything Google and Apple have in common: both issue OpenID Connect ID tokens signed with
 * keys they publish. A token is accepted only if its signature matches those keys, it has not
 * expired, it comes from the expected issuer, and it was issued for this application.
 * Subclasses supply what differs between providers.
 */
public abstract class OidcTokenVerifier implements IdentityTokenVerifier {

	private final String clientId;

	private volatile JwtDecoder decoder;

	protected OidcTokenVerifier(String clientId) {
		this.clientId = clientId == null || clientId.isBlank() ? null : clientId.trim();
	}

	/** Where the provider publishes its signing keys. */
	protected abstract String jwkSetUri();

	protected abstract Set<String> issuers();

	@Override
	public String clientId() {
		return clientId;
	}

	@Override
	public SocialIdentity verify(String idToken) {
		if (clientId == null) {
			throw new BadRequestException("PROVIDER_NOT_CONFIGURED", provider() + " sign-in is not set up");
		}
		try {
			Jwt token = decoder().decode(idToken);
			return new SocialIdentity(provider(), token.getSubject(), token.getClaimAsString("email"),
					isTrue(token.getClaim("email_verified")), token.getClaimAsString("name"));
		}
		catch (JwtException ex) {
			throw new UnauthorizedException("INVALID_ID_TOKEN", "Could not confirm your " + provider() + " sign-in");
		}
	}

	/** Google sends a boolean, Apple sends the string "true". */
	private static boolean isTrue(Object claim) {
		return Boolean.TRUE.equals(claim) || "true".equals(claim);
	}

	private JwtDecoder decoder() {
		JwtDecoder current = decoder;
		if (current == null) {
			NimbusJwtDecoder created = NimbusJwtDecoder.withJwkSetUri(jwkSetUri()).build();
			created.setJwtValidator(new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(),
					new JwtClaimValidator<String>(JwtClaimNames.ISS, issuers()::contains),
					new JwtClaimValidator<List<String>>(JwtClaimNames.AUD,
							audience -> audience != null && audience.contains(clientId))));
			decoder = created;
			current = created;
		}
		return current;
	}

}
