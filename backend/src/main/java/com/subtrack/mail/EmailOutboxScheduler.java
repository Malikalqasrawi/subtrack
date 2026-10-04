package com.subtrack.mail;

import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Runs the outbox jobs on a timer. Switched off in tests, which call the dispatcher themselves. */
@Component
@ConditionalOnProperty(name = "app.mail.jobs", havingValue = "true")
public class EmailOutboxScheduler {

	private static final Logger log = LoggerFactory.getLogger(EmailOutboxScheduler.class);

	private final EmailDispatcher dispatcher;

	public EmailOutboxScheduler(EmailDispatcher dispatcher) {
		this.dispatcher = dispatcher;
	}

	/** Retries, and emails left unsent by a restart. On the mail threads, so a slow mail server holds up no other job. */
	@Scheduled(initialDelay = 1, fixedDelay = 1, timeUnit = TimeUnit.MINUTES)
	public void sendDueEmails() {
		dispatcher.inBackground(dispatcher::sendDue);
	}

	@Scheduled(initialDelay = 30, fixedDelay = 24 * 60, timeUnit = TimeUnit.MINUTES)
	public void deleteOldEmails() {
		int deleted = dispatcher.deleteOld();
		if (deleted > 0) {
			log.info("Deleted {} old email(s) from the outbox", deleted);
		}
	}

}
