package com.subtrack.subscription.dto;

import com.subtrack.subscription.BillingCycle;
import com.subtrack.subscription.Category;
import com.subtrack.subscription.SubscriptionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * @param nextRenewalDate null unless the subscription is active
 * @param monthlyCost the cost per month in the user's default currency
 */
public record SubscriptionResponse(UUID id, String name, BigDecimal amount, String currency,
		BillingCycle billingCycle, Category category, LocalDate firstBillingDate, LocalDate nextRenewalDate,
		SubscriptionStatus status, Integer reminderDaysBefore, String notes, String websiteUrl,
		BigDecimal monthlyCost, String displayCurrency) {
}
