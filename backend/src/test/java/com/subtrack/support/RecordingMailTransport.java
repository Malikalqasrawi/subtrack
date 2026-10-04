package com.subtrack.support;

import com.subtrack.mail.EmailMessage;
import com.subtrack.mail.MailTransport;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.mail.MailSendException;
import org.springframework.stereotype.Component;

/**
 * Test double for {@link MailTransport}: keeps emails in memory so tests can read them, and can
 * play a mail server that is down.
 */
@Component
public class RecordingMailTransport implements MailTransport {

	private static final Pattern CODE = Pattern.compile("\\b(\\d{6})\\b");

	private final List<EmailMessage> sent = new CopyOnWriteArrayList<>();

	private volatile boolean down;

	@Override
	public void send(EmailMessage message) {
		if (down) {
			throw new MailSendException("Mail server is down");
		}
		sent.add(message);
	}

	/** While down, every attempt fails the way an unreachable mail server makes it fail. */
	public void setDown(boolean down) {
		this.down = down;
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
