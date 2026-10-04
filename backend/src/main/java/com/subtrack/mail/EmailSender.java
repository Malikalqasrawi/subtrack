package com.subtrack.mail;

/**
 * The only thing the rest of the application knows about email. Callers never depend on
 * SMTP, so the transport can be swapped (console, SMTP, a provider API) through configuration.
 */
public interface EmailSender {

	void send(EmailMessage message);

}
