package com.subtrack.subscription;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * How often a subscription charges. Each constant supplies its own date arithmetic, and the
 * shared methods below are written once against those two abstract operations. Adding a new
 * cycle means adding a constant; no caller has to change.
 */
public enum BillingCycle {

	WEEKLY(52) {
		@Override
		LocalDate advance(LocalDate anchor, long periods) {
			return anchor.plusWeeks(periods);
		}

		@Override
		long wholePeriodsBetween(LocalDate anchor, LocalDate date) {
			return ChronoUnit.WEEKS.between(anchor, date);
		}
	},

	MONTHLY(12) {
		@Override
		LocalDate advance(LocalDate anchor, long periods) {
			return anchor.plusMonths(periods);
		}

		@Override
		long wholePeriodsBetween(LocalDate anchor, LocalDate date) {
			return ChronoUnit.MONTHS.between(anchor, date);
		}
	},

	QUARTERLY(4) {
		@Override
		LocalDate advance(LocalDate anchor, long periods) {
			return anchor.plusMonths(3 * periods);
		}

		@Override
		long wholePeriodsBetween(LocalDate anchor, LocalDate date) {
			return ChronoUnit.MONTHS.between(anchor, date) / 3;
		}
	},

	YEARLY(1) {
		@Override
		LocalDate advance(LocalDate anchor, long periods) {
			return anchor.plusYears(periods);
		}

		@Override
		long wholePeriodsBetween(LocalDate anchor, LocalDate date) {
			return ChronoUnit.YEARS.between(anchor, date);
		}
	};

	private static final BigDecimal MONTHS_PER_YEAR = BigDecimal.valueOf(12);

	private final BigDecimal paymentsPerYear;

	BillingCycle(int paymentsPerYear) {
		this.paymentsPerYear = BigDecimal.valueOf(paymentsPerYear);
	}

	/**
	 * The billing date {@code periods} cycles after the anchor. Always computed from the anchor
	 * so a subscription started on the 31st returns to the 31st after a shorter month.
	 */
	abstract LocalDate advance(LocalDate anchor, long periods);

	abstract long wholePeriodsBetween(LocalDate anchor, LocalDate date);

	public LocalDate nextOccurrenceOnOrAfter(LocalDate anchor, LocalDate date) {
		return advance(anchor, periodIndexOnOrAfter(anchor, date));
	}

	/** Every billing date in the inclusive range. */
	public List<LocalDate> occurrencesBetween(LocalDate anchor, LocalDate from, LocalDate to) {
		List<LocalDate> occurrences = new ArrayList<>();
		long period = periodIndexOnOrAfter(anchor, from);
		for (LocalDate date = advance(anchor, period); !date.isAfter(to); date = advance(anchor, ++period)) {
			occurrences.add(date);
		}
		return occurrences;
	}

	public BigDecimal yearlyCost(BigDecimal amount) {
		return amount.multiply(paymentsPerYear).setScale(2, RoundingMode.HALF_UP);
	}

	public BigDecimal monthlyCost(BigDecimal amount) {
		return amount.multiply(paymentsPerYear).divide(MONTHS_PER_YEAR, 2, RoundingMode.HALF_UP);
	}

	private long periodIndexOnOrAfter(LocalDate anchor, LocalDate date) {
		if (!date.isAfter(anchor)) {
			return 0;
		}
		long periods = wholePeriodsBetween(anchor, date);
		return advance(anchor, periods).isBefore(date) ? periods + 1 : periods;
	}

}
