package com.subtrack.config;

import com.subtrack.auth.social.SocialLoginService;
import com.subtrack.auth.social.SocialProvider;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Settings the sign-in page needs before anyone is signed in. Nothing secret belongs here. */
@RestController
@RequestMapping("/api/public/config")
public class PublicConfigController {

	/** @param googleClientId null when Google sign-in is not set up; likewise for Apple */
	public record PublicConfig(String googleClientId, String appleClientId) {
	}

	private final SocialLoginService socialLoginService;

	public PublicConfigController(SocialLoginService socialLoginService) {
		this.socialLoginService = socialLoginService;
	}

	@GetMapping
	public PublicConfig config() {
		Map<SocialProvider, String> clientIds = socialLoginService.configuredClientIds();
		return new PublicConfig(clientIds.get(SocialProvider.GOOGLE), clientIds.get(SocialProvider.APPLE));
	}

}
