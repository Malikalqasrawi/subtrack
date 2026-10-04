package com.subtrack.mail;

import com.subtrack.common.SecretBox;
import java.time.Clock;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Saves each email in the outbox as part of the caller's transaction. Nothing is sent here:
 * {@link EmailDispatcher} takes over once the transaction commits. The body is stored
 * encrypted, because it can hold a sign-in code.
 */
@Component
public class OutboxEmailSender implements EmailSender {

	private final OutgoingEmailRepository emails;

	private final SecretBox secretBox;

	private final ApplicationEventPublisher events;

	private final TransactionTemplate transactions;

	private final Clock clock;

	public OutboxEmailSender(OutgoingEmailRepository emails, SecretBox secretBox, ApplicationEventPublisher events,
			PlatformTransactionManager transactionManager, Clock clock) {
		this.emails = emails;
		this.secretBox = secretBox;
		this.events = events;
		this.transactions = new TransactionTemplate(transactionManager);
		this.clock = clock;
	}

	@Override
	public void send(EmailMessage message) {
		String sealedBody = secretBox.seal(message.body());
		// Checked before the transaction is touched, so a caller that catches this keeps its own work.
		if (sealedBody.length() > OutgoingEmail.MAX_BODY_LENGTH) {
			throw new IllegalArgumentException("Email body is too long for the outbox");
		}
		transactions.executeWithoutResult(status -> {
			OutgoingEmail email = emails
				.save(new OutgoingEmail(message.to(), message.subject(), sealedBody, clock.instant()));
			events.publishEvent(new EmailQueued(email.getId()));
		});
	}

}
