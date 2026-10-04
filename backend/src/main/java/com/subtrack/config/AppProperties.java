package com.subtrack.config;

import com.subtrack.ratelimit.RateLimitRule;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties(prefix = "app")
@Validated
public record AppProperties(boolean production, @Valid @NotNull Security security, @Valid @NotNull Jwt jwt, @Valid @NotNull Verification verification,
		@Valid @NotNull Login login, @Valid @NotNull Mail mail, @Valid @NotNull Reminders reminders, @Valid @NotNull ExchangeRates exchangeRates,
		@Valid @NotNull RateLimit rateLimit, @Valid @NotNull Cookies cookies, @Valid @NotNull Social social) {

	public record Jwt(
			@NotBlank @Size(min = 32, message = "JWT_SECRET must be at least 32 characters") String secret,
			@NotNull Duration accessTokenTtl, @NotNull Duration refreshTokenTtl) {
	}

	public record Security(String encryptionKey) {
	}

	public record Verification(@NotNull Duration codeTtl, @Min(1) int maxAttempts, @NotNull Duration resendCooldown,
			@Min(1) int attemptsPerHour, @Min(1) int codesPerDay, @Min(1) int globalCodesPerHour,
			@NotNull Duration unverifiedAccountTtl) {
	}

	public record Login(@Min(1) int maxAttempts, @Min(1) int accountMaxAttempts, @NotNull Duration lockDuration) {
	}

	public record Mail(@NotBlank String from, boolean async, boolean jobs, @NotNull Duration keepFor) {
	}

	public record Reminders(boolean enabled) {
	}

	public record ExchangeRates(@NotBlank String provider, @NotBlank String url, @NotNull Duration cacheTtl) {
	}

	public record RateLimit(boolean enabled, @NotNull List<@Valid RateLimitRule> rules) {
	}

	public record Cookies(boolean secure) {
	}

	/** Sign in with Google / Apple. A provider with no client id is switched off. */
	public record Social(@NotNull Provider google, @NotNull Provider apple) {

		public record Provider(String clientId) {
		}

	}

}
