package com.subtrack.user.dto;

import com.subtrack.auth.password.StrongPassword;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * @param currentPassword not needed for accounts that have no password yet
 * @param confirmationCode the emailed code those accounts send instead
 */
public record ChangePasswordRequest(@Size(max = 72) String currentPassword, @StrongPassword String newPassword,
		@Pattern(regexp = "\\d{6}", message = "must be 6 digits") String confirmationCode) {
}
