package com.subtrack.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.subtrack.common.RowAccess;
import com.subtrack.support.PostgresTest;
import com.subtrack.user.User;
import com.subtrack.user.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Row level security on the subscriptions table, tried with queries that have no owner filter
 * of their own. A single database connection is used, so one transaction would see what
 * another left behind on it.
 */
@SpringBootTest
@TestPropertySource(properties = "spring.datasource.hikari.maximum-pool-size=1")
class SubscriptionRowSecurityTest extends PostgresTest {

	@Autowired
	private RowAccess rowAccess;

	@Autowired
	private SubscriptionRepository subscriptions;

	@Autowired
	private UserRepository users;

	@Autowired
	private JdbcTemplate database;

	@Autowired
	private PlatformTransactionManager transactionManager;

	private User owner;

	private User stranger;

	private UUID ownersSubscription;

	private UUID strangersSubscription;

	@BeforeEach
	void twoAccountsWithOneSubscriptionEach() {
		owner = users.save(newUser());
		stranger = users.save(newUser());
		ownersSubscription = as(owner, () -> subscriptions.save(subscription(owner, "Netflix")).getId());
		strangersSubscription = as(stranger, () -> subscriptions.save(subscription(stranger, "Spotify")).getId());
	}

	@Test
	void withoutAUserNoRowIsVisible() {
		assertThat(inTransaction(() -> subscriptions.findAll())).isEmpty();
		assertThat(database.queryForObject("select count(*) from subscriptions", Long.class)).isZero();
	}

	@Test
	void aQueryWithoutAnOwnerFilterReturnsOnlyTheUsersOwnRows() {
		List<Subscription> visible = as(owner, () -> subscriptions.findAll());

		assertThat(visible).extracting(Subscription::getId).containsExactly(ownersSubscription);
	}

	@Test
	void anotherUsersRowCannotBeReadChangedOrDeletedByItsId() {
		as(stranger, () -> {
			assertThat(subscriptions.findById(ownersSubscription)).isEmpty();
			assertThat(database.update("update subscriptions set name = 'Hijacked' where id = ?", ownersSubscription))
				.isZero();
			assertThat(database.update("delete from subscriptions where id = ?", ownersSubscription)).isZero();
			return null;
		});

		assertThat(as(owner, () -> subscriptions.findById(ownersSubscription).orElseThrow().getName()))
			.isEqualTo("Netflix");
	}

	@Test
	void aRowCannotBeCreatedForAnotherUser() {
		assertThatThrownBy(() -> as(stranger, () -> subscriptions.saveAndFlush(subscription(owner, "Planted"))))
			.rootCause()
			.hasMessageContaining("row-level security policy");
	}

	@Test
	void aRowCannotBeHandedToAnotherUser() {
		assertThatThrownBy(() -> as(owner, () -> database.update("update subscriptions set user_id = ? where id = ?",
				stranger.getId(), ownersSubscription)))
			.rootCause()
			.hasMessageContaining("row-level security policy");
	}

	@Test
	void theUserIsForgottenWhenTheTransactionEnds() {
		as(owner, () -> subscriptions.findAll());

		assertThat(inTransaction(() -> subscriptions.findAll())).isEmpty();
	}

	@Test
	void scheduledJobsSeeEveryAccount() {
		List<UUID> visible = inTransaction(() -> {
			rowAccess.asSystem();
			return subscriptions.findAll().stream().map(Subscription::getId).toList();
		});

		assertThat(visible).contains(ownersSubscription, strangersSubscription);
		assertThat(inTransaction(() -> subscriptions.findAll())).isEmpty();
	}

	@Test
	void deletingAnAccountStillRemovesItsSubscriptions() {
		inTransaction(() -> {
			users.deleteById(stranger.getId());
			return null;
		});

		assertThat(as(stranger, () -> subscriptions.findAll())).isEmpty();
		assertThat(as(owner, () -> subscriptions.findAll())).hasSize(1);
	}

	@Test
	void rowAccessCannotBeSetOutsideATransaction() {
		assertThatThrownBy(() -> rowAccess.asUser(owner.getId())).isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> rowAccess.asSystem()).isInstanceOf(IllegalStateException.class);
	}

	private <T> T as(User user, Supplier<T> work) {
		return inTransaction(() -> {
			rowAccess.asUser(user.getId());
			return work.get();
		});
	}

	private <T> T inTransaction(Supplier<T> work) {
		return new TransactionTemplate(transactionManager).execute(status -> work.get());
	}

	private static User newUser() {
		return new User("rows-" + UUID.randomUUID() + "@example.com", "no-password", "Row Test", "+962791234567", "USD");
	}

	private static Subscription subscription(User user, String name) {
		return new Subscription(user, new SubscriptionDetails(name, new BigDecimal("9.99"), "USD", BillingCycle.MONTHLY,
				Category.ENTERTAINMENT, LocalDate.of(2026, 1, 15), SubscriptionStatus.ACTIVE, 3, null, null));
	}

}
