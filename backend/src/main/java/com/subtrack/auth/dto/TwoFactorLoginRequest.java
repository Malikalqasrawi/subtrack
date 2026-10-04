package com.subtrack.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** @param code a 6-digit authenticator code, or a recovery code */
public record TwoFactorLoginRequest(@NotBlank @Size(max = 1000) String challengeToken,
		@NotBlank @Size(max = 20) String code) {
}
