package com.subtrack.user.dto;

import com.subtrack.user.User;
import java.util.UUID;

/**
 * @param hasPassword false for accounts created with Google or Apple that have not set a password
 */
public record UserResponse(UUID id, String email, String displayName, String phoneNumber, String defaultCurrency,
		boolean twoFactorEnabled, boolean hasPassword) {

	public static UserResponse from(User user) {
		return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getPhoneNumber(),
				user.getDefaultCurrency(), user.isTotpEnabled(), user.hasPassword());
	}

}
