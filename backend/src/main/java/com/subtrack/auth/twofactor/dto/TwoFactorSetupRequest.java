package com.subtrack.auth.twofactor.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param currentPassword not needed for accounts that have no password yet
 * @param confirmationCode the emailed code those accounts send instead
 */
public record TwoFactorSetupRequest(@Size(max = 72) String currentPassword,
		@Pattern(regexp = "\\d{6}", message = "must be 6 digits") String confirmationCode) {
}
