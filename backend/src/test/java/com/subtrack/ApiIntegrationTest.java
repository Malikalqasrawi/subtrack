package com.subtrack;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.subtrack.auth.token.AccessTokenService;
import com.subtrack.auth.twofactor.TotpAuthenticator;
import com.subtrack.auth.twofactor.TotpTestSupport;
import com.subtrack.mail.EmailDispatcher;
import com.subtrack.mail.EmailMessage;
import com.subtrack.reminder.ReminderService;
import com.subtrack.support.MutableClock;
import com.subtrack.support.PostgresTest;
import com.subtrack.support.RecordingMailTransport;
import com.subtrack.user.UnverifiedAccountCleanup;
import com.subtrack.user.User;
import com.subtrack.user.UserRepository;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest extends PostgresTest {

	private static final String PASSWORD = "correct-horse-battery-1";

	@Autowired
	private MockMvc mvc;

	@Autowired
	private RecordingMailTransport emails;

	@Autowired
	private EmailDispatcher emailDispatcher;

	@Autowired
	private ReminderService reminderService;

	@Autowired
	private TotpAuthenticator totp;

	@Autowired
	private MutableClock clock;

	@Autowired
	private UserRepository users;

	@Autowired
	private UnverifiedAccountCleanup unverifiedAccountCleanup;

	@Autowired
	private AccessTokenService accessTokens;

	@AfterEach
	void backToNow() {
		clock.reset();
		emails.setDown(false);
	}

	@Test
	void protectedEndpointsRequireAToken() throws Exception {
		mvc.perform(get("/api/subscriptions"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
		mvc.perform(get("/api/subscriptions").header("Authorization", "Bearer not-a-token"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void registrationRejectsInvalidInput() throws Exception {
		mvc.perform(json(post("/api/auth/register"), """
				{"email": "not-an-email", "password": "short", "displayName": "", "phoneNumber": "0791234567"}"""))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
			.andExpect(jsonPath("$.fieldErrors.email").exists())
			.andExpect(jsonPath("$.fieldErrors.password").exists())
			.andExpect(jsonPath("$.fieldErrors.displayName").exists())
			.andExpect(jsonPath("$.fieldErrors.phoneNumber").exists());
	}

	@Test
	void passwordsNeedALetterANumberAndASpecialCharacter() throws Exception {
		for (String weak : new String[] { "onlyletters!", "12345678!", "letters123" }) {
			mvc.perform(json(post("/api/auth/register"), registration(newEmail(), weak)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.fieldErrors.password").exists());
		}
	}

	@Test
	void cannotSignInBeforeVerifyingEmail() throws Exception {
		String email = newEmail();
		register(email, PASSWORD);
		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("EMAIL_NOT_VERIFIED"));
	}

	@Test
	void wrongCodesAreRejectedAndLockTheCodeAfterFiveAttempts() throws Exception {
		String email = newEmail();
		register(email, PASSWORD);
		String realCode = emails.lastCodeFor(email);
		String wrongCode = realCode.equals("000000") ? "111111" : "000000";

		for (int i = 0; i < 5; i++) {
			mvc.perform(json(post("/api/auth/verify"), verification(email, PASSWORD, wrongCode)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("INVALID_CODE"));
		}
		mvc.perform(json(post("/api/auth/verify"), verification(email, PASSWORD, realCode)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
	}

	@Test
	void registeringAnExistingEmailLooksTheSameAndOnlyTellsItsOwner() throws Exception {
		String email = newEmail();
		signUp(email);
		int emailsBefore = emails.sentTo(email).size();

		for (int attempt = 0; attempt < 3; attempt++) {
			mvc.perform(json(post("/api/auth/register"), registration(email, "another-password-1")))
				.andExpect(status().isAccepted());
		}

		// One notice however often it is tried, with nothing in it that was typed into the form.
		assertThat(emails.sentTo(email)).hasSize(emailsBefore + 1);
		EmailMessage notice = emails.sentTo(email).get(emailsBefore);
		assertThat(notice.subject()).isEqualTo("You already have a Subtrack account");
		assertThat(notice.body()).doesNotContain("Test").doesNotContainPattern("\\d{6}");
		mvc.perform(json(post("/api/auth/login"), credentials(email, "another-password-1")))
			.andExpect(status().isUnauthorized());
		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD))).andExpect(status().isOk());
	}

	@Test
	void signUpStillWorksWhileTheMailServerIsDownAndTheCodeArrivesLater() throws Exception {
		String email = newEmail();
		emails.setDown(true);
		register(email, PASSWORD);
		assertThat(emails.sentTo(email)).isEmpty();

		emails.setDown(false);
		clock.advance(Duration.ofSeconds(61));
		emailDispatcher.sendDue();

		mvc.perform(json(post("/api/auth/verify"), verification(email, PASSWORD, emails.lastCodeFor(email))))
			.andExpect(status().isOk());
	}

	@Test
	void resendIsThrottledByTheCooldown() throws Exception {
		String email = newEmail();
		register(email, PASSWORD);
		mvc.perform(json(post("/api/auth/resend-verification"), "{\"email\": \"%s\"}".formatted(email)))
			.andExpect(status().isAccepted());
		assertThat(emails.sentTo(email)).hasSize(1);
	}

	@Test
	void wrongPasswordAndUnknownEmailGiveTheSameError() throws Exception {
		String email = newEmail();
		signUp(email);
		mvc.perform(json(post("/api/auth/login"), credentials(email, "wrong-password")))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
		mvc.perform(json(post("/api/auth/login"), credentials(newEmail(), PASSWORD)))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	void refreshTokensRotateAndReuseEndsTheSession() throws Exception {
		String email = newEmail();
		register(email, PASSWORD);
		MvcResult verified = mvc
			.perform(json(post("/api/auth/verify"), verification(email, PASSWORD, emails.lastCodeFor(email))))
			.andExpect(status().isOk())
			.andReturn();
		Cookie first = verified.getResponse().getCookie("refresh_token");
		assertThat(first).isNotNull();
		assertThat(first.isHttpOnly()).isTrue();

		MvcResult refreshed = mvc.perform(post("/api/auth/refresh").cookie(first))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.accessToken").isNotEmpty())
			.andReturn();
		Cookie second = refreshed.getResponse().getCookie("refresh_token");
		assertThat(second.getValue()).isNotEqualTo(first.getValue());

		// Replaying the old token is treated as theft: it fails and kills the newer token too.
		mvc.perform(post("/api/auth/refresh").cookie(first)).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/auth/refresh").cookie(second)).andExpect(status().isUnauthorized());
	}

	@Test
	void theMobileAppGetsItsRefreshTokenInTheAnswerInsteadOfACookie() throws Exception {
		String email = newEmail();
		signUp(email);
		MvcResult signedIn = mvc
			.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)).header("X-Subtrack-Client", "app"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.refreshToken").isNotEmpty())
			.andReturn();
		assertThat(signedIn.getResponse().getCookie("refresh_token")).isNull();
		String first = JsonPath.read(signedIn.getResponse().getContentAsString(), "$.refreshToken");

		MvcResult refreshed = mvc.perform(json(post("/api/auth/refresh"), refreshToken(first)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.accessToken").isNotEmpty())
			.andReturn();
		assertThat(refreshed.getResponse().getCookie("refresh_token")).isNull();
		String second = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.refreshToken");
		assertThat(second).isNotEqualTo(first);

		mvc.perform(json(post("/api/auth/logout"), refreshToken(second))).andExpect(status().isNoContent());
		mvc.perform(json(post("/api/auth/refresh"), refreshToken(second))).andExpect(status().isUnauthorized());
	}

	@Test
	void aBrowserNeverGetsItsRefreshTokenInTheAnswer() throws Exception {
		String email = newEmail();
		signUp(email);
		MvcResult signedIn = mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.refreshToken").doesNotExist())
			.andReturn();
		Cookie cookie = signedIn.getResponse().getCookie("refresh_token");

		// Even a page script that claims to be the app cannot turn the cookie into a readable token.
		MvcResult refreshed = mvc.perform(post("/api/auth/refresh").cookie(cookie).header("X-Subtrack-Client", "app"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.refreshToken").doesNotExist())
			.andReturn();
		assertThat(refreshed.getResponse().getCookie("refresh_token")).isNotNull();
	}

	@Test
	void logoutRevokesTheRefreshToken() throws Exception {
		String email = newEmail();
		register(email, PASSWORD);
		Cookie cookie = mvc
			.perform(json(post("/api/auth/verify"), verification(email, PASSWORD, emails.lastCodeFor(email))))
			.andReturn()
			.getResponse()
			.getCookie("refresh_token");

		mvc.perform(post("/api/auth/logout").cookie(cookie)).andExpect(status().isNoContent());
		mvc.perform(post("/api/auth/refresh").cookie(cookie)).andExpect(status().isUnauthorized());
	}

	@Test
	void subscriptionLifecycleAndInsights() throws Exception {
		String token = signUp(newEmail());
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		LocalDate renewsInFiveDays = today.plusDays(5);

		MvcResult created = mvc
			.perform(json(post("/api/subscriptions"), subscription("Netflix", "15.00", "USD", "MONTHLY",
					renewsInFiveDays.minusMonths(2)))
				.header("Authorization", token))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("ACTIVE"))
			.andExpect(jsonPath("$.nextRenewalDate").exists())
			.andReturn();
		String id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

		mvc.perform(json(post("/api/subscriptions"),
				subscription("Domain", "24.00", "USD", "YEARLY", today.plusDays(200)))
			.header("Authorization", token)).andExpect(status().isCreated());

		mvc.perform(get("/api/insights/summary").header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.currency").value("USD"))
			.andExpect(jsonPath("$.activeCount").value(2))
			.andExpect(jsonPath("$.monthlyTotal").value(17.00))
			.andExpect(jsonPath("$.yearlyTotal").value(204.00))
			.andExpect(jsonPath("$.upcoming.length()").value(1))
			.andExpect(jsonPath("$.upcoming[0].name").value("Netflix"))
			.andExpect(jsonPath("$.projection.length()").value(12));

		mvc.perform(get("/api/insights/calendar").header("Authorization", token)
			.param("year", String.valueOf(today.plusMonths(1).getYear()))
			.param("month", String.valueOf(today.plusMonths(1).getMonthValue())))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.renewals[0].name").value("Netflix"));

		mvc.perform(json(put("/api/subscriptions/" + id), subscription("Netflix", "15.00", "USD", "MONTHLY", today)
			.replace("\"ACTIVE\"", "\"CANCELLED\"")).header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.nextRenewalDate").doesNotExist());
		mvc.perform(get("/api/insights/summary").header("Authorization", token))
			.andExpect(jsonPath("$.activeCount").value(1));

		mvc.perform(delete("/api/subscriptions/" + id).header("Authorization", token))
			.andExpect(status().isNoContent());
		mvc.perform(get("/api/subscriptions/" + id).header("Authorization", token))
			.andExpect(status().isNotFound());
	}

	@Test
	void totalsAreConvertedToTheDefaultCurrency() throws Exception {
		String token = signUp(newEmail());
		mvc.perform(json(put("/api/users/me"), """
				{"displayName": "Test", "phoneNumber": "+962791234567", "defaultCurrency": "JOD"}""").header("Authorization", token))
			.andExpect(status().isOk());
		mvc.perform(json(post("/api/subscriptions"),
				subscription("Spotify", "10.00", "USD", "MONTHLY", LocalDate.now(ZoneOffset.UTC)))
			.header("Authorization", token)).andExpect(status().isCreated());

		// The fixed test rates have 1 USD = 0.709 JOD.
		mvc.perform(get("/api/insights/summary").header("Authorization", token))
			.andExpect(jsonPath("$.currency").value("JOD"))
			.andExpect(jsonPath("$.monthlyTotal").value(7.09));
	}

	@Test
	void usersCannotSeeOrChangeEachOthersSubscriptions() throws Exception {
		String owner = signUp(newEmail());
		String intruder = signUp(newEmail());
		MvcResult created = mvc
			.perform(json(post("/api/subscriptions"),
					subscription("Private", "5.00", "USD", "MONTHLY", LocalDate.now(ZoneOffset.UTC)))
				.header("Authorization", owner))
			.andReturn();
		String id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

		mvc.perform(get("/api/subscriptions/" + id).header("Authorization", intruder))
			.andExpect(status().isNotFound());
		mvc.perform(delete("/api/subscriptions/" + id).header("Authorization", intruder))
			.andExpect(status().isNotFound());
		mvc.perform(get("/api/subscriptions").header("Authorization", intruder))
			.andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void invalidSubscriptionsAreRejected() throws Exception {
		String token = signUp(newEmail());
		LocalDate today = LocalDate.now(ZoneOffset.UTC);
		mvc.perform(json(post("/api/subscriptions"), subscription("X", "-1.00", "USD", "MONTHLY", today))
			.header("Authorization", token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.amount").exists());
		mvc.perform(json(post("/api/subscriptions"), subscription("X", "1.00", "XXX", "MONTHLY", today))
			.header("Authorization", token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("UNSUPPORTED_CURRENCY"));
		mvc.perform(json(post("/api/subscriptions"), subscription("X", "1.00", "USD", "DAILY", today))
			.header("Authorization", token)).andExpect(status().isBadRequest());
	}

	@Test
	void aReminderIsEmailedOncePerRenewal() throws Exception {
		String email = newEmail();
		String token = signUp(email);
		LocalDate renewal = LocalDate.now(ZoneOffset.UTC).plusDays(2);
		mvc.perform(json(post("/api/subscriptions"), subscription("Gym", "30.00", "USD", "MONTHLY", renewal))
			.header("Authorization", token)).andExpect(status().isCreated());
		int before = emails.sentTo(email).size();

		reminderService.sendDueReminders();
		reminderService.sendDueReminders();

		assertThat(emails.sentTo(email)).hasSize(before + 1);
		assertThat(emails.sentTo(email).get(before).subject()).isEqualTo("Gym renews in 2 days");
	}

	@Test
	void forgottenPasswordCanBeResetWithAnEmailedCode() throws Exception {
		String email = newEmail();
		signUp(email);
		Cookie oldSession = mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)))
			.andReturn()
			.getResponse()
			.getCookie("refresh_token");

		mvc.perform(json(post("/api/auth/forgot-password"), "{\"email\": \"%s\"}".formatted(email)))
			.andExpect(status().isAccepted());
		// Unknown addresses get the same answer and no email.
		String stranger = newEmail();
		mvc.perform(json(post("/api/auth/forgot-password"), "{\"email\": \"%s\"}".formatted(stranger)))
			.andExpect(status().isAccepted());
		assertThat(emails.sentTo(stranger)).isEmpty();

		String code = emails.lastCodeFor(email);
		mvc.perform(json(post("/api/auth/reset-password"), reset(email, code, "weak")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.fieldErrors.newPassword").exists());
		mvc.perform(json(post("/api/auth/reset-password"), reset(email, code, "brand-new-pass-2")))
			.andExpect(status().isNoContent());

		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD))).andExpect(status().isUnauthorized());
		mvc.perform(json(post("/api/auth/login"), credentials(email, "brand-new-pass-2"))).andExpect(status().isOk());
		// The code works once, and sessions opened with the old password are gone.
		mvc.perform(json(post("/api/auth/reset-password"), reset(email, code, "another-pass-3")))
			.andExpect(status().isBadRequest());
		mvc.perform(post("/api/auth/refresh").cookie(oldSession)).andExpect(status().isUnauthorized());
		assertThat(subjectsSentTo(email)).contains("Your Subtrack password was changed");
	}

	@Test
	void resetCodeGuessesAreLimitedPerAccount() throws Exception {
		String email = newEmail();
		signUp(email);
		mvc.perform(json(post("/api/auth/forgot-password"), "{\"email\": \"%s\"}".formatted(email)))
			.andExpect(status().isAccepted());
		String realCode = emails.lastCodeFor(email);
		String wrongCode = realCode.equals("000000") ? "111111" : "000000";

		for (int i = 0; i < 10; i++) {
			mvc.perform(json(post("/api/auth/reset-password"), reset(email, wrongCode, "brand-new-pass-2")))
				.andExpect(status().isBadRequest());
		}
		mvc.perform(json(post("/api/auth/reset-password"), reset(email, wrongCode, "brand-new-pass-2")))
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("RATE_LIMITED"));
		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD))).andExpect(status().isOk());
	}

	@Test
	void wrongPasswordsLockTheAccountOnlyForTheAddressTheyCameFrom() throws Exception {
		String email = newEmail();
		signUp(email);
		for (int i = 0; i < 5; i++) {
			mvc.perform(json(post("/api/auth/login"), credentials(email, "wrong-password")).with(from("203.0.113.7")))
				.andExpect(status().isUnauthorized());
		}
		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)).with(from("203.0.113.7")))
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
		// The owner, somewhere else, is not locked out by someone else's guesses.
		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)).with(from("10.0.0.1")))
			.andExpect(status().isOk());

		clock.advance(Duration.ofMinutes(16));
		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)).with(from("203.0.113.7")))
			.andExpect(status().isOk());
	}

	@Test
	void wrongTwoFactorCodesCountTowardsTheSameLock() throws Exception {
		String email = newEmail();
		String token = signUp(email);
		MvcResult setup = mvc
			.perform(json(post("/api/users/me/2fa/setup"), currentPassword(PASSWORD)).header("Authorization", token))
			.andReturn();
		String secret = JsonPath.read(setup.getResponse().getContentAsString(), "$.secret");
		mvc.perform(json(post("/api/users/me/2fa/enable"), code(TotpTestSupport.currentCode(totp, secret)))
			.header("Authorization", token)).andExpect(status().isOk());
		// The secret is not readable from a copy of the database.
		assertThat(users.findByEmail(email).orElseThrow().getTotpSecret()).startsWith("v1:").doesNotContain(secret);

		for (int i = 0; i < 5; i++) {
			MvcResult challenged = mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)))
				.andExpect(status().isOk())
				.andReturn();
			String challenge = JsonPath.read(challenged.getResponse().getContentAsString(), "$.challengeToken");
			mvc.perform(json(post("/api/auth/2fa"), secondFactor(challenge, "000000")))
				.andExpect(status().isBadRequest());
		}
		// Entering the password again did not reset the count.
		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)))
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
	}

	@Test
	void aPasswordChangeOrSignOutEverywhereEndsOlderAccessTokens() throws Exception {
		String email = newEmail();
		String token = signUp(email);
		MvcResult changed = mvc.perform(json(post("/api/users/me/password"), """
				{"currentPassword": "%s", "newPassword": "changed-pass-9"}""".formatted(PASSWORD))
			.header("Authorization", token)).andExpect(status().isOk()).andReturn();
		mvc.perform(get("/api/users/me").header("Authorization", token)).andExpect(status().isUnauthorized());

		String newToken = "Bearer " + JsonPath.read(changed.getResponse().getContentAsString(), "$.accessToken");
		Cookie session = changed.getResponse().getCookie("refresh_token");
		mvc.perform(get("/api/users/me").header("Authorization", newToken)).andExpect(status().isOk());

		mvc.perform(post("/api/users/me/logout-all").header("Authorization", newToken))
			.andExpect(status().isNoContent());
		mvc.perform(get("/api/users/me").header("Authorization", newToken)).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/auth/refresh").cookie(session)).andExpect(status().isUnauthorized());
	}

	@Test
	void signUpsThatWereNeverVerifiedAreDeletedAfterTwoDays() throws Exception {
		String unverified = newEmail();
		String verified = newEmail();
		register(unverified, PASSWORD);
		signUp(verified);

		clock.advance(Duration.ofHours(47));
		unverifiedAccountCleanup.deleteOld();
		assertThat(users.findByEmail(unverified)).isPresent();

		clock.advance(Duration.ofHours(2));
		unverifiedAccountCleanup.deleteOld();
		assertThat(users.findByEmail(unverified)).isEmpty();
		assertThat(users.findByEmail(verified)).isPresent();
	}

	@Test
	void emailedCodesAreCappedPerAccountPerDay() throws Exception {
		String email = newEmail();
		register(email, PASSWORD);
		for (int i = 0; i < 6; i++) {
			clock.advance(Duration.ofSeconds(61));
			mvc.perform(json(post("/api/auth/resend-verification"), "{\"email\": \"%s\"}".formatted(email)))
				.andExpect(status().isAccepted());
		}
		assertThat(emails.sentTo(email)).hasSize(5);
	}

	@Test
	void codeEmailsCarryNoTextChosenAtSignUpAndNamesAreLettersOnly() throws Exception {
		String email = newEmail();
		mvc.perform(json(post("/api/auth/register"), """
				{"email": "%s", "password": "%s", "displayName": "Malik O'Neil-Smith", "phoneNumber": "+962791234567"}"""
			.formatted(email, PASSWORD))).andExpect(status().isAccepted());
		assertThat(emails.sentTo(email)).hasSize(1);
		assertThat(emails.sentTo(email).get(0).body()).doesNotContain("Malik");

		for (String name : new String[] { "Visit evil.example", "http://evil", "Line\\nbreak", "Malik 2" }) {
			mvc.perform(json(post("/api/auth/register"), """
					{"email": "%s", "password": "%s", "displayName": "%s", "phoneNumber": "+962791234567"}"""
				.formatted(newEmail(), PASSWORD, name)))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.fieldErrors.displayName").exists());
		}
	}

	@Test
	void twoFactorAddsASecondStepToSignIn() throws Exception {
		String email = newEmail();
		String token = signUp(email);

		mvc.perform(json(post("/api/users/me/2fa/setup"), currentPassword("not-my-password-1"))
			.header("Authorization", token))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("WRONG_PASSWORD"));
		MvcResult setup = mvc
			.perform(json(post("/api/users/me/2fa/setup"), currentPassword(PASSWORD)).header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.otpauthUri").value(org.hamcrest.Matchers.startsWith("otpauth://totp/Subtrack")))
			.andReturn();
		String secret = JsonPath.read(setup.getResponse().getContentAsString(), "$.secret");

		// Setup alone changes nothing: a wrong code does not switch it on.
		mvc.perform(json(post("/api/users/me/2fa/enable"), "{\"code\": \"000000\"}").header("Authorization", token))
			.andExpect(status().isBadRequest());
		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)))
			.andExpect(jsonPath("$.twoFactorRequired").value(false));

		String enablingCode = TotpTestSupport.currentCode(totp, secret);
		MvcResult enabled = mvc
			.perform(json(post("/api/users/me/2fa/enable"), code(enablingCode)).header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.recoveryCodes.length()").value(8))
			.andReturn();
		String recoveryCode = JsonPath.read(enabled.getResponse().getContentAsString(), "$.recoveryCodes[0]");
		assertThat(subjectsSentTo(email)).contains("Two-factor authentication is on");

		// The password alone no longer opens a session.
		MvcResult challenged = mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD)))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.twoFactorRequired").value(true))
			.andExpect(jsonPath("$.accessToken").doesNotExist())
			.andReturn();
		assertThat(challenged.getResponse().getCookie("refresh_token")).isNull();
		String challenge = JsonPath.read(challenged.getResponse().getContentAsString(), "$.challengeToken");

		// The challenge is not an access token.
		mvc.perform(get("/api/subscriptions").header("Authorization", "Bearer " + challenge))
			.andExpect(status().isUnauthorized());
		// The code that enabled two-factor was already used, so replaying it fails.
		mvc.perform(json(post("/api/auth/2fa"), secondFactor(challenge, enablingCode)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_2FA_CODE"));
		mvc.perform(json(post("/api/auth/2fa"), secondFactor(challenge, TotpTestSupport.nextCode(totp, secret))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.accessToken").isNotEmpty())
			.andExpect(jsonPath("$.user.twoFactorEnabled").value(true));

		// A recovery code stands in for the app, once.
		mvc.perform(json(post("/api/auth/2fa"), secondFactor(challenge, recoveryCode))).andExpect(status().isOk());
		mvc.perform(json(post("/api/auth/2fa"), secondFactor(challenge, recoveryCode)))
			.andExpect(status().isBadRequest());
	}

	@Test
	void passwordAndEmailCanBeChangedFromTheAccount() throws Exception {
		String email = newEmail();
		String token = signUp(email);

		mvc.perform(json(post("/api/users/me/password"), """
				{"currentPassword": "not-my-password-1", "newPassword": "changed-pass-9"}""")
			.header("Authorization", token))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("WRONG_PASSWORD"));
		MvcResult changed = mvc.perform(json(post("/api/users/me/password"), """
				{"currentPassword": "%s", "newPassword": "changed-pass-9"}""".formatted(PASSWORD))
			.header("Authorization", token)).andExpect(status().isOk()).andReturn();
		// The change ended the old token and answered with a new one.
		token = "Bearer " + JsonPath.read(changed.getResponse().getContentAsString(), "$.accessToken");

		String newEmail = newEmail();
		mvc.perform(json(post("/api/users/me/email"), """
				{"newEmail": "%s", "currentPassword": "changed-pass-9"}""".formatted(newEmail))
			.header("Authorization", token)).andExpect(status().isAccepted());

		// Nothing changes until the code sent to the new address is confirmed.
		mvc.perform(get("/api/users/me").header("Authorization", token)).andExpect(jsonPath("$.email").value(email));
		mvc.perform(json(post("/api/users/me/email/confirm"), code(emails.lastCodeFor(newEmail)))
			.header("Authorization", token)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value(newEmail));
		mvc.perform(json(post("/api/auth/login"), credentials(newEmail, "changed-pass-9"))).andExpect(status().isOk());
		assertThat(subjectsSentTo(email)).contains("Your Subtrack password was changed",
				"Your Subtrack email address was changed");
		mvc.perform(json(post("/api/auth/login"), credentials(email, "changed-pass-9")))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void deletingAnAccountRemovesTheUserAndTheirData() throws Exception {
		String email = newEmail();
		String token = signUp(email);
		mvc.perform(json(post("/api/subscriptions"),
				subscription("Netflix", "15.00", "USD", "MONTHLY", LocalDate.now(ZoneOffset.UTC)))
			.header("Authorization", token)).andExpect(status().isCreated());

		mvc.perform(json(delete("/api/users/me"), "{\"currentPassword\": \"wrong-password-1\"}")
			.header("Authorization", token)).andExpect(status().isForbidden());
		mvc.perform(json(delete("/api/users/me"), "{\"currentPassword\": \"%s\"}".formatted(PASSWORD))
			.header("Authorization", token)).andExpect(status().isNoContent());

		mvc.perform(json(post("/api/auth/login"), credentials(email, PASSWORD))).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/users/me").header("Authorization", token)).andExpect(status().isUnauthorized());
		// The address is free to register again.
		register(email, PASSWORD);
		assertThat(emails.sentTo(email)).hasSize(2);
	}

	@Test
	void anAccountWithoutAPasswordConfirmsSensitiveChangesWithAnEmailedCode() throws Exception {
		User account = accountWithoutPassword();
		String token = "Bearer " + accessTokens.issue(account);

		mvc.perform(json(post("/api/users/me/password"), "{\"newPassword\": \"brand-new-pass-2\"}")
			.header("Authorization", token))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("CONFIRMATION_REQUIRED"));
		mvc.perform(json(post("/api/users/me/email"), "{\"newEmail\": \"%s\"}".formatted(newEmail()))
			.header("Authorization", token)).andExpect(status().isForbidden());
		mvc.perform(json(post("/api/users/me/2fa/setup"), "{}").header("Authorization", token))
			.andExpect(status().isForbidden());
		mvc.perform(json(delete("/api/users/me"), "{}").header("Authorization", token))
			.andExpect(status().isForbidden());

		mvc.perform(post("/api/users/me/confirmation-code").header("Authorization", token))
			.andExpect(status().isAccepted());
		String code = emails.lastCodeFor(account.getEmail());
		MvcResult changed = mvc
			.perform(json(post("/api/users/me/password"), newPasswordWithCode("brand-new-pass-2", code))
				.header("Authorization", token))
			.andExpect(status().isOk())
			.andReturn();

		mvc.perform(json(post("/api/auth/login"), credentials(account.getEmail(), "brand-new-pass-2")))
			.andExpect(status().isOk());
		// From now on the password is the proof, so no more codes are sent.
		String newToken = "Bearer " + JsonPath.read(changed.getResponse().getContentAsString(), "$.accessToken");
		mvc.perform(post("/api/users/me/confirmation-code").header("Authorization", newToken))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("PASSWORD_REQUIRED"));
	}

	@Test
	void wrongConfirmationCodesAreCountedAndTheCodeWorksOnce() throws Exception {
		User account = accountWithoutPassword();
		String token = "Bearer " + accessTokens.issue(account);
		mvc.perform(post("/api/users/me/confirmation-code").header("Authorization", token))
			.andExpect(status().isAccepted());
		String code = emails.lastCodeFor(account.getEmail());
		String wrongCode = code.equals("000000") ? "111111" : "000000";

		for (int i = 0; i < 5; i++) {
			mvc.perform(json(delete("/api/users/me"), "{\"confirmationCode\": \"%s\"}".formatted(wrongCode))
				.header("Authorization", token))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("INVALID_CODE"));
		}
		// The right code no longer helps: the wrong attempts were kept although each request failed.
		mvc.perform(json(delete("/api/users/me"), "{\"confirmationCode\": \"%s\"}".formatted(code))
			.header("Authorization", token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("TOO_MANY_ATTEMPTS"));
		mvc.perform(get("/api/users/me").header("Authorization", token)).andExpect(status().isOk());
	}

	@Test
	void anAccountWithoutAPasswordIsDeletedWithItsCode() throws Exception {
		User account = accountWithoutPassword();
		String token = "Bearer " + accessTokens.issue(account);
		mvc.perform(post("/api/users/me/confirmation-code").header("Authorization", token))
			.andExpect(status().isAccepted());
		String code = emails.lastCodeFor(account.getEmail());

		mvc.perform(json(delete("/api/users/me"), "{\"confirmationCode\": \"%s\"}".formatted(code))
			.header("Authorization", token)).andExpect(status().isNoContent());

		assertThat(users.findByEmail(account.getEmail())).isEmpty();
	}

	@Test
	void aLockDoesNotShowWhetherTheEmailHasAnAccount() throws Exception {
		String known = newEmail();
		signUp(known);
		String unknown = newEmail();

		for (String email : List.of(known, unknown)) {
			for (int i = 0; i < 5; i++) {
				mvc.perform(json(post("/api/auth/login"), credentials(email, "wrong-password-1")).with(from("203.0.113.7")))
					.andExpect(status().isUnauthorized())
					.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
			}
			mvc.perform(json(post("/api/auth/login"), credentials(email, "wrong-password-1")).with(from("203.0.113.7")))
				.andExpect(status().isTooManyRequests())
				.andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
			mvc.perform(json(post("/api/auth/login"), credentials(email, "wrong-password-1")).with(from("203.0.113.8")))
				.andExpect(status().isUnauthorized());
		}
	}

	@Test
	void wrongResetCodesAnswerTheSameWithOrWithoutAnAccount() throws Exception {
		String known = newEmail();
		signUp(known);
		mvc.perform(json(post("/api/auth/forgot-password"), "{\"email\": \"%s\"}".formatted(known)))
			.andExpect(status().isAccepted());
		String realCode = emails.lastCodeFor(known);
		String wrongCode = realCode.equals("000000") ? "111111" : "000000";
		String unknown = newEmail();

		for (String email : List.of(known, unknown)) {
			// The real code stops working after five wrong tries, and the answer does not say so.
			for (int i = 0; i < 10; i++) {
				mvc.perform(json(post("/api/auth/reset-password"), reset(email, wrongCode, "brand-new-pass-2")))
					.andExpect(status().isBadRequest())
					.andExpect(jsonPath("$.code").value("INVALID_CODE"));
			}
			mvc.perform(json(post("/api/auth/reset-password"), reset(email, wrongCode, "brand-new-pass-2")))
				.andExpect(status().isTooManyRequests());
		}
	}

	@Test
	void changingToAnAddressThatHasAnAccountAnswersLikeAnyOther() throws Exception {
		String email = newEmail();
		String token = signUp(email);
		String taken = newEmail();
		signUp(taken);
		String request = """
				{"newEmail": "%s", "currentPassword": "%s"}""".formatted(taken, PASSWORD);

		mvc.perform(json(post("/api/users/me/email"), request).header("Authorization", token))
			.andExpect(status().isAccepted());

		// The owner of the address is told. The code is created but sent to nobody.
		assertThat(subjectsSentTo(taken)).contains("You already have a Subtrack account")
			.doesNotContain("Confirm your new Subtrack email");
		// Asking again too soon is refused, exactly as for a free address.
		mvc.perform(json(post("/api/users/me/email"), request).header("Authorization", token))
			.andExpect(status().isTooManyRequests());
		mvc.perform(json(post("/api/users/me/email/confirm"), code("000000")).header("Authorization", token))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_CODE"));
		mvc.perform(get("/api/users/me").header("Authorization", token)).andExpect(jsonPath("$.email").value(email));
	}

	@Test
	void anUnconfirmedSignUpGivesWayToAnEmailChange() throws Exception {
		String token = signUp(newEmail());
		String wanted = newEmail();
		// Someone typed the address into the sign-up form and never confirmed it.
		register(wanted, PASSWORD);

		mvc.perform(json(post("/api/users/me/email"), """
				{"newEmail": "%s", "currentPassword": "%s"}""".formatted(wanted, PASSWORD))
			.header("Authorization", token)).andExpect(status().isAccepted());
		mvc.perform(json(post("/api/users/me/email/confirm"), code(emails.lastCodeFor(wanted)))
			.header("Authorization", token))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value(wanted));

		mvc.perform(json(post("/api/auth/login"), credentials(wanted, PASSWORD))).andExpect(status().isOk());
	}

	@Test
	void publicConfigReportsUnconfiguredProvidersAsNull() throws Exception {
		mvc.perform(get("/api/public/config"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.googleClientId").doesNotExist());
		mvc.perform(json(post("/api/auth/google"), "{\"idToken\": \"anything\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("PROVIDER_NOT_CONFIGURED"));
	}

	/** Registers, verifies and returns a ready-to-use Authorization header value. */
	private String signUp(String email) throws Exception {
		register(email, PASSWORD);
		MvcResult result = mvc
			.perform(json(post("/api/auth/verify"), verification(email, PASSWORD, emails.lastCodeFor(email))))
			.andExpect(status().isOk())
			.andReturn();
		return "Bearer " + JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
	}

	/** An account as a first sign-in with Google or Apple creates it. */
	private User accountWithoutPassword() {
		return users.save(User.fromSocialSignIn(newEmail(), "no-password", "Google Person", "USD"));
	}

	private void register(String email, String password) throws Exception {
		mvc.perform(json(post("/api/auth/register"), registration(email, password))).andExpect(status().isAccepted());
	}

	private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
		return request.contentType(MediaType.APPLICATION_JSON).content(body);
	}

	private static String newEmail() {
		return "user-" + UUID.randomUUID() + "@example.com";
	}

	private static String registration(String email, String password) {
		return """
				{"email": "%s", "password": "%s", "displayName": "Test", "phoneNumber": "+962791234567"}"""
			.formatted(email, password);
	}

	private static String credentials(String email, String password) {
		return """
				{"email": "%s", "password": "%s"}""".formatted(email, password);
	}

	private static String reset(String email, String code, String newPassword) {
		return """
				{"email": "%s", "code": "%s", "newPassword": "%s"}""".formatted(email, code, newPassword);
	}

	private List<String> subjectsSentTo(String email) {
		return emails.sentTo(email).stream().map(EmailMessage::subject).toList();
	}

	private static RequestPostProcessor from(String address) {
		return request -> {
			request.setRemoteAddr(address);
			return request;
		};
	}

	private static String refreshToken(String token) {
		return "{\"refreshToken\": \"%s\"}".formatted(token);
	}

	private static String newPasswordWithCode(String newPassword, String code) {
		return "{\"newPassword\": \"%s\", \"confirmationCode\": \"%s\"}".formatted(newPassword, code);
	}

	private static String currentPassword(String password) {
		return "{\"currentPassword\": \"%s\"}".formatted(password);
	}

	private static String code(String code) {
		return "{\"code\": \"%s\"}".formatted(code);
	}

	private static String secondFactor(String challengeToken, String code) {
		return """
				{"challengeToken": "%s", "code": "%s"}""".formatted(challengeToken, code);
	}

	private static String verification(String email, String password, String code) {
		return """
				{"email": "%s", "password": "%s", "code": "%s"}""".formatted(email, password, code);
	}

	/** A subscription with reminders 3 days before renewal. */
	private static String subscription(String name, String amount, String currency, String cycle,
			LocalDate firstBillingDate) {
		return """
				{"name": "%s", "amount": %s, "currency": "%s", "billingCycle": "%s", "category": "ENTERTAINMENT",
				 "firstBillingDate": "%s", "status": "ACTIVE", "reminderDaysBefore": 3}"""
			.formatted(name, amount, currency, cycle, firstBillingDate);
	}

}
