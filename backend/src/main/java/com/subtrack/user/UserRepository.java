package com.subtrack.user;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

	Optional<User> findByEmail(String email);

	@Query("select u.tokenVersion from User u where u.id = :id")
	Optional<Integer> findTokenVersionById(@Param("id") UUID id);

	@Query("select u from User u where u.totpSecret is not null and u.totpSecret not like 'v1:%'")
	List<User> findWithUnencryptedTotpSecret();

	@Modifying
	@Query("delete from User u where u.emailVerified = false and u.createdAt < :cutoff")
	int deleteUnverifiedCreatedBefore(@Param("cutoff") Instant cutoff);

}
