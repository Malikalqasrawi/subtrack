package com.subtrack.auth.verification;

import static org.assertj.core.api.Assertions.assertThat;

import com.subtrack.user.User;
import com.subtrack.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

/** How many codes the whole application emails in an hour, here with room for two of each kind. */
@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = { "app.verification.global-codes-per-hour=2",
		"app.verification.global-unverified-codes-per-hour=2" })
class EmailedCodeBudgetTest {

	@Autowired
	private VerificationService verification;

	@Autowired
	private UserRepository users;

	@Test
	void signUpsCannotUseUpTheCodesOfConfirmedAccounts() {
		assertThat(verification.issueCode(signUp(), CodePurpose.EMAIL_VERIFICATION)).isPresent();
		assertThat(verification.issueCode(signUp(), CodePurpose.EMAIL_VERIFICATION)).isPresent();
		// Nothing is left for addresses nobody has confirmed, whatever the code is for.
		assertThat(verification.issueCode(signUp(), CodePurpose.EMAIL_VERIFICATION)).isEmpty();
		assertThat(verification.issueCode(signUp(), CodePurpose.PASSWORD_RESET)).isEmpty();

		assertThat(verification.issueCode(confirmedAccount(), CodePurpose.PASSWORD_RESET)).isPresent();
		assertThat(verification.issueCode(confirmedAccount(), CodePurpose.PASSWORD_RESET)).isPresent();
		assertThat(verification.issueCode(confirmedAccount(), CodePurpose.PASSWORD_RESET)).isEmpty();
	}

	private User signUp() {
		return users.save(newUser());
	}

	private User confirmedAccount() {
		User user = newUser();
		user.markEmailVerified();
		return users.save(user);
	}

	private static User newUser() {
		return new User("budget-" + UUID.randomUUID() + "@example.com", "no-password", "Budget Test", "+962791234567",
				"USD");
	}

}
