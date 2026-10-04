package com.subtrack.auth.dto;

import com.subtrack.auth.password.StrongPassword;
import com.subtrack.user.PhoneNumbers;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(@NotBlank @Email @Size(max = 254) String email, @StrongPassword String password,
		@NotBlank @Size(max = 80) @Pattern(regexp = "[^\\p{Cntrl}]*", message = "must not contain line breaks") String displayName,
		@NotBlank @Pattern(regexp = PhoneNumbers.E164_PATTERN, message = PhoneNumbers.MESSAGE) String phoneNumber) {
}
