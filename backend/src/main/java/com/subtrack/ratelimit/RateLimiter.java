package com.subtrack.ratelimit;

/**
 * Decides whether one more request is allowed for a key under a rule. The filter depends on
 * this interface only, so the in-memory implementation can be replaced by a shared store
 * (for example Redis) when the app runs on more than one instance.
 */
public interface RateLimiter {

	RateLimitDecision tryConsume(String key, RateLimitRule rule);

}
