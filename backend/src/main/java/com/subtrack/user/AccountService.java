package com.subtrack.user;

import com.subtrack.auth.AuthSession;
import com.subtrack.auth.ExistingAccountNotice;
import com.subtrack.auth.alert.SecurityAlert;
import com.subtrack.auth.alert.SecurityAlertMailer;
import com.subtrack.auth.session.SessionService;
import com.subtrack.auth.verification.CodeMailer;
import com.subtrack.auth.verification.CodePurpose;
import com.subtrack.auth.verification.VerificationResult;
import com.subtrack.auth.verification.VerificationService;
import com.subtrack.common.error.BadRequestException;
import com.subtrack.common.error.ForbiddenException;
import com.subtrack.common.error.TooManyRequestsException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sensitive changes to an account. Each one first asks for proof that the owner is making it. */
@Service
public class AccountService {

	private final UserRepository users;

	private final UserService userService;

	private final PasswordEncoder passwordEncoder;

	private final VerificationService verificationService;

	private final CodeMailer codeMailer;

	private final SessionService sessions;

	private final SecurityAlertMailer alerts;

	private final ExistingAccountNotice existingAccountNotice;

	public AccountService(UserRepository users, UserService userService, PasswordEncoder passwordEncoder,
			VerificationService verificationService, CodeMailer codeMailer, SessionService sessions,
			SecurityAlertMailer alerts, ExistingAccountNotice existingAccountNotice) {
		this.users = users;
		this.userService = userService;
		this.passwordEncoder = passwordEncoder;
		this.verificationService = verificationService;
		this.codeMailer = codeMailer;
		this.sessions = sessions;
		this.alerts = alerts;
		this.existingAccountNotice = existingAccountNotice;
	}

	/** For sensitive steps handled outside this class, such as starting two-factor setup. */
	@Transactional(readOnly = true)
	public void confirmOwner(UUID userId, String currentPassword, String confirmationCode) {
		requireOwner(userService.getById(userId), currentPassword, confirmationCode);
	}

	/** Emails the code that stands in for the password on accounts that have none. */
	@Transactional
	public void sendConfirmationCode(UUID userId) {
		User user = userService.getById(userId);
		if (user.hasPassword()) {
			throw new BadRequestException("PASSWORD_REQUIRED", "Confirm this change with your password");
		}
		String code = verificationService.issueCode(user, CodePurpose.ACCOUNT_CONFIRMATION)
			.orElseThrow(() -> new TooManyRequestsException("Wait a minute before requesting another code"));
		codeMailer.send(user, CodePurpose.ACCOUNT_CONFIRMATION, code);
	}

	/** Changes the password, signs out every other device, and returns a fresh session for this one. */
	@Transactional
	public AuthSession changePassword(UUID userId, String currentPassword, String confirmationCode,
			String newPassword) {
		User user = userService.getById(userId);
		requireOwner(user, currentPassword, confirmationCode);
		user.changePassword(passwordEncoder.encode(newPassword));
		sessions.endAll(userId);
		alerts.send(user.getEmail(), SecurityAlert.PASSWORD_CHANGED);
		return sessions.open(user);
	}

	/** Ends every session on every device, including this one. */
	@Transactional
	public void logoutEverywhere(UUID userId) {
		userService.getById(userId).endAllSessions();
		sessions.endAll(userId);
	}

	/** Emails a code to the new address. The email only changes once that code is confirmed. */
	@Transactional
	public void requestEmailChange(UUID userId, String newEmail, String currentPassword, String confirmationCode) {
		User user = userService.getById(userId);
		requireOwner(user, currentPassword, confirmationCode);
		String normalized = User.normalizeEmail(newEmail);
		if (normalized.equals(user.getEmail())) {
			throw new BadRequestException("SAME_EMAIL", "That is already your email address");
		}
		String code = verificationService.issueCode(user, CodePurpose.EMAIL_CHANGE, normalized)
			.orElseThrow(() -> new TooManyRequestsException("Wait a minute before requesting another code"));
		Optional<User> owner = users.findByEmail(normalized).filter(User::isEmailVerified);
		if (owner.isPresent()) {
			// The address is someone's account, so the code is not sent. The request is answered and
			// counted like any other, or it would show who has an account. The owner is told instead.
			existingAccountNotice.send(owner.get());
			return;
		}
		codeMailer.send(normalized, CodePurpose.EMAIL_CHANGE, code);
	}

	public User confirmEmailChange(UUID userId, String code) {
		User user = userService.getById(userId);
		String previousEmail = user.getEmail();
		VerificationResult result = verificationService.verify(user, CodePurpose.EMAIL_CHANGE, code)
			.requireVerified();
		User updated = userService.changeEmail(userId, result.target());
		alerts.send(previousEmail, SecurityAlert.EMAIL_CHANGED);
		return updated;
	}

	/** Permanently removes the user. The database deletes everything that belongs to them with it. */
	@Transactional
	public void deleteAccount(UUID userId, String currentPassword, String confirmationCode) {
		User user = userService.getById(userId);
		requireOwner(user, currentPassword, confirmationCode);
		users.delete(user);
	}

	/**
	 * Accounts created with Google or Apple have no password to ask for until they set one.
	 * They prove who they are with a code emailed to the account's address instead.
	 */
	private void requireOwner(User user, String currentPassword, String confirmationCode) {
		if (!user.hasPassword()) {
			if (confirmationCode == null) {
				throw new ForbiddenException("CONFIRMATION_REQUIRED", "Enter the code we emailed you");
			}
			verificationService.verify(user, CodePurpose.ACCOUNT_CONFIRMATION, confirmationCode).requireVerified();
			return;
		}
		if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
			throw new ForbiddenException("WRONG_PASSWORD", "Your current password is incorrect");
		}
	}

}
