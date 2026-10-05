package com.subtrack.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * With app.production=true, refuses to start with settings that are fine on a laptop but unsafe
 * on a real server: emails (and the codes in them) written to the log, a session cookie that
 * would be sent over plain HTTP, or the secrets of the dev profile.
 */
@Component
public class ProductionChecks {

	/** What the dev profile falls back to. These are in the repository, so anyone can read them. */
	static final Set<String> DEVELOPMENT_SECRETS = Set.of("dev-only-secret-do-not-use-in-production-0123456789",
			"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", "dev-only-app-password");

	@Autowired
	public ProductionChecks(AppProperties properties, @Value("${app.mail.mode}") String mailMode,
			@Value("${spring.datasource.password}") String databasePassword) {
		this(properties.production(), mailMode, properties.cookies().secure(),
				List.of(properties.jwt().secret(), properties.security().encryptionKey(), databasePassword));
	}

	ProductionChecks(boolean production, String mailMode, boolean secureCookies, List<String> secrets) {
		if (!production) {
			return;
		}
		List<String> problems = new ArrayList<>();
		if (!"smtp".equals(mailMode)) {
			problems.add("MAIL_MODE must be smtp, or codes are only written to the log");
		}
		if (!secureCookies) {
			problems.add("COOKIE_SECURE must be true, or the session cookie travels over plain HTTP");
		}
		if (secrets.stream().anyMatch(DEVELOPMENT_SECRETS::contains)) {
			problems.add("JWT_SECRET, ENCRYPTION_KEY and DB_APP_PASSWORD must be your own values, not the dev profile's,"
					+ " which anyone can read in the repository");
		}
		if (!problems.isEmpty()) {
			throw new IllegalStateException("Production mode is on, but " + String.join("; ", problems) + ".");
		}
	}

}
