package com.subtrack.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.subtrack.common.SecretBox;
import com.subtrack.support.MutableClock;
import com.subtrack.support.RecordingMailTransport;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The path of an email from the moment the application hands it over until the mail server
 * has it, including a mail server that is down for a while or for good.
 */
@SpringBootTest
@ActiveProfiles("test")
class EmailOutboxTest {

	private static final String BODY = """
			Hi,

			Use this code to confirm your email address:

			    482913
			""";

	@Autowired
	private EmailSender emailSender;

	@Autowired
	private EmailDispatcher dispatcher;

	@Autowired
	private OutgoingEmailRepository outbox;

	@Autowired
	private RecordingMailTransport mailServer;

	@Autowired
	private MutableClock clock;

	@Autowired
	private PlatformTransactionManager transactionManager;

	private String recipient;

	@BeforeEach
	void emptyOutbox() {
		outbox.deleteAll();
		recipient = "user-" + UUID.randomUUID() + "@example.com";
	}

	@AfterEach
	void backToNormal() {
		clock.reset();
		mailServer.setDown(false);
	}

	@Test
	void anEmailGoesOutAsSoonAsItIsHandedOver() {
		emailSender.send(new EmailMessage(recipient, "Your Subtrack verification code", BODY));

		assertThat(mailServer.sentTo(recipient)).containsExactly(new EmailMessage(recipient, "Your Subtrack verification code", BODY));
		OutgoingEmail email = onlyEmail();
		assertThat(email.getStatus()).isEqualTo(EmailStatus.SENT);
		assertThat(email.getAttempts()).isEqualTo(1);
		assertThat(email.getSentAt()).isNotNull();
	}

	@Test
	void nothingIsSentForAChangeThatWasRolledBack() {
		new TransactionTemplate(transactionManager).executeWithoutResult(transaction -> {
			emailSender.send(new EmailMessage(recipient, "Your Subtrack verification code", BODY));
			transaction.setRollbackOnly();
		});

		assertThat(mailServer.sentTo(recipient)).isEmpty();
		assertThat(outbox.findAll()).isEmpty();
	}

	@Test
	void anEmailTooLongForTheOutboxIsRefusedWithoutSpoilingTheCallersTransaction() {
		new TransactionTemplate(transactionManager).executeWithoutResult(transaction -> {
			emailSender.send(new EmailMessage(recipient, "Gym renews tomorrow", "Hi,\n\nYour Gym subscription renews tomorrow.\n"));
			assertThatThrownBy(() -> emailSender.send(new EmailMessage(recipient, "Too long", "x".repeat(5000))))
				.isInstanceOf(IllegalArgumentException.class);
		});

		assertThat(mailServer.sentTo(recipient)).extracting(EmailMessage::subject).containsExactly("Gym renews tomorrow");
	}

	@Test
	void theBodyIsUnreadableWhileItWaitsAndGoneOnceItIsSent() {
		mailServer.setDown(true);
		emailSender.send(new EmailMessage(recipient, "Your Subtrack verification code", BODY));

		String waiting = onlyEmail().getBody();
		assertThat(SecretBox.isSealed(waiting)).isTrue();
		assertThat(waiting).doesNotContain("482913");

		mailServer.setDown(false);
		clock.advance(Duration.ofSeconds(61));
		assertThat(dispatcher.sendDue()).isEqualTo(1);

		assertThat(mailServer.sentTo(recipient)).extracting(EmailMessage::body).containsExactly(BODY);
		assertThat(onlyEmail().getBody()).isNull();
	}

