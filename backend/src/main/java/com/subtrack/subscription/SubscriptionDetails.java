package com.subtrack.subscription;

import java.math.BigDecimal;
import java.time.LocalDate;

/** The user-editable fields of a subscription, passed as one value instead of ten arguments. */
public record SubscriptionDetails(String name, BigDecimal amount, String currency, BillingCycle billingCycle,
		Category category, LocalDate firstBillingDate, SubscriptionStatus status, Integer reminderDaysBefore,
		String notes, String websiteUrl) {
}
