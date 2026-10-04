package com.subtrack.auth.alert;

/** A change to an account that its owner is told about by email. */
public enum SecurityAlert {

	PASSWORD_CHANGED("Your Subtrack password was changed", "The password on your Subtrack account was just changed."),

	EMAIL_CHANGED("Your Subtrack email address was changed",
			"The email address on your Subtrack account was just changed, so this address no longer signs in."),

	TWO_FACTOR_ENABLED("Two-factor authentication is on",
			"Two-factor authentication was just turned on for your Subtrack account."),

	TWO_FACTOR_DISABLED("Two-factor authentication is off",
			"Two-factor authentication was just turned off for your Subtrack account.");

	private final String subject;

	private final String message;

	SecurityAlert(String subject, String message) {
		this.subject = subject;
		this.message = message;
	}

	public String subject() {
		return subject;
	}

	public String emailBody() {
		return """
				Hi,

				%s

				If this was you, there is nothing to do. If it was not, reset your password from the sign-in page straight away.
				""".formatted(message);
	}

}
