package com.subtrack.auth.verification;

import com.subtrack.common.error.BadRequestException;
import com.subtrack.common.error.TooManyRequestsException;

/**
 * @param target for an email change, the address the code was sent to; otherwise null
 */
public record VerificationResult(VerificationOutcome outcome, String target) {

	static VerificationResult of(VerificationOutcome outcome) {
		return new VerificationResult(outcome, null);
	}

	/** Turns any failed outcome into the error the API reports for it. */
	public VerificationResult requireVerified() {
		return switch (outcome) {
			case VERIFIED -> this;
			case TOO_MANY_ATTEMPTS -> throw new BadRequestException("TOO_MANY_ATTEMPTS",
					"Too many wrong attempts. Request a new code.");
			case LOCKED -> throw new TooManyRequestsException("Too many attempts. Try again in an hour.");
			case INVALID, EXPIRED -> throw new BadRequestException("INVALID_CODE", "That code is invalid or has expired");
		};
	}

	/**
	 * The same, with one answer for every kind of wrong code. For requests anyone can send:
	 * "expired" or "too many attempts" would tell them that the email has an account.
	 */
	public VerificationResult requireVerifiedWithoutDetails() {
		return switch (outcome) {
			case VERIFIED -> this;
			case LOCKED -> throw new TooManyRequestsException("Too many attempts. Try again in an hour.");
			case INVALID, EXPIRED, TOO_MANY_ATTEMPTS ->
				throw new BadRequestException("INVALID_CODE", "That code is invalid or has expired");
		};
	}

}
