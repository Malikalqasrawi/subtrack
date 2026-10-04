package com.subtrack.common.error;

import org.springframework.http.HttpStatus;

public class NotFoundException extends ApiException {

	public NotFoundException(String message) {
		this("NOT_FOUND", message);
	}

	public NotFoundException(String code, String message) {
		super(HttpStatus.NOT_FOUND, code, message);
	}

}
