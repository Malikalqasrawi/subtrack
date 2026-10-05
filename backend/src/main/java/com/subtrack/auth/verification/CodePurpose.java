package com.subtrack.auth.verification;

/** What an emailed code is for. Each purpose carries the wording of its own email. */
public enum CodePurpose {

	EMAIL_VERIFICATION("Your Subtrack verification code", "Use this code to confirm your email address:",
			"If you did not create a Subtrack account, you can ignore this email."),

	PASSWORD_RESET("Reset your Subtrack password", "Use this code to choose a new password:",
			"If you did not ask to reset your password, you can ignore this email. Your password has not changed."),

	EMAIL_CHANGE("Confirm your new Subtrack email", "Use this code to confirm this as your new email address:",
			"If you did not ask for this change, you can ignore this email."),
	ACCOUNT_CONFIRMATION("Confirm a change to your Subtrack account",
			"Use this code to confirm it is you making the change:",
			"If you did not ask for this, do not share the code: someone else may be signed in to your account.");

	private final String subject;

	private final String intro;

	private final String footer;

	CodePurpose(String subject, String intro, String footer) {
		this.subject = subject;
		this.intro = intro;
		this.footer = footer;
	}

	public String subject() {
		return subject;
	}

	/** No name in the greeting: these go to addresses nobody has confirmed yet. */
	public String emailBody(String code) {
		return """
				Hi,

				%s

				    %s

				The code expires in 15 minutes. %s
				""".formatted(intro, code, footer);
	}

}
