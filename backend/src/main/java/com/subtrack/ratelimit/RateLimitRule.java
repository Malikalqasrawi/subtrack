package com.subtrack.ratelimit;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;

/** Allows {@code capacity} requests per {@code window} for paths starting with {@code pathPrefix}. */
public record RateLimitRule(@NotBlank String name, @NotBlank String pathPrefix, @Min(1) int capacity,
		@NotNull Duration window) {

	public boolean appliesTo(String path) {
		return path.startsWith(pathPrefix);
	}

}
