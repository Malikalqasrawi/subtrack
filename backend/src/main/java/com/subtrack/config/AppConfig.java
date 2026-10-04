package com.subtrack.config;

import com.subtrack.currency.CachingExchangeRateProvider;
import com.subtrack.currency.ExchangeRateProvider;
import com.subtrack.currency.FixedExchangeRateProvider;
import com.subtrack.currency.RemoteExchangeRateProvider;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.SyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AppConfig {

	/** Injected wherever "now" is needed so time-dependent logic can be tested. */
	@Bean
	public Clock clock() {
		return Clock.systemUTC();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	/** Account emails are handed to this so a request takes the same time whether or not one is sent. */
	@Bean
	public TaskExecutor mailExecutor(AppProperties properties) {
		if (!properties.mail().async()) {
			return new SyncTaskExecutor();
		}
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setThreadNamePrefix("mail-");
		executor.setCorePoolSize(2);
		executor.setMaxPoolSize(2);
		executor.setQueueCapacity(200);
		return executor;
	}

	@Bean
	public ExchangeRateProvider exchangeRateProvider(AppProperties properties, Clock clock) {
		AppProperties.ExchangeRates config = properties.exchangeRates();
		FixedExchangeRateProvider fixed = new FixedExchangeRateProvider(clock);
		if ("fixed".equals(config.provider())) {
			return fixed;
		}
		ExchangeRateProvider remote = new RemoteExchangeRateProvider(config.url(), fixed, clock);
		return new CachingExchangeRateProvider(remote, fixed, config.cacheTtl(), clock);
	}

}