	@Test
	void aFailedEmailWaitsLongerBeforeEachNewAttempt() {
		mailServer.setDown(true);
		emailSender.send(new EmailMessage(recipient, "Gym renews tomorrow", "Hi Malik,\n\nYour Gym subscription renews tomorrow.\n"));
		assertThat(onlyEmail().getAttempts()).isEqualTo(1);
		assertThat(onlyEmail().getLastError()).contains("Mail server is down");

		clock.advance(Duration.ofSeconds(59));
		dispatcher.sendDue();
		assertThat(onlyEmail().getAttempts()).isEqualTo(1);

		clock.advance(Duration.ofSeconds(2));
		dispatcher.sendDue();
		assertThat(onlyEmail().getAttempts()).isEqualTo(2);

		// The second wait is five minutes, so one more minute changes nothing.
		clock.advance(Duration.ofSeconds(61));
		dispatcher.sendDue();
		assertThat(onlyEmail().getAttempts()).isEqualTo(2);

		mailServer.setDown(false);
		clock.advance(Duration.ofMinutes(4));
		assertThat(dispatcher.sendDue()).isEqualTo(1);

		assertThat(mailServer.sentTo(recipient)).hasSize(1);
		OutgoingEmail email = onlyEmail();
		assertThat(email.getStatus()).isEqualTo(EmailStatus.SENT);
		assertThat(email.getAttempts()).isEqualTo(3);
		assertThat(email.getLastError()).isNull();
		assertThat(dispatcher.sendDue()).isZero();
	}

	@Test
	void anEmailIsGivenUpOnAfterTheFifthFailedAttempt() {
		mailServer.setDown(true);
		emailSender.send(new EmailMessage(recipient, "Your Subtrack verification code", BODY));

		for (Duration wait : EmailDispatcher.RETRY_DELAYS) {
			assertThat(onlyEmail().getStatus()).isEqualTo(EmailStatus.PENDING);
			clock.advance(wait.plusSeconds(1));
			dispatcher.sendDue();
		}

		OutgoingEmail email = onlyEmail();
		assertThat(email.getStatus()).isEqualTo(EmailStatus.FAILED);
		assertThat(email.getAttempts()).isEqualTo(5);
		assertThat(email.getBody()).isNull();

		mailServer.setDown(false);
		clock.advance(Duration.ofDays(1));
		assertThat(dispatcher.sendDue()).isZero();
		assertThat(mailServer.sentTo(recipient)).isEmpty();
	}

	@Test
	void anEmailCanOnlyBeTakenByOneSenderAtATime() {
		TransactionTemplate transactions = new TransactionTemplate(transactionManager);
		OutgoingEmail waiting = outbox.save(new OutgoingEmail(recipient, "Your Subtrack verification code", "sealed", clock.instant()));

		int first = transactions.execute(status -> outbox.claim(waiting.getId(), EmailStatus.PENDING, clock.instant(),
				clock.instant().plus(Duration.ofMinutes(5))));
		int second = transactions.execute(status -> outbox.claim(waiting.getId(), EmailStatus.PENDING, clock.instant(),
				clock.instant().plus(Duration.ofMinutes(5))));

		assertThat(List.of(first, second)).containsExactly(1, 0);
		// If the sender that took it never reports back, the email becomes due again.
		clock.advance(Duration.ofMinutes(5).plusSeconds(1));
		assertThat(outbox.findDueIds(EmailStatus.PENDING, clock.instant(), Pageable.unpaged()))
			.containsExactly(waiting.getId());
	}

	@Test
	void oldEmailsAreDeletedButOnesStillWaitingAreKept() {
		emailSender.send(new EmailMessage(recipient, "Your Subtrack verification code", BODY));
		mailServer.setDown(true);
		emailSender.send(new EmailMessage(recipient, "Gym renews tomorrow", "Hi,\n\nYour Gym subscription renews tomorrow.\n"));

		clock.advance(Duration.ofDays(6));
		assertThat(dispatcher.deleteOld()).isZero();

		clock.advance(Duration.ofDays(2));
		assertThat(dispatcher.deleteOld()).isEqualTo(1);
		assertThat(outbox.findAll()).extracting(OutgoingEmail::getSubject).containsExactly("Gym renews tomorrow");
	}

	private OutgoingEmail onlyEmail() {
		List<OutgoingEmail> all = outbox.findAll();
		assertThat(all).hasSize(1);
		return all.get(0);
	}

}
