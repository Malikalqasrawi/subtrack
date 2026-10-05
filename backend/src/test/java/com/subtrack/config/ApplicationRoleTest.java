package com.subtrack.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.subtrack.support.PostgresTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/** What the application's own database login may and may not do. */
@SpringBootTest
class ApplicationRoleTest extends PostgresTest {

	@Autowired
	private JdbcTemplate database;

	@Test
	void theApplicationDoesNotConnectAsTheOwnerOrASuperuser() {
		Map<String, Object> login = database.queryForMap("""
				select rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
				from pg_roles where rolname = current_user""");

		assertThat(login).containsEntry("rolname", "subtrack_app")
			.containsEntry("rolsuper", false)
			.containsEntry("rolbypassrls", false)
			.containsEntry("rolcreaterole", false)
			.containsEntry("rolcreatedb", false);
		assertThat(database.queryForObject("select tableowner from pg_tables where tablename = 'users'", String.class))
			.isNotEqualTo("subtrack_app");
	}

	@Test
	void itReadsAndWritesRows() {
		assertThat(database.queryForObject("select count(*) from subscriptions", Long.class)).isNotNull();
		assertThat(database.queryForObject("""
				select bool_and(has_table_privilege(current_user, tablename::regclass, 'select, insert, update, delete'))
				from pg_tables where schemaname = 'public' and tablename <> 'flyway_schema_history'""", Boolean.class))
			.isTrue();
	}

	@ParameterizedTest
	@ValueSource(strings = { "create table sneaky (id int)", "drop table subscriptions",
			"alter table users add column sneaky text", "truncate table users", "create role sneaky",
			"alter table subscriptions disable row level security", "select * from flyway_schema_history",
			"copy users to program 'cat'" })
	void itCannotChangeTheSchemaOrReachOutsideItsTables(String statement) {
		assertThatThrownBy(() -> database.execute(statement)).rootCause()
			.hasMessageMatching("(?s).*(permission denied|must be owner).*");
	}

	@Test
	void startupIsRefusedWhenTheApplicationWouldConnectAsTheOwner() {
		assertThatThrownBy(() -> new ApplicationRoleProvisioner("subtrack", "subtrack", "any-password"))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("must not connect as subtrack");
		assertThatThrownBy(() -> new ApplicationRoleProvisioner("subtrack", "subtrack_app", " "))
			.isInstanceOf(IllegalStateException.class)
			.hasMessageContaining("DB_APP_PASSWORD");
	}

}
