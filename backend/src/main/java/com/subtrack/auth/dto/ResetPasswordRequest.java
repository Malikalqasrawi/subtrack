package com.subtrack.auth.dto;

import com.subtrack.auth.password.StrongPassword;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(@NotBlank @Size(max = 254) String email,
		@NotBlank @Pattern(regexp = "\\d{6}", message = "must be 6 digits") String code,
		@StrongPassword String newPassword) {
}
