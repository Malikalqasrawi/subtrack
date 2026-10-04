package com.subtrack.user;

/** Names are letters only, so nothing a person types as their name can carry a link into an email. */
public final class PersonNames {

	public static final String PATTERN = "[\\p{L}\\p{M}][\\p{L}\\p{M} '-]*";

	public static final String MESSAGE = "can only contain letters, spaces, apostrophes and hyphens";

	private PersonNames() {
	}

}
