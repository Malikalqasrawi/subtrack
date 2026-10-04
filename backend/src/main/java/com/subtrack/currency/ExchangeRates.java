package com.subtrack.currency;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Map;

/** A snapshot of rates, each expressed as "units of this currency per 1 unit of {@code base}". */
public record ExchangeRates(String base, Map<String, BigDecimal> rates, Instant asOf) {

	public ExchangeRates {
		rates = Map.copyOf(rates);
	}

	public boolean supports(String currency) {
		return rates.containsKey(currency);
	}

	public BigDecimal convert(BigDecimal amount, String from, String to) {
		if (from.equals(to)) {
			return amount.setScale(2, RoundingMode.HALF_UP);
		}
		BigDecimal inBase = amount.divide(rateOf(from), MathContext.DECIMAL64);
		return inBase.multiply(rateOf(to)).setScale(2, RoundingMode.HALF_UP);
	}

	private BigDecimal rateOf(String currency) {
		BigDecimal rate = rates.get(currency);
		if (rate == null) {
			throw new IllegalArgumentException("No exchange rate for " + currency);
		}
		return rate;
	}

}
