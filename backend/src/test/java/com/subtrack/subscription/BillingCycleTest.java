package com.subtrack.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class BillingCycleTest {

	@Test
	void nextOccurrenceIsTheAnchorWhenItIsStillInTheFuture() {
		LocalDate anchor = LocalDate.of(2026, 12, 1);
		assertThat(BillingCycle.MONTHLY.nextOccurrenceOnOrAfter(anchor, LocalDate.of(2026, 10, 3))).isEqualTo(anchor);
	}

	@Test
	void aRenewalFallingTodayCountsAsNext() {
		LocalDate anchor = LocalDate.of(2026, 1, 15);
		LocalDate today = LocalDate.of(2026, 10, 15);
		assertThat(BillingCycle.MONTHLY.nextOccurrenceOnOrAfter(anchor, today)).isEqualTo(today);
	}

	@Test
	void monthlyOnThe31stClampsToShortMonthsAndReturnsToThe31st() {
		LocalDate anchor = LocalDate.of(2026, 1, 31);
		assertThat(BillingCycle.MONTHLY.nextOccurrenceOnOrAfter(anchor, LocalDate.of(2026, 2, 1)))
			.isEqualTo(LocalDate.of(2026, 2, 28));
		assertThat(BillingCycle.MONTHLY.nextOccurrenceOnOrAfter(anchor, LocalDate.of(2026, 3, 1)))
			.isEqualTo(LocalDate.of(2026, 3, 31));
	}

	@Test
	void eachCycleAdvancesByItsOwnPeriod() {
		LocalDate anchor = LocalDate.of(2026, 1, 10);
		LocalDate dayAfter = anchor.plusDays(1);
		assertThat(BillingCycle.WEEKLY.nextOccurrenceOnOrAfter(anchor, dayAfter)).isEqualTo(LocalDate.of(2026, 1, 17));
		assertThat(BillingCycle.MONTHLY.nextOccurrenceOnOrAfter(anchor, dayAfter)).isEqualTo(LocalDate.of(2026, 2, 10));
		assertThat(BillingCycle.QUARTERLY.nextOccurrenceOnOrAfter(anchor, dayAfter))
			.isEqualTo(LocalDate.of(2026, 4, 10));
		assertThat(BillingCycle.YEARLY.nextOccurrenceOnOrAfter(anchor, dayAfter)).isEqualTo(LocalDate.of(2027, 1, 10));
	}

	@Test
	void occurrencesBetweenIncludesBothEnds() {
		LocalDate anchor = LocalDate.of(2026, 10, 1);
		assertThat(BillingCycle.WEEKLY.occurrencesBetween(anchor, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 29)))
			.containsExactly(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 8), LocalDate.of(2026, 10, 15),
					LocalDate.of(2026, 10, 22), LocalDate.of(2026, 10, 29));
	}

	@Test
	void occurrencesBetweenIsEmptyWhenNoChargeFallsInRange() {
		LocalDate anchor = LocalDate.of(2026, 3, 5);
		assertThat(BillingCycle.YEARLY.occurrencesBetween(anchor, LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31)))
			.isEmpty();
	}

	@Test
	void costsAreNormalisedPerMonthAndPerYear() {
		assertThat(BillingCycle.YEARLY.monthlyCost(new BigDecimal("120.00"))).isEqualByComparingTo("10.00");
		assertThat(BillingCycle.QUARTERLY.monthlyCost(new BigDecimal("30.00"))).isEqualByComparingTo("10.00");
		assertThat(BillingCycle.MONTHLY.yearlyCost(new BigDecimal("9.99"))).isEqualByComparingTo("119.88");
		assertThat(BillingCycle.WEEKLY.yearlyCost(new BigDecimal("5.00"))).isEqualByComparingTo("260.00");
	}

}
