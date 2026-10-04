package com.subtrack.currency;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CurrencyConverter {

	private final ExchangeRateProvider rateProvider;

	public CurrencyConverter(ExchangeRateProvider rateProvider) {
		this.rateProvider = rateProvider;
	}

	public BigDecimal convert(BigDecimal amount, String from, String to) {
		return rateProvider.currentRates().convert(amount, from, to);
	}

	public boolean isSupported(String currency) {
		return rateProvider.currentRates().supports(currency);
	}

	public List<String> supportedCurrencies() {
		return rateProvider.currentRates().rates().keySet().stream().sorted().toList();
	}

	public Instant ratesAsOf() {
		return rateProvider.currentRates().asOf();
	}

}
