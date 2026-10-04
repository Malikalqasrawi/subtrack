package com.subtrack.auth.alert;

import com.subtrack.mail.EmailMessage;
import com.subtrack.mail.EmailSender;
import org.springframework.stereotype.Component;

@Component
public class SecurityAlertMailer {

	private final EmailSender emailSender;

	public SecurityAlertMailer(EmailSender emailSender) {
		this.emailSender = emailSender;
	}

	public void send(String toAddress, SecurityAlert alert) {
		emailSender.send(new EmailMessage(toAddress, alert.subject(), alert.emailBody()));
	}

}
