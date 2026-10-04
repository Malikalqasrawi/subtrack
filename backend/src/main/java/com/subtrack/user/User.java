package com.subtrack.user;

import com.subtrack.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

	@Column(nullable = false, unique = true, length = 254)
	private String email;

	@Column(nullable = false, length = 100)
	private String passwordHash;

	@Column(nullable = false, length = 80)
	private String displayName;

	@Column(nullable = false)
	private boolean emailVerified;

	@Column(nullable = false, length = 3)
	private String defaultCurrency;

	@Column(length = 20)
	private String phoneNumber;

	/** False for accounts created through Google or Apple that never chose a password. */
	@Column(nullable = false)
	private boolean hasPassword = true;

	@Column(length = 64)
	private String totpSecret;

	@Column(nullable = false)
	private boolean totpEnabled;

	/** The time step of the last accepted authenticator code, so a code cannot be used twice. */
	private Long totpLastStep;

	protected User() {
	}

	public User(String email, String passwordHash, String displayName, String phoneNumber, String defaultCurrency) {
		this.email = normalizeEmail(email);
		this.passwordHash = passwordHash;
		this.displayName = displayName.trim();
		this.phoneNumber = phoneNumber;
		this.defaultCurrency = defaultCurrency;
	}

	/**
	 * An account created by signing in with Google or Apple. The provider has already confirmed
	 * the email, and the stored hash is of a random value nobody knows.
	 */
	public static User fromSocialSignIn(String email, String unusablePasswordHash, String displayName,
			String defaultCurrency) {
		User user = new User(email, unusablePasswordHash, displayName, null, defaultCurrency);
		user.hasPassword = false;
		user.emailVerified = true;
		return user;
	}

	public static String normalizeEmail(String email) {
		return email.trim().toLowerCase();
	}

	public void markEmailVerified() {
		this.emailVerified = true;
	}

	/** Replaces the credentials of an account whose email was never verified. */
	public void resetRegistration(String passwordHash, String displayName, String phoneNumber) {
		if (emailVerified) {
			throw new IllegalStateException("A verified account cannot be re-registered");
		}
		this.passwordHash = passwordHash;
		this.displayName = displayName.trim();
		this.phoneNumber = phoneNumber;
	}

	/**
	 * Hands an unverified account to someone who proved they own the email through Google or
	 * Apple. Whatever password an earlier, unconfirmed sign-up set stops working.
	 */
	public void claimThroughSocialSignIn(String unusablePasswordHash) {
		if (emailVerified) {
			throw new IllegalStateException("A verified account cannot be claimed");
		}
		this.passwordHash = unusablePasswordHash;
		this.hasPassword = false;
		this.emailVerified = true;
	}

	public void updateProfile(String displayName, String phoneNumber, String defaultCurrency) {
		this.displayName = displayName.trim();
		this.phoneNumber = phoneNumber;
		this.defaultCurrency = defaultCurrency;
	}

	public void changePassword(String passwordHash) {
		this.passwordHash = passwordHash;
		this.hasPassword = true;
	}

	public void changeEmail(String email) {
		this.email = normalizeEmail(email);
	}

	/** Stores a new authenticator secret; two-factor stays off until a code confirms it. */
	public void beginTotpSetup(String secret) {
		if (totpEnabled) {
			throw new IllegalStateException("Two-factor authentication is already on");
		}
		this.totpSecret = secret;
	}

	public void enableTotp(long confirmedStep) {
		if (totpSecret == null) {
			throw new IllegalStateException("Two-factor setup has not been started");
		}
		this.totpEnabled = true;
		this.totpLastStep = confirmedStep;
	}

	public void disableTotp() {
		this.totpEnabled = false;
		this.totpSecret = null;
		this.totpLastStep = null;
	}

	/** Accepts a time step only if it is newer than the last one used. */
	public boolean acceptTotpStep(long step) {
		if (totpLastStep != null && step <= totpLastStep) {
			return false;
		}
		this.totpLastStep = step;
		return true;
	}

	public String getEmail() {
		return email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public String getDisplayName() {
		return displayName;
	}

	public boolean isEmailVerified() {
		return emailVerified;
	}

	public String getDefaultCurrency() {
		return defaultCurrency;
	}

	public String getPhoneNumber() {
		return phoneNumber;
	}

	public boolean hasPassword() {
		return hasPassword;
	}

	public String getTotpSecret() {
		return totpSecret;
	}

	public boolean isTotpEnabled() {
		return totpEnabled;
	}

}
