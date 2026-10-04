package com.subtrack.support;

import com.subtrack.mail.EmailMessage;
import com.subtrack.mail.EmailSender;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Test double for {@link EmailSender}: keeps emails in memory so tests can read them. */
@Component
public class RecordingEmailSender implements EmailSender {

	private static final Pattern CODE = Pattern.compile("\\b(\\d{6})\\b");

	private final List<EmailMessage> sent = new CopyOnWriteArrayList<>();

	@Override
	public void send(EmailMessage message) {
		sent.add(message);
	}

	public List<EmailMessage> sentTo(String email) {
		return sent.stream().filter(message -> message.to().equals(email)).toList();
	}

	public String lastCodeFor(String email) {
		List<EmailMessage> messages = sentTo(email);
		Matcher matcher = CODE.matcher(messages.get(messages.size() - 1).body());
		if (!matcher.find()) {
			throw new AssertionError("No code in the last email to " + email);
		}
		return matcher.group(1);
	}

}
