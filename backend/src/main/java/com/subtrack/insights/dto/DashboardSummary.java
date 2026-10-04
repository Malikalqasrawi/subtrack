package com.subtrack.insights.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** All money totals are in {@code currency}, the user's default currency. */
public record DashboardSummary(String currency, BigDecimal monthlyTotal, BigDecimal yearlyTotal, int activeCount,
		List<CategorySpend> byCategory, List<RenewalEntry> upcoming, List<MonthlyProjection> projection,
		Instant ratesAsOf) {
}
