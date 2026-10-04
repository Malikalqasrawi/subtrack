package com.subtrack.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * With app.production=true, refuses to start with settings that are fine on a laptop but unsafe
 * on a real server: emails (and the codes in them) written to the log, or a session cookie that
 * would be sent over plain HTTP.
 */
@Component
public class ProductionChecks {

	@Autowired
	public ProductionChecks(AppProperties properties, @Value("${app.mail.mode}") String mailMode) {
		this(properties.production(), mailMode, properties.cookies().secure());
	}

	ProductionChecks(boolean production, String mailMode, boolean secureCookies) {
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
		if (!problems.isEmpty()) {
			throw new IllegalStateException("Production mode is on, but " + String.join("; ", problems) + ".");
		}
	}

}
