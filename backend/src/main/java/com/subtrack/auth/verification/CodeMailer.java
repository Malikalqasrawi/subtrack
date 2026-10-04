package com.subtrack.auth.verification;

import com.subtrack.mail.EmailMessage;
import com.subtrack.mail.EmailSender;
import com.subtrack.user.User;
import org.springframework.stereotype.Component;

/** Emails a code using the wording of its purpose. */
@Component
public class CodeMailer {

	private final EmailSender emailSender;

	public CodeMailer(EmailSender emailSender) {
		this.emailSender = emailSender;
	}

	public void send(User user, CodePurpose purpose, String code) {
		send(user.getEmail(), purpose, code);
	}

	public void send(String toAddress, CodePurpose purpose, String code) {
		emailSender.send(new EmailMessage(toAddress, purpose.subject(), purpose.emailBody(code)));
	}

}
