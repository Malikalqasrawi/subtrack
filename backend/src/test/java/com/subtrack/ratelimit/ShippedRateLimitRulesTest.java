package com.subtrack.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.boot.convert.ApplicationConversionService;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.io.ClassPathResource;

/**
 * The rules in application.yml as they ship. The other tests replace them, and their order
 * matters: the first rule that matches a path is the one that applies.
 */
class ShippedRateLimitRulesTest {

	private final List<RateLimitRule> rules = shippedRules();

	@ParameterizedTest
	@ValueSource(strings = { "/api/auth/register", "/api/auth/resend-verification", "/api/auth/forgot-password" })
	void requestsThatSendAnEmailAreLimitedPerHour(String path) {
		RateLimitRule rule = ruleFor(path);

		assertThat(rule.name()).isEqualTo("emailed-codes");
		assertThat(rule.window()).hasHours(1);
		assertThat(rule.capacity()).isLessThanOrEqualTo(10);
	}

	@Test
	void otherRequestsKeepTheirOwnLimits() {
		assertThat(ruleFor("/api/auth/login").name()).isEqualTo("auth");
		assertThat(ruleFor("/api/subscriptions").name()).isEqualTo("api");
	}

	private RateLimitRule ruleFor(String path) {
		return rules.stream().filter(rule -> rule.appliesTo(path)).findFirst().orElseThrow();
	}

	private static List<RateLimitRule> shippedRules() {
		try {
			var sources = new YamlPropertySourceLoader().load("application", new ClassPathResource("application.yml"));
			Binder binder = new Binder(ConfigurationPropertySources.from(sources), null,
					ApplicationConversionService.getSharedInstance());
			return binder.bind("app.rate-limit.rules", Bindable.listOf(RateLimitRule.class)).get();
		}
		catch (IOException ex) {
			throw new IllegalStateException("Could not read application.yml", ex);
		}
	}

}
