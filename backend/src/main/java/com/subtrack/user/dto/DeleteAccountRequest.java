package com.subtrack.user.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DeleteAccountRequest(@Size(max = 72) String currentPassword,
		@Pattern(regexp = "\\d{6}", message = "must be 6 digits") String confirmationCode) {
}
