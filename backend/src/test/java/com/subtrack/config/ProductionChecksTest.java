package com.subtrack.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ProductionChecksTest {

	@Test
	void anythingGoesOutsideProduction() {
		assertThatCode(() -> new ProductionChecks(false, "log", false)).doesNotThrowAnyException();
	}

	@Test
	void productionRefusesCodesInTheLog() {
		assertThatThrownBy(() -> new ProductionChecks(true, "log", true)).hasMessageContaining("MAIL_MODE must be smtp");
	}

	@Test
	void productionRefusesACookieOverPlainHttp() {
		assertThatThrownBy(() -> new ProductionChecks(true, "smtp", false))
			.hasMessageContaining("COOKIE_SECURE must be true");
	}

	@Test
	void productionStartsWithSafeSettings() {
		assertThatCode(() -> new ProductionChecks(true, "smtp", true)).doesNotThrowAnyException();
	}

}
