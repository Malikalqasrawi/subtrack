package com.subtrack.common.error;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends ApiException {

	public UnauthorizedException(String message) {
		this("UNAUTHORIZED", message);
	}

	public UnauthorizedException(String code, String message) {
		super(HttpStatus.UNAUTHORIZED, code, message);
	}

}
