package com.subtrack.user;

import com.subtrack.auth.AuthSession;
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
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sensitive changes to an account. Each one asks for the current password first. */
@Service
public class AccountService {

	private final UserRepository users;

	private final UserService userService;

	private final PasswordEncoder passwordEncoder;

	private final VerificationService verificationService;

	private final CodeMailer codeMailer;

	private final SessionService sessions;

	private final SecurityAlertMailer alerts;

	public AccountService(UserRepository users, UserService userService, PasswordEncoder passwordEncoder,
			VerificationService verificationService, CodeMailer codeMailer, SessionService sessions,
			SecurityAlertMailer alerts) {
		this.users = users;
		this.userService = userService;
		this.passwordEncoder = passwordEncoder;
		this.verificationService = verificationService;
		this.codeMailer = codeMailer;
		this.sessions = sessions;
		this.alerts = alerts;
	}

	/** For sensitive steps handled outside this class, such as starting two-factor setup. */
	@Transactional(readOnly = true)
	public void confirmPassword(UUID userId, String currentPassword) {
		requireCurrentPassword(userService.getById(userId), currentPassword);
	}

	/** Changes the password, signs out every other device, and returns a fresh session for this one. */
	@Transactional
	public AuthSession changePassword(UUID userId, String currentPassword, String newPassword) {
		User user = userService.getById(userId);
		requireCurrentPassword(user, currentPassword);
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
	public void requestEmailChange(UUID userId, String newEmail, String currentPassword) {
		User user = userService.getById(userId);
		requireCurrentPassword(user, currentPassword);
		String normalized = User.normalizeEmail(newEmail);
		if (normalized.equals(user.getEmail())) {
			throw new BadRequestException("SAME_EMAIL", "That is already your email address");
		}
		userService.requireEmailAvailable(normalized);
		String code = verificationService.issueCode(user, CodePurpose.EMAIL_CHANGE, normalized)
			.orElseThrow(() -> new TooManyRequestsException("Wait a minute before requesting another code"));
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
	public void deleteAccount(UUID userId, String currentPassword) {
		User user = userService.getById(userId);
		requireCurrentPassword(user, currentPassword);
		users.delete(user);
	}

	/** Accounts created with Google or Apple have no password to ask for until they set one. */
	private void requireCurrentPassword(User user, String currentPassword) {
		if (!user.hasPassword()) {
			return;
		}
		if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
			throw new ForbiddenException("WRONG_PASSWORD", "Your current password is incorrect");
		}
	}

}
