package com.subtrack.mail;

import com.subtrack.common.SecretBox;
import com.subtrack.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Sends what {@link OutboxEmailSender} saved: each email as soon as the transaction that queued
 * it commits, on the mail threads so no request waits for the mail server. A failed attempt is
 * made again after 1, 5, 15 and 60 minutes, and the email is given up on after the fifth.
 */
@Component
public class EmailDispatcher {

	private static final Logger log = LoggerFactory.getLogger(EmailDispatcher.class);

	/** The wait after each failed attempt. A failure after the last one is final. */
	static final List<Duration> RETRY_DELAYS = List.of(Duration.ofMinutes(1), Duration.ofMinutes(5),
			Duration.ofMinutes(15), Duration.ofHours(1));

	/** An attempt that is not recorded as sent or failed by then (the server stopped) is made again. */
	private static final Duration ATTEMPT_TIMEOUT = Duration.ofMinutes(5);

	private static final int BATCH_SIZE = 50;

	private final OutgoingEmailRepository emails;

	private final MailTransport transport;

	private final SecretBox secretBox;

	private final TaskExecutor mailExecutor;

	private final TransactionTemplate transactions;

	private final Clock clock;

	private final Duration keepFor;

	public EmailDispatcher(OutgoingEmailRepository emails, MailTransport transport, SecretBox secretBox,
			TaskExecutor mailExecutor, PlatformTransactionManager transactionManager, Clock clock,
			AppProperties properties) {
		this.emails = emails;
		this.transport = transport;
		this.secretBox = secretBox;
		this.mailExecutor = mailExecutor;
		this.transactions = new TransactionTemplate(transactionManager);
		// This can run on the thread of the transaction that just committed, which must not be joined.
		this.transactions.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
		this.clock = clock;
		this.keepFor = properties.mail().keepFor();
	}

	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	void onQueued(EmailQueued queued) {
		inBackground(() -> deliver(queued.emailId()));
	}

	/** Tries every email whose time has come and returns how many were sent. */
	public int sendDue() {
		int sent = 0;
		for (UUID id : emails.findDueIds(EmailStatus.PENDING, clock.instant(), PageRequest.of(0, BATCH_SIZE))) {
			if (deliver(id)) {
				sent++;
			}
		}
		return sent;
	}

	/** Deletes emails that were sent or given up on long enough ago and returns how many. */
	public int deleteOld() {
		Instant before = clock.instant().minus(keepFor);
		Integer deleted = transactions
			.execute(status -> emails.deleteFinishedBefore(List.of(EmailStatus.SENT, EmailStatus.FAILED), before));
		return deleted == null ? 0 : deleted;
	}

	/** Runs a task on the mail threads. What they cannot take stays in the outbox for the next retry run. */
	void inBackground(Runnable task) {
		try {
			mailExecutor.execute(() -> {
				try {
					task.run();
				}
				catch (RuntimeException ex) {
					log.error("Email task failed", ex);
				}
			});
		}
		catch (TaskRejectedException ex) {
			log.warn("Mail threads are busy, leaving the work for the next retry run");
		}
	}

	private boolean deliver(UUID id) {
		OutgoingEmail email = claim(id);
		if (email == null) {
			return false;
		}
		try {
			transport.send(new EmailMessage(email.getRecipient(), email.getSubject(), secretBox.open(email.getBody())));
		}
		catch (RuntimeException ex) {
			String error = describe(ex);
			record(id, failed -> failed.attemptFailed(error, clock.instant(), RETRY_DELAYS));
			log.warn("Could not send email {} (attempt {} of {}): {}", id, email.getAttempts(),
					RETRY_DELAYS.size() + 1, error);
			return false;
		}
		record(id, sent -> sent.markSent(clock.instant()));
		return true;
	}

	/** The email, taken for one attempt, or null when it is not due or another thread has it. */
	private OutgoingEmail claim(UUID id) {
		Instant now = clock.instant();
		return transactions
			.execute(status -> emails.claim(id, EmailStatus.PENDING, now, now.plus(ATTEMPT_TIMEOUT)) == 1
					? emails.findById(id).orElse(null) : null);
	}

	private void record(UUID id, Consumer<OutgoingEmail> outcome) {
		transactions.executeWithoutResult(status -> emails.findById(id).ifPresent(outcome));
	}

	private static String describe(RuntimeException ex) {
		String message = ex.getMessage();
		return message == null ? ex.getClass().getSimpleName() : ex.getClass().getSimpleName() + ": " + message;
	}

}
