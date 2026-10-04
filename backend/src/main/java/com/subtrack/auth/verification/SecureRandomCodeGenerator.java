package com.subtrack.auth.verification;

import java.security.SecureRandom;
import org.springframework.stereotype.Component;

/** Six random digits from a cryptographically strong source. */
@Component
public class SecureRandomCodeGenerator implements CodeGenerator {

	private final SecureRandom random = new SecureRandom();

	@Override
	public String generate() {
		return String.format("%06d", random.nextInt(1_000_000));
	}

}
