package com.subtrack.user;

import com.subtrack.config.AppProperties;
import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deletes sign-ups that were never verified, so nobody can sign up with someone else's email
 * and keep it. Unverified accounts cannot sign in, so they have no subscriptions or other data.
 */
@Service
public class UnverifiedAccountCleanup {

	private static final Logger log = LoggerFactory.getLogger(UnverifiedAccountCleanup.class);

	private final UserRepository users;

	private final Clock clock;

	private final Duration keepFor;

	public UnverifiedAccountCleanup(UserRepository users, Clock clock, AppProperties properties) {
		this.users = users;
		this.clock = clock;
		this.keepFor = properties.verification().unverifiedAccountTtl();
	}

	@Scheduled(initialDelay = 10, fixedDelay = 60, timeUnit = TimeUnit.MINUTES)
	@Transactional
	public int deleteOld() {
		int deleted = users.deleteUnverifiedCreatedBefore(clock.instant().minus(keepFor));
		if (deleted > 0) {
			log.info("Deleted {} sign-up(s) that were never verified", deleted);
		}
		return deleted;
	}

}
