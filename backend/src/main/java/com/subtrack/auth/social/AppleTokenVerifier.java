package com.subtrack.auth.social;

import com.subtrack.config.AppProperties;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class AppleTokenVerifier extends OidcTokenVerifier {

	public AppleTokenVerifier(AppProperties properties) {
		super(properties.social().apple().clientId());
	}

	@Override
	public SocialProvider provider() {
		return SocialProvider.APPLE;
	}

	@Override
	protected String jwkSetUri() {
		return "https://appleid.apple.com/auth/keys";
	}

	@Override
	protected Set<String> issuers() {
		return Set.of("https://appleid.apple.com");
	}

}
