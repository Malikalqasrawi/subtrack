package com.subtrack.auth.password;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class StrongPasswordValidatorTest {

	private final StrongPasswordValidator validator = new StrongPasswordValidator();

	@ParameterizedTest
	@ValueSource(strings = { "abc123!@", "Correct-horse-1", "pässwört_9", "1234567a#" })
	void acceptsPasswordsWithALetterANumberAndASpecialCharacter(String password) {
		assertThat(validator.isValid(password, null)).isTrue();
	}

	@ParameterizedTest
	@ValueSource(strings = { "a1!", "abcdefgh!", "12345678!", "abcd1234", "abcd 1234", "" })
	void rejectsPasswordsMissingARequirement(String password) {
		assertThat(validator.isValid(password, null)).isFalse();
	}

	@ParameterizedTest
	@ValueSource(ints = { 73, 200 })
	void rejectsPasswordsLongerThanBcryptReads(int length) {
		assertThat(validator.isValid("a1!" + "x".repeat(length - 3), null)).isFalse();
	}

}
