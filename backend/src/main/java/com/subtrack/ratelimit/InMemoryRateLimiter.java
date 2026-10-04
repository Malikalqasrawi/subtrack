package com.subtrack.ratelimit;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Token-bucket limiter kept in this JVM's memory. */
@Component
public class InMemoryRateLimiter implements RateLimiter {

	private final ConcurrentMap<String, Entry> buckets = new ConcurrentHashMap<>();

	@Override
	public RateLimitDecision tryConsume(String key, RateLimitRule rule) {
		Entry entry = buckets.computeIfAbsent(rule.name() + ":" + key, k -> new Entry(newBucket(rule), rule.window()));
		entry.lastUsedNanos = System.nanoTime();
		ConsumptionProbe probe = entry.bucket.tryConsumeAndReturnRemaining(1);
		return new RateLimitDecision(probe.isConsumed(), probe.getRemainingTokens(),
				Duration.ofNanos(probe.getNanosToWaitForRefill()));
	}

	/** Drops buckets that have been idle long enough to be full again, so memory stays bounded. */
	@Scheduled(fixedDelay = 5 * 60 * 1000)
	void evictIdleBuckets() {
		long now = System.nanoTime();
		buckets.values().removeIf(entry -> now - entry.lastUsedNanos > entry.window.toNanos());
	}

	int size() {
		return buckets.size();
	}

	private Bucket newBucket(RateLimitRule rule) {
		return Bucket.builder()
			.addLimit(limit -> limit.capacity(rule.capacity()).refillGreedy(rule.capacity(), rule.window()))
			.build();
	}

	private static final class Entry {

		private final Bucket bucket;

		private final Duration window;

		private volatile long lastUsedNanos;

		private Entry(Bucket bucket, Duration window) {
			this.bucket = bucket;
			this.window = window;
		}

	}

}
