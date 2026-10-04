package com.subtrack.auth.twofactor.dto;

import jakarta.validation.constraints.Size;

/** @param currentPassword not needed for accounts that have no password yet */
public record TwoFactorSetupRequest(@Size(max = 72) String currentPassword) {
}
