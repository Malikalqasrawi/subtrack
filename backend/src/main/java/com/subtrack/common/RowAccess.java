package com.subtrack.common;

import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Tells PostgreSQL whose rows the current transaction may see. The row level security policies
 * on the subscriptions table read these settings; with neither set, no row is visible.
 *
 * Both last until the transaction ends, so nothing stays behind on a pooled connection.
 */
@Component
public class RowAccess {

	private final EntityManager entityManager;

	public RowAccess(EntityManager entityManager) {
		this.entityManager = entityManager;
	}

	public void asUser(UUID userId) {
		set("app.current_user_id", userId.toString());
	}

	/** For scheduled jobs that work through every account's rows. */
	public void asSystem() {
		set("app.system_access", "on");
	}

	private void set(String setting, String value) {
		if (!TransactionSynchronizationManager.isActualTransactionActive()) {
			throw new IllegalStateException("Row access is set for one transaction, and none is open");
		}
		entityManager.createNativeQuery("select set_config(:setting, :value, true)")
			.setParameter("setting", setting)
			.setParameter("value", value)
			.getSingleResult();
	}

}
