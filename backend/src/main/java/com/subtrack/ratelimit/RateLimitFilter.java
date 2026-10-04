package com.subtrack.ratelimit;

import com.subtrack.common.error.ApiError;
import com.subtrack.common.error.ApiErrorWriter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Optional;
import org.springframework.web.filter.OncePerRequestFilter;

/** Limits requests per client IP, using the first rule whose path prefix matches. */
public class RateLimitFilter extends OncePerRequestFilter {

	private final RateLimiter rateLimiter;

	private final List<RateLimitRule> rules;

	private final ApiErrorWriter errorWriter;

	public RateLimitFilter(RateLimiter rateLimiter, List<RateLimitRule> rules, ApiErrorWriter errorWriter) {
		this.rateLimiter = rateLimiter;
		this.rules = List.copyOf(rules);
		this.errorWriter = errorWriter;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Optional<RateLimitRule> rule = ruleFor(request.getRequestURI());
		if (rule.isEmpty()) {
			chain.doFilter(request, response);
			return;
		}
		RateLimitDecision decision = rateLimiter.tryConsume(request.getRemoteAddr(), rule.get());
		response.setHeader("X-RateLimit-Limit", String.valueOf(rule.get().capacity()));
		response.setHeader("X-RateLimit-Remaining", String.valueOf(decision.remaining()));
		if (decision.allowed()) {
			chain.doFilter(request, response);
			return;
		}
		long retryAfterSeconds = Math.max(1, (decision.retryAfter().toMillis() + 999) / 1000);
		response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
		errorWriter.write(response, ApiError.of(429, "RATE_LIMITED",
				"Too many requests. Try again in " + retryAfterSeconds + " seconds."));
	}

	private Optional<RateLimitRule> ruleFor(String path) {
		return rules.stream().filter(rule -> rule.appliesTo(path)).findFirst();
	}

}
