package com.subtrack.mail;

/**
 * One attempt at getting an email out of the building: SMTP, the console, or a provider's API.
 * Only {@link EmailDispatcher} talks to it; an attempt that throws is retried later.
 */
public interface MailTransport {

	void send(EmailMessage message);

}
