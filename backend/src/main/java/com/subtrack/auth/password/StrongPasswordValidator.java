package com.subtrack.auth.password;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

	static final int MIN_LENGTH = 8;

	/** BCrypt reads at most 72 bytes; anything longer would be silently truncated. */
	static final int MAX_LENGTH = 72;

	@Override
	public boolean isValid(String password, ConstraintValidatorContext context) {
		if (password == null || password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
			return false;
		}
		boolean hasLetter = password.chars().anyMatch(Character::isLetter);
		boolean hasDigit = password.chars().anyMatch(Character::isDigit);
		boolean hasSpecial = password.chars().anyMatch(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c));
		return hasLetter && hasDigit && hasSpecial;
	}

}
