package com.subtrack.auth.social;

import com.subtrack.config.AppProperties;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class GoogleTokenVerifier extends OidcTokenVerifier {

	public GoogleTokenVerifier(AppProperties properties) {
		super(properties.social().google().clientId());
	}

	@Override
	public SocialProvider provider() {
		return SocialProvider.GOOGLE;
	}

	@Override
	protected String jwkSetUri() {
		return "https://www.googleapis.com/oauth2/v3/certs";
	}

	@Override
	protected Set<String> issuers() {
		return Set.of("https://accounts.google.com", "accounts.google.com");
	}

}
