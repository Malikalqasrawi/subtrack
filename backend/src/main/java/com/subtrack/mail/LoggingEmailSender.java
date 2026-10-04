package com.subtrack.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Prints emails to the console so local development needs no mail server. */
@Component
@ConditionalOnProperty(name = "app.mail.mode", havingValue = "log")
public class LoggingEmailSender implements EmailSender {

	private static final Logger log = LoggerFactory.getLogger(LoggingEmailSender.class);

	@Override
	public void send(EmailMessage message) {
		log.info("\n--- email to {} ---\nSubject: {}\n\n{}\n--- end ---", message.to(), message.subject(),
				message.body());
	}

}
