package com.subtrack.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.subtrack.config.AppProperties;
import jakarta.mail.BodyPart;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpMailTransportTest {

	private final JavaMailSender mailSender = mock(JavaMailSender.class);

	private final SmtpMailTransport transport = new SmtpMailTransport(mailSender, new EmailLayout(), properties());

	@Test
	void everyEmailCarriesAPlainTextAndAnHtmlVersionOfTheSameMessage() throws Exception {
		when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

		transport.send(new EmailMessage("malik@example.com", "Your Subtrack verification code", """
				Hi,

				Use this code to confirm your email address:

				    482913
				"""));

		ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
		verify(mailSender).send(sent.capture());
		MimeMessage mail = sent.getValue();
		mail.saveChanges();

		InternetAddress from = (InternetAddress) mail.getFrom()[0];
		assertThat(from.getPersonal()).isEqualTo("Subtrack");
		assertThat(from.getAddress()).isEqualTo("no-reply@subtrack.local");
		assertThat(mail.getAllRecipients()).extracting(Object::toString).containsExactly("malik@example.com");
		assertThat(mail.getSubject()).isEqualTo("Your Subtrack verification code");

		Map<String, String> versions = new HashMap<>();
		collectText(mail, versions);
		assertThat(versions.get("text/plain")).contains("Use this code to confirm your email address:").contains("482913");
		assertThat(versions.get("text/html")).contains("<h1").contains(">482913</p>");
	}

	/** Walks the nested parts of the message and keeps each text part by its type. */
	private static void collectText(Part part, Map<String, String> versions) throws Exception {
		if (part.getContent() instanceof Multipart multipart) {
			for (int index = 0; index < multipart.getCount(); index++) {
				BodyPart child = multipart.getBodyPart(index);
				collectText(child, versions);
			}
			return;
		}
		if (part.isMimeType("text/plain")) {
			versions.put("text/plain", (String) part.getContent());
		}
		else if (part.isMimeType("text/html")) {
			versions.put("text/html", (String) part.getContent());
		}
	}

	private static AppProperties properties() {
		AppProperties.Mail mail = new AppProperties.Mail("Subtrack <no-reply@subtrack.local>", false, false,
				Duration.ofDays(7));
		return new AppProperties(false, null, null, null, null, mail, null, null, null, null, null);
	}

}
