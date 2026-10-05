package com.subtrack.auth.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.subtrack.common.error.BadRequestException;
import com.subtrack.support.PostgresTest;
import com.subtrack.user.User;
import com.subtrack.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Exercises account creation and linking with a stand-in for Google. Real ID tokens cannot be
 * produced in a test, which is exactly why the service depends on an interface.
 */
@SpringBootTest
class SocialLoginServiceTest extends PostgresTest {

	@Autowired
	private UserRepository users;

	@Autowired
	private SocialAccountRepository socialAccounts;

	@Autowired
	private PasswordEncoder passwordEncoder;

	private SocialLoginService service;

	/** The fake verifier treats the "token" as "subject|email|verified". */
	private final IdentityTokenVerifier fakeGoogle = new IdentityTokenVerifier() {
		@Override
		public SocialProvider provider() {
			return SocialProvider.GOOGLE;
		}

		@Override
		public String clientId() {
			return "test-client";
		}

		@Override
		public SocialIdentity verify(String idToken) {
			String[] parts = idToken.split("\\|");
			return new SocialIdentity(SocialProvider.GOOGLE, parts[0], parts[1], Boolean.parseBoolean(parts[2]),
					"Google Name");
		}
	};

	@BeforeEach
	void setUp() {
		service = new SocialLoginService(List.of(fakeGoogle), users, socialAccounts, passwordEncoder);
	}

	@Test
	void firstSignInCreatesAVerifiedAccountWithoutAPassword() {
		String email = newEmail();
		User user = service.signIn(SocialProvider.GOOGLE, token("sub-1" + email, email, true), null);

		assertThat(user.getEmail()).isEqualTo(email);
		assertThat(user.getDisplayName()).isEqualTo("Google Name");
		assertThat(user.isEmailVerified()).isTrue();
		assertThat(user.hasPassword()).isFalse();
	}

	@Test
	void signingInAgainFindsTheSameUserEvenIfTheEmailChanged() {
		String email = newEmail();
		User first = service.signIn(SocialProvider.GOOGLE, token("sub-2" + email, email, true), null);
		User second = service.signIn(SocialProvider.GOOGLE, token("sub-2" + email, newEmail(), true), null);

		assertThat(second.getId()).isEqualTo(first.getId());
	}

	@Test
	void linksToAnExistingVerifiedAccountWithTheSameEmailAndKeepsItsPassword() {
		String email = newEmail();
		User existing = new User(email, passwordEncoder.encode("existing-pass-1"), "Existing", "+962791234567", "USD");
		existing.markEmailVerified();
		users.save(existing);

		User signedIn = service.signIn(SocialProvider.GOOGLE, token("sub-3" + email, email, true), null);

		assertThat(signedIn.getId()).isEqualTo(existing.getId());
		assertThat(signedIn.hasPassword()).isTrue();
		assertThat(passwordEncoder.matches("existing-pass-1", signedIn.getPasswordHash())).isTrue();
	}

	@Test
	void claimingAnUnverifiedAccountDisablesThePasswordSomeoneElseMayHaveSet() {
		String email = newEmail();
		users.save(new User(email, passwordEncoder.encode("squatter-pass-1"), "Squatter", "+962791234567", "USD"));

		User signedIn = service.signIn(SocialProvider.GOOGLE, token("sub-4" + email, email, true), null);

		assertThat(signedIn.isEmailVerified()).isTrue();
		assertThat(signedIn.hasPassword()).isFalse();
		assertThat(passwordEncoder.matches("squatter-pass-1", signedIn.getPasswordHash())).isFalse();
	}

	@Test
	void refusesAnEmailTheProviderHasNotVerified() {
		String email = newEmail();
		assertThatThrownBy(() -> service.signIn(SocialProvider.GOOGLE, token("sub-5" + email, email, false), null))
			.isInstanceOf(BadRequestException.class);
		assertThat(users.findByEmail(email)).isEmpty();
	}

	private static String token(String subject, String email, boolean verified) {
		return subject + "|" + email + "|" + verified;
	}

	private static String newEmail() {
		return "social-" + UUID.randomUUID() + "@example.com";
	}

}
