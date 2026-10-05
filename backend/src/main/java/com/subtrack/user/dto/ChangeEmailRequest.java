package com.subtrack.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangeEmailRequest(@NotBlank @Email @Size(max = 254) String newEmail,
		@Size(max = 72) String currentPassword,
		@Pattern(regexp = "\\d{6}", message = "must be 6 digits") String confirmationCode) {
}
