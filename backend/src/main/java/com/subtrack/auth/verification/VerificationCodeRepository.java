package com.subtrack.auth.verification;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {

	Optional<VerificationCode> findFirstByUserIdAndPurposeOrderByCreatedAtDesc(UUID userId, CodePurpose purpose);

	void deleteByUserIdAndPurpose(UUID userId, CodePurpose purpose);

}
