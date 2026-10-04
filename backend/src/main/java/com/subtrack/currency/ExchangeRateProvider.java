package com.subtrack.currency;

/**
 * Source of exchange rates. Implementations may call a remote API, read a fixed table,
 * or wrap another provider to add behaviour such as caching.
 */
public interface ExchangeRateProvider {

	ExchangeRates currentRates();

}
