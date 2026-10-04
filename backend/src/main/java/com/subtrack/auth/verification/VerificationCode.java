package com.subtrack.auth.verification;

import com.subtrack.common.BaseEntity;
import com.subtrack.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "verification_codes")
public class VerificationCode extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(nullable = false, length = 100)
	private String codeHash;

	@Column(nullable = false)
	private Instant expiresAt;

	@Column(nullable = false)
	private int attempts;

	private Instant consumedAt;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private CodePurpose purpose;

	@Column(length = 254)
	private String target;

	protected VerificationCode() {
	}

	public VerificationCode(User user, CodePurpose purpose, String target, String codeHash, Instant expiresAt) {
		this.user = user;
		this.purpose = purpose;
		this.target = target;
		this.codeHash = codeHash;
		this.expiresAt = expiresAt;
	}

	public boolean isExpired(Instant now) {
		return consumedAt != null || !now.isBefore(expiresAt);
	}

	public void registerFailedAttempt() {
		attempts++;
	}

	public void consume(Instant now) {
		consumedAt = now;
	}

	public String getTarget() {
		return target;
	}

	public String getCodeHash() {
		return codeHash;
	}

	public int getAttempts() {
		return attempts;
	}

}
