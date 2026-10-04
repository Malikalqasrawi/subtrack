package com.subtrack.auth.alert;

import com.subtrack.mail.EmailMessage;
import com.subtrack.mail.EmailSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Component;

@Component
public class SecurityAlertMailer {

	private static final Logger log = LoggerFactory.getLogger(SecurityAlertMailer.class);

	private final EmailSender emailSender;

	private final TaskExecutor mailExecutor;

	public SecurityAlertMailer(EmailSender emailSender, TaskExecutor mailExecutor) {
		this.emailSender = emailSender;
		this.mailExecutor = mailExecutor;
	}

	public void send(String toAddress, SecurityAlert alert) {
		EmailMessage message = new EmailMessage(toAddress, alert.subject(), alert.emailBody());
		try {
			mailExecutor.execute(() -> deliver(message, alert));
		}
		catch (TaskRejectedException ex) {
			log.error("Mail queue is full, dropped {} alert", alert);
		}
	}

	private void deliver(EmailMessage message, SecurityAlert alert) {
		try {
			emailSender.send(message);
		}
		catch (RuntimeException ex) {
			log.error("Could not send {} alert", alert, ex);
		}
	}

}
