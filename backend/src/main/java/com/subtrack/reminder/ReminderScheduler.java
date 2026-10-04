package com.subtrack.reminder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.reminders.enabled", havingValue = "true")
public class ReminderScheduler {

	private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

	private final ReminderService reminderService;

	public ReminderScheduler(ReminderService reminderService) {
		this.reminderService = reminderService;
	}

	@Scheduled(cron = "${app.reminders.cron}")
	public void run() {
		int sent = reminderService.sendDueReminders();
		log.info("Renewal reminders sent: {}", sent);
	}

}
