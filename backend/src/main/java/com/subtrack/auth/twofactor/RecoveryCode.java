package com.subtrack.auth.twofactor;

import com.subtrack.common.BaseEntity;
import com.subtrack.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;

/** A single-use code that stands in for the authenticator app when the user has lost it. */
@Entity
@Table(name = "recovery_codes")
public class RecoveryCode extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(nullable = false, length = 64)
	private String codeHash;

	private Instant usedAt;

	protected RecoveryCode() {
	}

	public RecoveryCode(User user, String codeHash) {
		this.user = user;
		this.codeHash = codeHash;
	}

	public void markUsed(Instant now) {
		this.usedAt = now;
	}

}
