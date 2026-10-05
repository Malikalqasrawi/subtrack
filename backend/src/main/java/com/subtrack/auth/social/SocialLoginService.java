package com.subtrack.auth.social;

import com.subtrack.auth.alert.SecurityAlert;
import com.subtrack.auth.alert.SecurityAlertMailer;
import com.subtrack.common.error.BadRequestException;
import com.subtrack.user.User;
import com.subtrack.user.UserRepository;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SocialLoginService {

	private static final String DEFAULT_CURRENCY = "USD";

	private static final int MAX_NAME_LENGTH = 80;

	private final Map<SocialProvider, IdentityTokenVerifier> verifiers = new EnumMap<>(SocialProvider.class);

	private final UserRepository users;

	private final SocialAccountRepository socialAccounts;

	private final PasswordEncoder passwordEncoder;

	private final SecurityAlertMailer alerts;

	public SocialLoginService(List<IdentityTokenVerifier> verifiers, UserRepository users,
			SocialAccountRepository socialAccounts, PasswordEncoder passwordEncoder, SecurityAlertMailer alerts) {
		verifiers.forEach(verifier -> this.verifiers.put(verifier.provider(), verifier));
		this.users = users;
		this.socialAccounts = socialAccounts;
		this.passwordEncoder = passwordEncoder;
		this.alerts = alerts;
	}

	/** The public client id of every provider that is set up, for the sign-in page. */
	public Map<SocialProvider, String> configuredClientIds() {
		Map<SocialProvider, String> clientIds = new EnumMap<>(SocialProvider.class);
		verifiers.forEach((provider, verifier) -> {
			if (verifier.clientId() != null) {
				clientIds.put(provider, verifier.clientId());
			}
		});
		return clientIds;
	}

	/**
	 * Finds or creates the user behind a provider's ID token.
	 *
	 * @param suggestedName the name the browser received from the provider, if any
	 */
	@Transactional
	public User signIn(SocialProvider provider, String idToken, String suggestedName) {
		SocialIdentity identity = verifiers.get(provider).verify(idToken);

		Optional<SocialAccount> linked = socialAccounts.findByProviderAndSubject(provider, identity.subject());
		if (linked.isPresent()) {
			return linked.get().getUser();
		}
		// Linking by email is only safe when the provider vouches that the person owns it.
		if (identity.email() == null || !identity.emailVerified()) {
			throw new BadRequestException("EMAIL_NOT_VERIFIED_BY_PROVIDER",
					"Your " + provider + " account has no verified email address");
		}
		Optional<User> existing = users.findByEmail(User.normalizeEmail(identity.email()));
		User user = existing.map(this::claimIfUnverified)
			.orElseGet(() -> users.save(User.fromSocialSignIn(identity.email(), unusablePasswordHash(),
					displayName(identity, suggestedName), DEFAULT_CURRENCY)));
		socialAccounts.save(new SocialAccount(user, provider, identity.subject()));
		if (existing.isPresent()) {
			// The account was there before this sign-in, so its owner hears that a new way in exists.
			alerts.send(user.getEmail(), SecurityAlert.SIGN_IN_METHOD_ADDED);
		}
		return user;
	}

	/**
	 * An unverified account may have been created by anyone who typed this email. The person
	 * signing in now has proved they own it, so the earlier password must stop working.
	 */
	private User claimIfUnverified(User user) {
		if (!user.isEmailVerified()) {
			user.claimThroughSocialSignIn(unusablePasswordHash());
		}
		return user;
	}

	private String unusablePasswordHash() {
		return passwordEncoder.encode(UUID.randomUUID().toString() + UUID.randomUUID());
	}

	private static String displayName(SocialIdentity identity, String suggestedName) {
		String name = firstNonBlank(identity.name(), suggestedName,
				identity.email().substring(0, identity.email().indexOf('@')));
		return name.length() > MAX_NAME_LENGTH ? name.substring(0, MAX_NAME_LENGTH) : name;
	}

	private static String firstNonBlank(String... candidates) {
		for (String candidate : candidates) {
			if (candidate != null && !candidate.isBlank()) {
				return candidate.trim();
			}
		}
		return "Subtrack user";
	}

}
