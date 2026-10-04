package com.subtrack.auth.twofactor;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecoveryCodeRepository extends JpaRepository<RecoveryCode, UUID> {

	Optional<RecoveryCode> findByUserIdAndCodeHashAndUsedAtIsNull(UUID userId, String codeHash);

	void deleteByUserId(UUID userId);

}
