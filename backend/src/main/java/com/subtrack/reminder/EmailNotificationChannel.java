package com.subtrack.reminder;

import com.subtrack.mail.EmailMessage;
import com.subtrack.mail.EmailSender;
import org.springframework.stereotype.Component;

@Component
public class EmailNotificationChannel implements NotificationChannel {

	private final EmailSender emailSender;

	public EmailNotificationChannel(EmailSender emailSender) {
		this.emailSender = emailSender;
	}

	@Override
	public void send(RenewalReminder reminder) {
		String when = switch ((int) reminder.daysUntilRenewal()) {
			case 0 -> "today";
			case 1 -> "tomorrow";
			default -> "in " + reminder.daysUntilRenewal() + " days";
		};
		String subject = "%s renews %s".formatted(reminder.subscriptionName(), when);
		String body = """
				Hi %s,

				Your %s subscription renews %s (%s) for %s %s.

				If you no longer need it, now is a good time to cancel.
				""".formatted(reminder.recipientName(), reminder.subscriptionName(), when, reminder.renewalDate(),
				reminder.amount().toPlainString(), reminder.currency());
		emailSender.send(new EmailMessage(reminder.recipientEmail(), subject, body));
	}

}
