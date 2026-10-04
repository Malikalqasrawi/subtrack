package com.subtrack.insights.dto;

import com.subtrack.subscription.Category;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * One charge on one date.
 *
 * @param convertedAmount the amount in the user's default currency
 */
public record RenewalEntry(UUID subscriptionId, String name, Category category, LocalDate date, BigDecimal amount,
		String currency, BigDecimal convertedAmount) {
}
