package com.subtrack.common;

import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** The network address (IP) of the client making the current request. */
public final class ClientAddress {

	/** Used outside a web request, for example when a test calls a service directly. */
	public static final String NONE = "none";

	private ClientAddress() {
	}

	/**
	 * The socket address, like the rate limits use, and not X-Forwarded-For, which a client can
	 * set to anything. Behind nginx, forward-headers-strategy makes this the real client.
	 */
	public static String current() {
		RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
		if (attributes instanceof ServletRequestAttributes servlet) {
			return servlet.getRequest().getRemoteAddr();
		}
		return NONE;
	}

}
