package com.subtrack.mail;

import com.subtrack.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * An email on its way out. It is saved in the same transaction as the change that caused it,
 * so nothing is emailed about a change that was rolled back, and an email is not lost when the
 * mail server is down: it waits here and is tried again.
 */
@Entity
@Table(name = "outgoing_emails")
public class OutgoingEmail extends BaseEntity {

	static final int MAX_BODY_LENGTH = 4000;

	private static final int MAX_ERROR_LENGTH = 500;

	@Column(nullable = false, length = 254)
	private String recipient;

	@Column(nullable = false, length = 200)
	private String subject;

	/** Encrypted. Null once the email has been sent or given up on. */
	@Column(length = MAX_BODY_LENGTH)
	private String body;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private EmailStatus status = EmailStatus.PENDING;

	@Column(nullable = false)
	private int attempts;

	@Column(nullable = false)
	private Instant nextAttemptAt;

	@Column(length = MAX_ERROR_LENGTH)
	private String lastError;

	private Instant sentAt;

	protected OutgoingEmail() {
	}

	/** @param sealedBody the body, already encrypted */
	public OutgoingEmail(String recipient, String subject, String sealedBody, Instant now) {
		this.recipient = recipient;
		this.subject = subject;
		this.body = sealedBody;
		this.nextAttemptAt = now;
	}

	public void markSent(Instant now) {
		status = EmailStatus.SENT;
		sentAt = now;
		lastError = null;
		body = null;
	}

	/**
	 * Schedules the next try after the attempt that just failed, or gives up when every delay
	 * has been used.
	 *
	 * @param retryDelays the wait after the first failure, the second, and so on
	 */
	public void attemptFailed(String error, Instant now, List<Duration> retryDelays) {
		lastError = error.length() <= MAX_ERROR_LENGTH ? error : error.substring(0, MAX_ERROR_LENGTH);
		if (attempts <= retryDelays.size()) {
			nextAttemptAt = now.plus(retryDelays.get(attempts - 1));
			return;
		}
		status = EmailStatus.FAILED;
		body = null;
	}

	public String getRecipient() {
		return recipient;
	}

	public String getSubject() {
		return subject;
	}

	public String getBody() {
		return body;
	}

	public EmailStatus getStatus() {
		return status;
	}

	public int getAttempts() {
		return attempts;
	}

	public Instant getNextAttemptAt() {
		return nextAttemptAt;
	}

	public String getLastError() {
		return lastError;
	}

	public Instant getSentAt() {
		return sentAt;
	}

}
