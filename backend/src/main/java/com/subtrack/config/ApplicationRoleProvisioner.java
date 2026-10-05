package com.subtrack.config;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.flywaydb.core.api.callback.Callback;
import org.flywaydb.core.api.callback.Context;
import org.flywaydb.core.api.callback.Event;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Sets up the database login the application itself uses, after every migration.
 *
 * Migrations run as the owner of the schema. Everything else goes through a second login that
 * can read and write rows and nothing more: it cannot change the schema, create logins or
 * bypass row level security.
 */
@Component
public class ApplicationRoleProvisioner implements Callback {

	private final String role;

	private final String password;

	public ApplicationRoleProvisioner(@Value("${spring.flyway.user}") String owner,
			@Value("${spring.datasource.username}") String role,
			@Value("${spring.datasource.password}") String password) {
		if (role.equals(owner)) {
			throw new IllegalStateException("The application must not connect as " + owner
					+ ", the owner of the schema. Set DB_APP_USERNAME to another name.");
		}
		if (password.isBlank()) {
			throw new IllegalStateException("DB_APP_PASSWORD is not set. Create one with: openssl rand -hex 24");
		}
		this.role = role;
		this.password = password;
	}

	@Override
	public boolean supports(Event event, Context context) {
		return event == Event.AFTER_MIGRATE;
	}

	@Override
	public boolean canHandleInTransaction(Event event, Context context) {
		return true;
	}

	@Override
	public String getCallbackName() {
		return "application role";
	}

	@Override
	public void handle(Event event, Context context) {
		try {
			Connection connection = context.getConnection();
			if (!exists(connection)) {
				execute(connection, format(connection, "create role %I", role));
			}
			execute(connection, format(connection, "alter role %I with login password %L", role, password));
			execute(connection, format(connection, "grant usage on schema public to %I", role));
			execute(connection,
					format(connection, "grant select, insert, update, delete on all tables in schema public to %I", role));
			// Which migrations have run is the owner's business.
			execute(connection, format(connection, "revoke all on flyway_schema_history from %I", role));
			requireNoSpecialRights(connection);
		}
		catch (SQLException ex) {
			throw new IllegalStateException("Could not set up the application's database login", ex);
		}
	}

	private boolean exists(Connection connection) throws SQLException {
		try (PreparedStatement statement = connection.prepareStatement("select 1 from pg_roles where rolname = ?")) {
			statement.setString(1, role);
			try (ResultSet found = statement.executeQuery()) {
				return found.next();
			}
		}
	}

	/** A login that already existed keeps what it was given, so this is checked rather than assumed. */
	private void requireNoSpecialRights(Connection connection) throws SQLException {
		String sql = "select rolsuper or rolbypassrls or rolcreaterole or rolcreatedb from pg_roles where rolname = ?";
		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, role);
			try (ResultSet found = statement.executeQuery()) {
				if (found.next() && found.getBoolean(1)) {
					throw new IllegalStateException("The database login " + role
							+ " has more rights than the application may have. Use a login without superuser,"
							+ " BYPASSRLS, CREATEROLE or CREATEDB.");
				}
			}
		}
	}

	/** Lets PostgreSQL quote the names (%I) and values (%L), so nothing is pasted into a statement by hand. */
	private static String format(Connection connection, String template, String... arguments) throws SQLException {
		String sql = "select format(?::text" + ", ?::text".repeat(arguments.length) + ")";
		try (PreparedStatement statement = connection.prepareStatement(sql)) {
			statement.setString(1, template);
			for (int i = 0; i < arguments.length; i++) {
				statement.setString(i + 2, arguments[i]);
			}
			try (ResultSet formatted = statement.executeQuery()) {
				formatted.next();
				return formatted.getString(1);
			}
		}
	}

	private static void execute(Connection connection, String sql) throws SQLException {
		try (Statement statement = connection.createStatement()) {
			statement.execute(sql);
		}
	}

}
