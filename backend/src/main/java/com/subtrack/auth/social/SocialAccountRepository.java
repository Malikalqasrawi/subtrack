package com.subtrack.auth.social;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, UUID> {

	@EntityGraph(attributePaths = "user")
	Optional<SocialAccount> findByProviderAndSubject(SocialProvider provider, String subject);

}
