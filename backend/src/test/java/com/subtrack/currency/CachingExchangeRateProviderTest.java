package com.subtrack.currency;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

class CachingExchangeRateProviderTest {

	private Instant now = Instant.parse("2026-10-03T00:00:00Z");

	private final Clock clock = new Clock() {
		@Override
		public Instant instant() {
			return now;
		}

		@Override
		public java.time.ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(java.time.ZoneId zone) {
			return this;
		}
	};

	private final ExchangeRateProvider fallback = () -> rates("0.50");

	@Test
	void callsTheDelegateOncePerTtl() {
		AtomicInteger calls = new AtomicInteger();
		ExchangeRateProvider provider = new CachingExchangeRateProvider(() -> {
			calls.incrementAndGet();
			return rates("0.90");
		}, fallback, Duration.ofHours(1), clock);

		provider.currentRates();
		provider.currentRates();
		assertThat(calls).hasValue(1);

		now = now.plus(Duration.ofHours(2));
		provider.currentRates();
		assertThat(calls).hasValue(2);
	}

	@Test
	void servesTheFallbackWhenTheDelegateHasNeverWorked() {
		ExchangeRateProvider provider = new CachingExchangeRateProvider(() -> {
			throw new IllegalStateException("down");
		}, fallback, Duration.ofHours(1), clock);

		assertThat(provider.currentRates().rates().get("EUR")).isEqualByComparingTo("0.50");
	}

	@Test
	void keepsServingTheLastGoodRatesWhenARefreshFails() {
		AtomicInteger calls = new AtomicInteger();
		ExchangeRateProvider provider = new CachingExchangeRateProvider(() -> {
			if (calls.incrementAndGet() > 1) {
				throw new IllegalStateException("down");
			}
			return rates("0.90");
		}, fallback, Duration.ofHours(1), clock);

		provider.currentRates();
		now = now.plus(Duration.ofHours(2));
		assertThat(provider.currentRates().rates().get("EUR")).isEqualByComparingTo("0.90");
	}

	@Test
	void convertsThroughTheBaseCurrency() {
		ExchangeRates rates = new ExchangeRates("USD",
				Map.of("USD", BigDecimal.ONE, "EUR", new BigDecimal("0.50"), "JOD", new BigDecimal("0.25")), now);
		assertThat(rates.convert(new BigDecimal("10.00"), "EUR", "JOD")).isEqualByComparingTo("5.00");
		assertThat(rates.convert(new BigDecimal("10.00"), "USD", "USD")).isEqualByComparingTo("10.00");
	}

	private ExchangeRates rates(String eurPerUsd) {
		return new ExchangeRates("USD", Map.of("USD", BigDecimal.ONE, "EUR", new BigDecimal(eurPerUsd)), now);
	}

}
