package com.subtrack.subscription;

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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Entity
@Table(name = "subscriptions")
public class Subscription extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false, updatable = false)
	private User user;

	@Column(nullable = false, length = 100)
	private String name;

	@Column(nullable = false, precision = 12, scale = 2)
	private BigDecimal amount;

	@Column(nullable = false, length = 3)
	private String currency;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private BillingCycle billingCycle;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private Category category;

	@Column(nullable = false)
	private LocalDate firstBillingDate;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private SubscriptionStatus status;

	/** Days before a renewal to send a reminder; null means no reminders. */
	private Integer reminderDaysBefore;

	/** The renewal date the last reminder was sent for, so each renewal is announced once. */
	private LocalDate lastReminderFor;

	@Column(length = 500)
	private String notes;

	@Column(length = 255)
	private String websiteUrl;

	protected Subscription() {
	}

	public Subscription(User user, SubscriptionDetails details) {
		this.user = user;
		apply(details);
	}

	public void apply(SubscriptionDetails details) {
		this.name = details.name().trim();
		this.amount = details.amount();
		this.currency = details.currency();
		this.billingCycle = details.billingCycle();
		this.category = details.category();
		this.firstBillingDate = details.firstBillingDate();
		this.status = details.status();
		this.reminderDaysBefore = details.reminderDaysBefore();
		this.notes = details.notes();
		this.websiteUrl = details.websiteUrl();
		// The schedule may have changed, so the next renewal deserves a fresh reminder.
		this.lastReminderFor = null;
	}

	public boolean isActive() {
		return status == SubscriptionStatus.ACTIVE;
	}

	public LocalDate nextRenewal(LocalDate today) {
		return billingCycle.nextOccurrenceOnOrAfter(firstBillingDate, today);
	}

	public List<LocalDate> renewalsBetween(LocalDate from, LocalDate to) {
		return billingCycle.occurrencesBetween(firstBillingDate, from, to);
	}

	public BigDecimal monthlyCost() {
		return billingCycle.monthlyCost(amount);
	}

	public BigDecimal yearlyCost() {
		return billingCycle.yearlyCost(amount);
	}

	/** The upcoming renewal a reminder should go out for today, if any. */
	public Optional<LocalDate> renewalNeedingReminder(LocalDate today) {
		if (!isActive() || reminderDaysBefore == null) {
			return Optional.empty();
		}
		LocalDate next = nextRenewal(today);
		boolean withinWindow = ChronoUnit.DAYS.between(today, next) <= reminderDaysBefore;
		boolean alreadySent = next.equals(lastReminderFor);
		return withinWindow && !alreadySent ? Optional.of(next) : Optional.empty();
	}

	public void markReminderSent(LocalDate renewalDate) {
		this.lastReminderFor = renewalDate;
	}

	public User getUser() {
		return user;
	}

	public String getName() {
		return name;
	}

	public BigDecimal getAmount() {
		return amount;
	}

	public String getCurrency() {
		return currency;
	}

	public BillingCycle getBillingCycle() {
		return billingCycle;
	}

	public Category getCategory() {
		return category;
	}

	public LocalDate getFirstBillingDate() {
		return firstBillingDate;
	}

	public SubscriptionStatus getStatus() {
		return status;
	}

	public Integer getReminderDaysBefore() {
		return reminderDaysBefore;
	}

	public String getNotes() {
		return notes;
	}

	public String getWebsiteUrl() {
		return websiteUrl;
	}

}
