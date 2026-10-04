package com.subtrack.common.error;

import java.time.Instant;
import java.util.Map;

/** The single error shape returned by every endpoint. */
public record ApiError(int status, String code, String message, Map<String, String> fieldErrors, Instant timestamp) {

	public static ApiError of(int status, String code, String message) {
		return new ApiError(status, code, message, Map.of(), Instant.now());
	}

	public static ApiError validation(Map<String, String> fieldErrors) {
		return new ApiError(400, "VALIDATION_FAILED", "Some fields are invalid", fieldErrors, Instant.now());
	}

}
