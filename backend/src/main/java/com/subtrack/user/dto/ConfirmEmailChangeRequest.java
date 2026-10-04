package com.subtrack.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ConfirmEmailChangeRequest(
		@NotBlank @Pattern(regexp = "\\d{6}", message = "must be 6 digits") String code) {
}
