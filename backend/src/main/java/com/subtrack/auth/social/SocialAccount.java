package com.subtrack.auth.social;

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

/** Links a Google or Apple identity to a Subtrack user. One user may have several. */
@Entity
@Table(name = "social_accounts")
public class SocialAccount extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private SocialProvider provider;

	@Column(nullable = false)
	private String subject;

	protected SocialAccount() {
	}

	public SocialAccount(User user, SocialProvider provider, String subject) {
		this.user = user;
		this.provider = provider;
		this.subject = subject;
	}

	public User getUser() {
		return user;
	}

}
