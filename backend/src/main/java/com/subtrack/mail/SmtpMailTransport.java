package com.subtrack.mail;

import com.subtrack.config.AppProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.mail.mode", havingValue = "smtp")
public class SmtpMailTransport implements MailTransport {

	private final JavaMailSender mailSender;

	private final EmailLayout layout;

	private final String from;

	public SmtpMailTransport(JavaMailSender mailSender, EmailLayout layout, AppProperties properties) {
		this.mailSender = mailSender;
		this.layout = layout;
		this.from = properties.mail().from();
	}

	@Override
	public void send(EmailMessage message) {
		MimeMessage mail = mailSender.createMimeMessage();
		try {
			MimeMessageHelper helper = new MimeMessageHelper(mail, true, StandardCharsets.UTF_8.name());
			helper.setFrom(from);
			helper.setTo(message.to());
			helper.setSubject(message.subject());
			// Both versions travel together: mail apps show the HTML and fall back to the text.
			helper.setText(message.body(), layout.html(message.subject(), message.body()));
		}
		catch (MessagingException ex) {
			throw new MailPreparationException("Could not build the email", ex);
		}
		mailSender.send(mail);
	}

}
