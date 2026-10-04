package com.subtrack.auth.twofactor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** @param code a 6-digit authenticator code, or a recovery code */
public record TwoFactorCodeRequest(@NotBlank @Size(max = 20) String code) {
}
