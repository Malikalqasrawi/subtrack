package com.subtrack.auth.verification;

import com.subtrack.mail.EmailMessage;
import com.subtrack.mail.EmailSender;
import com.subtrack.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.stereotype.Component;

/** Emails a code using the wording of its purpose. */
@Component
public class CodeMailer {

	private static final Logger log = LoggerFactory.getLogger(CodeMailer.class);

	private final EmailSender emailSender;

	private final TaskExecutor mailExecutor;

	public CodeMailer(EmailSender emailSender, TaskExecutor mailExecutor) {
		this.emailSender = emailSender;
		this.mailExecutor = mailExecutor;
	}

	public void send(User user, CodePurpose purpose, String code) {
		send(user.getEmail(), purpose, code);
	}

	public void send(String toAddress, CodePurpose purpose, String code) {
		EmailMessage message = new EmailMessage(toAddress, purpose.subject(), purpose.emailBody(code));
		try {
			mailExecutor.execute(() -> deliver(message, purpose));
		}
		catch (TaskRejectedException ex) {
			log.error("Mail queue is full, dropped {} email", purpose);
		}
	}

	private void deliver(EmailMessage message, CodePurpose purpose) {
		try {
			emailSender.send(message);
		}
		catch (RuntimeException ex) {
			// The user can ask for the code again; failing here would reveal which emails exist.
			log.error("Could not send {} email", purpose, ex);
		}
	}

}
