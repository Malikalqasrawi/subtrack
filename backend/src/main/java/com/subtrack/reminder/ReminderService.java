package com.subtrack.reminder;

import com.subtrack.subscription.Subscription;
import com.subtrack.subscription.SubscriptionRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReminderService {

	private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

	private final SubscriptionRepository subscriptions;

	private final List<NotificationChannel> channels;

	private final Clock clock;

	public ReminderService(SubscriptionRepository subscriptions, List<NotificationChannel> channels, Clock clock) {
		this.subscriptions = subscriptions;
		this.channels = channels;
		this.clock = clock;
	}

	/** Sends one reminder per upcoming renewal and returns how many were sent. */
	@Transactional
	public int sendDueReminders() {
		LocalDate today = LocalDate.now(clock);
		int sent = 0;
		for (Subscription subscription : subscriptions.findActiveWithRemindersEnabled()) {
			LocalDate renewal = subscription.renewalNeedingReminder(today).orElse(null);
			if (renewal == null) {
				continue;
			}
			try {
				RenewalReminder reminder = new RenewalReminder(subscription.getUser().getEmail(),
						subscription.getUser().getDisplayName(), subscription.getName(), subscription.getAmount(),
						subscription.getCurrency(), renewal, ChronoUnit.DAYS.between(today, renewal));
				channels.forEach(channel -> channel.send(reminder));
				subscription.markReminderSent(renewal);
				sent++;
			}
			catch (RuntimeException ex) {
				// Left unmarked so the next run retries; one failure must not stop the rest.
				log.error("Could not send reminder for subscription {}", subscription.getId(), ex);
			}
		}
		return sent;
	}

}
