package com.subtrack.currency;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.Map;
import java.util.Set;

/**
 * Approximate USD-based rates baked into the application. It defines which currencies the
 * app supports and is the fallback when live rates are unavailable.
 */
public class FixedExchangeRateProvider implements ExchangeRateProvider {

	private static final Map<String, BigDecimal> USD_RATES = Map.ofEntries(rate("USD", "1"), rate("EUR", "0.92"),
			rate("GBP", "0.79"), rate("JOD", "0.709"), rate("SAR", "3.75"), rate("AED", "3.6725"),
			rate("QAR", "3.64"), rate("KWD", "0.307"), rate("BHD", "0.376"), rate("OMR", "0.385"),
			rate("EGP", "48.50"), rate("TRY", "34.00"), rate("CAD", "1.37"), rate("AUD", "1.52"),
			rate("NZD", "1.65"), rate("CHF", "0.88"), rate("SEK", "10.50"), rate("NOK", "10.80"),
			rate("DKK", "6.87"), rate("PLN", "3.95"), rate("JPY", "150.00"), rate("CNY", "7.20"),
			rate("INR", "83.50"), rate("KRW", "1350.00"), rate("SGD", "1.34"), rate("BRL", "5.40"),
			rate("MXN", "18.50"), rate("ZAR", "18.20"));

	private final Clock clock;

	public FixedExchangeRateProvider(Clock clock) {
		this.clock = clock;
	}

	private static Map.Entry<String, BigDecimal> rate(String currency, String perUsd) {
		return Map.entry(currency, new BigDecimal(perUsd));
	}

	public Set<String> supportedCurrencies() {
		return USD_RATES.keySet();
	}

	@Override
	public ExchangeRates currentRates() {
		return new ExchangeRates("USD", USD_RATES, clock.instant());
	}

}
