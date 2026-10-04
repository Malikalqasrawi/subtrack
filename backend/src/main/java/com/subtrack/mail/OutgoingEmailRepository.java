package com.subtrack.mail;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface OutgoingEmailRepository extends JpaRepository<OutgoingEmail, UUID> {

	@Query("select e.id from OutgoingEmail e where e.status = :status and e.nextAttemptAt <= :now order by e.nextAttemptAt")
	List<UUID> findDueIds(EmailStatus status, Instant now, Pageable limit);

	/**
	 * Takes a due email for one attempt. A single UPDATE, so when two threads (or two servers)
	 * go for the same email only one of them gets 1 back and sends it. Until the attempt is
	 * recorded as sent or failed, the email counts as due again at {@code retryAt}, which
	 * covers a server that stops in the middle of sending.
	 */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query("""
			update OutgoingEmail e set e.attempts = e.attempts + 1, e.nextAttemptAt = :retryAt
			where e.id = :id and e.status = :status and e.nextAttemptAt <= :now""")
	int claim(UUID id, EmailStatus status, Instant now, Instant retryAt);

	@Modifying
	@Query("delete from OutgoingEmail e where e.status in :statuses and e.createdAt < :before")
	int deleteFinishedBefore(Collection<EmailStatus> statuses, Instant before);

}
