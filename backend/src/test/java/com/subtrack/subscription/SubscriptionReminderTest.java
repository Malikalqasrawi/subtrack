package com.subtrack.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import com.subtrack.user.User;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class SubscriptionReminderTest {

	private static final LocalDate RENEWAL = LocalDate.of(2026, 10, 20);

	@Test
	void noReminderBeforeTheWindowOpens() {
		assertThat(subscription(SubscriptionStatus.ACTIVE, 3).renewalNeedingReminder(RENEWAL.minusDays(4))).isEmpty();
	}

	@Test
	void reminderIsDueInsideTheWindowAndOnlyOncePerRenewal() {
		Subscription subscription = subscription(SubscriptionStatus.ACTIVE, 3);
		LocalDate today = RENEWAL.minusDays(3);
		assertThat(subscription.renewalNeedingReminder(today)).contains(RENEWAL);

		subscription.markReminderSent(RENEWAL);
		assertThat(subscription.renewalNeedingReminder(today)).isEmpty();
		assertThat(subscription.renewalNeedingReminder(RENEWAL)).isEmpty();
	}

	@Test
	void theFollowingRenewalGetsItsOwnReminder() {
		Subscription subscription = subscription(SubscriptionStatus.ACTIVE, 3);
		subscription.markReminderSent(RENEWAL);
		LocalDate nextRenewal = RENEWAL.plusMonths(1);
		assertThat(subscription.renewalNeedingReminder(nextRenewal.minusDays(2))).contains(nextRenewal);
	}

	@Test
	void pausedSubscriptionsAndDisabledRemindersNeverNotify() {
		assertThat(subscription(SubscriptionStatus.PAUSED, 3).renewalNeedingReminder(RENEWAL)).isEmpty();
		assertThat(subscription(SubscriptionStatus.ACTIVE, null).renewalNeedingReminder(RENEWAL)).isEmpty();
	}

	private static Subscription subscription(SubscriptionStatus status, Integer reminderDaysBefore) {
		User user = new User("a@example.com", "hash", "A", "+962791234567", "USD");
		return new Subscription(user, new SubscriptionDetails("Netflix", new BigDecimal("15.99"), "USD",
				BillingCycle.MONTHLY, Category.ENTERTAINMENT, RENEWAL, status, reminderDaysBefore, null, null));
	}

}
