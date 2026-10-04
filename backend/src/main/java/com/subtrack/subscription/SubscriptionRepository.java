package com.subtrack.subscription;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

	@Query("select s from Subscription s where s.user.id = :userId order by lower(s.name)")
	List<Subscription> findByUserSortedByName(@Param("userId") UUID userId);

	List<Subscription> findByUserIdAndStatus(UUID userId, SubscriptionStatus status);

	/** Looking up by owner as well as id means one user can never reach another user's data. */
	Optional<Subscription> findByIdAndUserId(UUID id, UUID userId);

	@Query("""
			select s from Subscription s join fetch s.user
			where s.status = com.subtrack.subscription.SubscriptionStatus.ACTIVE
			and s.reminderDaysBefore is not null
			""")
	List<Subscription> findActiveWithRemindersEnabled();

}
