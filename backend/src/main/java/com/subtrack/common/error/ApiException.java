package com.subtrack.common.error;

import org.springframework.http.HttpStatus;

/**
 * Base type for every error the API reports on purpose. The exception handler only
 * knows this type, so new error kinds are added by subclassing, not by editing the handler.
 */
public abstract class ApiException extends RuntimeException {

	private final HttpStatus status;

	private final String code;

	protected ApiException(HttpStatus status, String code, String message) {
		super(message);
		this.status = status;
		this.code = code;
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getCode() {
		return code;
	}

}
