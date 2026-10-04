package com.subtrack.user;

import com.subtrack.common.error.BadRequestException;
import com.subtrack.common.error.ConflictException;
import com.subtrack.common.error.NotFoundException;
import com.subtrack.currency.CurrencyConverter;
import com.subtrack.user.dto.UpdateProfileRequest;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

	private final UserRepository users;

	private final CurrencyConverter currencyConverter;

	public UserService(UserRepository users, CurrencyConverter currencyConverter) {
		this.users = users;
		this.currencyConverter = currencyConverter;
	}

	@Transactional(readOnly = true)
	public User getById(UUID id) {
		return users.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
	}

	@Transactional
	public User updateProfile(UUID id, UpdateProfileRequest request) {
		if (!currencyConverter.isSupported(request.defaultCurrency())) {
			throw new BadRequestException("UNSUPPORTED_CURRENCY", "Unsupported currency: " + request.defaultCurrency());
		}
		User user = getById(id);
		user.updateProfile(request.displayName(), request.phoneNumber(), request.defaultCurrency());
		return user;
	}

	@Transactional
	public User markEmailVerified(UUID id) {
		User user = getById(id);
		user.markEmailVerified();
		return user;
	}

	/** Sets a password chosen through the emailed reset code, which also proves the email is theirs. */
	@Transactional
	public void resetPassword(UUID id, String passwordHash) {
		User user = getById(id);
		user.changePassword(passwordHash);
		user.markEmailVerified();
	}

	@Transactional
	public User changeEmail(UUID id, String newEmail) {
		requireEmailAvailable(newEmail);
		User user = getById(id);
		user.changeEmail(newEmail);
		return user;
	}

	public void requireEmailAvailable(String email) {
		if (users.findByEmail(User.normalizeEmail(email)).isPresent()) {
			throw new ConflictException("EMAIL_IN_USE", "That email address is already in use");
		}
	}

}
