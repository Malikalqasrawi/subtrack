package com.subtrack.mail;

/**
 * The only thing the rest of the application knows about email. Sending means handing the
 * message over: it is delivered in the background, and tried again if the mail server is down.
 */
public interface EmailSender {

	void send(EmailMessage message);

}
