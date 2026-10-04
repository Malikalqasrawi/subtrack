package com.subtrack.currency;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Decorator that adds caching and failure tolerance to any provider without changing it.
 * When the wrapped provider fails, the last good rates (or the fallback) are served and the
 * next attempt is delayed so a broken upstream is not called on every request.
 */
public class CachingExchangeRateProvider implements ExchangeRateProvider {

	private static final Logger log = LoggerFactory.getLogger(CachingExchangeRateProvider.class);

	private static final Duration RETRY_DELAY = Duration.ofMinutes(5);

	private final ExchangeRateProvider delegate;

	private final ExchangeRateProvider fallback;

	private final Duration ttl;

	private final Clock clock;

	private ExchangeRates cached;

	private Instant refreshAfter = Instant.MIN;

	public CachingExchangeRateProvider(ExchangeRateProvider delegate, ExchangeRateProvider fallback, Duration ttl,
			Clock clock) {
		this.delegate = delegate;
		this.fallback = fallback;
		this.ttl = ttl;
		this.clock = clock;
	}

	@Override
	public synchronized ExchangeRates currentRates() {
		Instant now = clock.instant();
		if (cached != null && now.isBefore(refreshAfter)) {
			return cached;
		}
		try {
			cached = delegate.currentRates();
			refreshAfter = now.plus(ttl);
		}
		catch (RuntimeException ex) {
			log.warn("Could not refresh exchange rates, serving {} rates: {}", cached == null ? "fallback" : "stale",
					ex.getMessage());
			if (cached == null) {
				cached = fallback.currentRates();
			}
			refreshAfter = now.plus(RETRY_DELAY);
		}
		return cached;
	}

}
