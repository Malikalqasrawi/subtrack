package com.subtrack.mail;

public enum EmailStatus {

	/** Waiting for its first attempt, or for the next one after a failure. */
	PENDING,

	SENT,

	/** Given up on after the last retry. */
	FAILED

}
