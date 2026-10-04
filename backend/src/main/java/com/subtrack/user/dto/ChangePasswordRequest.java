package com.subtrack.user.dto;

import com.subtrack.auth.password.StrongPassword;
import jakarta.validation.constraints.Size;

/** @param currentPassword not needed for accounts that have no password yet */
public record ChangePasswordRequest(@Size(max = 72) String currentPassword, @StrongPassword String newPassword) {
}
