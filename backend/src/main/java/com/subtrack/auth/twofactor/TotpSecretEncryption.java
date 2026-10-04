package com.subtrack.auth.twofactor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** Runs at every startup and only changes two-factor secrets that are not encrypted yet. */
@Component
public class TotpSecretEncryption implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(TotpSecretEncryption.class);

	private final TwoFactorService twoFactorService;

	public TotpSecretEncryption(TwoFactorService twoFactorService) {
		this.twoFactorService = twoFactorService;
	}

	@Override
	public void run(ApplicationArguments args) {
		int encrypted = twoFactorService.encryptStoredSecrets();
		if (encrypted > 0) {
			log.info("Encrypted the two-factor secrets of {} account(s)", encrypted);
		}
	}

}
