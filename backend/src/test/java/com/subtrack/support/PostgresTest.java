package com.subtrack.support;

import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Runs a test against a real PostgreSQL, started once for the whole test run. The application
 * connects to it the way it does when deployed: migrations as the owner of the schema,
 * everything else through its own limited login.
 */
@ActiveProfiles("test")
public abstract class PostgresTest {

	private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine")
		.withDatabaseName("subtrack")
		.withUsername("subtrack")
		.withPassword("test-owner-password");

	static {
		POSTGRES.start();
	}

	@DynamicPropertySource
	static void database(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.flyway.user", POSTGRES::getUsername);
		registry.add("spring.flyway.password", POSTGRES::getPassword);
	}

}
