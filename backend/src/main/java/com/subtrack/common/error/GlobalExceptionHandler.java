package com.subtrack.common.error;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ApiError> handleApiException(ApiException ex) {
		return respond(ex.getStatus().value(), ex.getCode(), ex.getMessage());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
		Map<String, String> fieldErrors = new LinkedHashMap<>();
		for (FieldError error : ex.getBindingResult().getFieldErrors()) {
			fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage());
		}
		return ResponseEntity.badRequest().body(ApiError.validation(fieldErrors));
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class })
	public ResponseEntity<ApiError> handleUnreadable(Exception ex) {
		return respond(400, "BAD_REQUEST", "The request could not be read");
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiError> handleConflict(DataIntegrityViolationException ex) {
		return respond(409, "CONFLICT", "The request conflicts with existing data");
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiError> handleOther(Exception ex) {
		// Spring's own MVC exceptions (404, 405, 415...) already carry the right status.
		if (ex instanceof ErrorResponse errorResponse) {
			HttpStatus status = HttpStatus.valueOf(errorResponse.getStatusCode().value());
			return respond(status.value(), status.name(), status.getReasonPhrase());
		}
		log.error("Unhandled exception", ex);
		return respond(500, "INTERNAL_ERROR", "Something went wrong");
	}

	private ResponseEntity<ApiError> respond(int status, String code, String message) {
		return ResponseEntity.status(status).body(ApiError.of(status, code, message));
	}

}
