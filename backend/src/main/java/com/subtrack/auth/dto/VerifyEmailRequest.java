package com.subtrack.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record VerifyEmailRequest(@NotBlank @Size(max = 254) String email,
		@NotBlank @Size(max = 72) String password,
		@NotBlank @Pattern(regexp = "\\d{6}", message = "must be 6 digits") String code) {
}
