package com.subtrack.currency;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Live USD-based rates from an open.er-api.com compatible endpoint. Currencies the remote
 * source does not list keep the value from {@code defaults}.
 */
public class RemoteExchangeRateProvider implements ExchangeRateProvider {

	private static final ParameterizedTypeReference<Map<String, Object>> JSON_OBJECT = new ParameterizedTypeReference<>() {
	};

	private final RestClient restClient;

	private final String url;

	private final ExchangeRateProvider defaults;

	private final Clock clock;

	public RemoteExchangeRateProvider(String url, ExchangeRateProvider defaults, Clock clock) {
		HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
		JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
		requestFactory.setReadTimeout(Duration.ofSeconds(5));
		this.restClient = RestClient.builder().requestFactory(requestFactory).build();
		this.url = url;
		this.defaults = defaults;
		this.clock = clock;
	}

	@Override
	public ExchangeRates currentRates() {
		Map<String, Object> response = restClient.get().uri(url).retrieve().body(JSON_OBJECT);
		if (response == null || !(response.get("rates") instanceof Map<?, ?> remoteRates)) {
			throw new IllegalStateException("Exchange rate response has no rates");
		}
		ExchangeRates fallback = defaults.currentRates();
		Map<String, BigDecimal> rates = new HashMap<>(fallback.rates());
		for (String currency : fallback.rates().keySet()) {
			if (remoteRates.get(currency) instanceof Number rate && rate.doubleValue() > 0) {
				rates.put(currency, new BigDecimal(rate.toString()));
			}
		}
		return new ExchangeRates(fallback.base(), rates, clock.instant());
	}

}
