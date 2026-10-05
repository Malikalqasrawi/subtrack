package com.subtrack.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.io.ClassPathResource;

class ProductionChecksTest {

	private static final List<String> OWN_SECRETS = List.of("a-secret-nobody-else-has-0123456789", "own-key", "own-password");

	@Test
	void anythingGoesOutsideProduction() {
		assertThatCode(() -> new ProductionChecks(false, "log", false, ProductionChecks.DEVELOPMENT_SECRETS.stream().toList())).doesNotThrowAnyException();
	}

	@Test
	void productionRefusesCodesInTheLog() {
		assertThatThrownBy(() -> new ProductionChecks(true, "log", true, OWN_SECRETS)).hasMessageContaining("MAIL_MODE must be smtp");
	}

	@Test
	void productionRefusesACookieOverPlainHttp() {
		assertThatThrownBy(() -> new ProductionChecks(true, "smtp", false, OWN_SECRETS))
			.hasMessageContaining("COOKIE_SECURE must be true");
	}

	@Test
	void productionStartsWithSafeSettings() {
		assertThatCode(() -> new ProductionChecks(true, "smtp", true, OWN_SECRETS)).doesNotThrowAnyException();
	}

	@ParameterizedTest
	@ValueSource(ints = { 0, 1, 2 })
	void productionRefusesEachSecretOfTheDevProfile(int position) throws IOException {
		List<String> secrets = new ArrayList<>(OWN_SECRETS);
		secrets.set(position, devProfileDefaults().get(position));

		assertThatThrownBy(() -> new ProductionChecks(true, "smtp", true, secrets))
			.hasMessageContaining("not the dev profile's");
	}

	/** Read from the dev profile itself, so a value changed there cannot slip past the check. */
	private static List<String> devProfileDefaults() throws IOException {
		String devProfile = new ClassPathResource("application-dev.yml").getContentAsString(StandardCharsets.UTF_8);
		return Stream.of("JWT_SECRET", "ENCRYPTION_KEY", "DB_APP_PASSWORD").map(variable -> {
			Matcher fallback = Pattern.compile("\\$\\{" + variable + ":([^}]+)}").matcher(devProfile);
			assertThat(fallback.find()).as(variable + " has a fallback in the dev profile").isTrue();
			return fallback.group(1);
		}).toList();
	}

}
