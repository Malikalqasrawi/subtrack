package com.subtrack.user.dto;

import com.subtrack.user.PhoneNumbers;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(@NotBlank @Size(max = 80) @Pattern(regexp = "[^\\p{Cntrl}]*", message = "must not contain line breaks") String displayName,
		@NotBlank @Pattern(regexp = PhoneNumbers.E164_PATTERN, message = PhoneNumbers.MESSAGE) String phoneNumber,
		@NotBlank @Pattern(regexp = "[A-Z]{3}", message = "must be a 3-letter currency code") String defaultCurrency) {
}
