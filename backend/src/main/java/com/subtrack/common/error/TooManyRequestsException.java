package com.subtrack.common.error;

import org.springframework.http.HttpStatus;

public class TooManyRequestsException extends ApiException {

	public TooManyRequestsException(String message) {
		this("RATE_LIMITED", message);
	}

	public TooManyRequestsException(String code, String message) {
		super(HttpStatus.TOO_MANY_REQUESTS, code, message);
	}

}
