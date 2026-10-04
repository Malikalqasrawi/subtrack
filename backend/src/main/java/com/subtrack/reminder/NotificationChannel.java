package com.subtrack.reminder;

/**
 * A way of delivering a reminder. Every bean implementing this interface is used
 * automatically, so a new channel (push, SMS, Telegram...) is a new class and nothing else.
 */
public interface NotificationChannel {

	void send(RenewalReminder reminder);

}
