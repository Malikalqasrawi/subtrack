package com.subtrack.user;

public final class PhoneNumbers {

	/** International format: a plus sign, country code, then the number, 8 to 15 digits in total. */
	public static final String E164_PATTERN = "\\+[1-9]\\d{7,14}";

	public static final String MESSAGE = "must be in international format, for example +962791234567";

	private PhoneNumbers() {
	}

}
