package com.subtrack.config;

import com.subtrack.auth.JwtAuthenticationFilter;
import com.subtrack.auth.token.AccessTokenService;
import com.subtrack.common.error.ApiError;
import com.subtrack.common.error.ApiErrorWriter;
import com.subtrack.ratelimit.RateLimitFilter;
import com.subtrack.ratelimit.RateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

	/**
	 * Sign-in is handled by AuthService, not by Spring Security's username/password machinery.
	 * Declaring this bean stops Spring Boot from creating a default user with a generated password.
	 */
	@Bean
	public UserDetailsService userDetailsService() {
		return username -> {
			throw new UsernameNotFoundException(username);
		};
	}

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http, AccessTokenService accessTokens,
			RateLimiter rateLimiter, ApiErrorWriter errorWriter, AppProperties properties) throws Exception {
		http
			// No server-side session and no cookie-based authentication for API calls: the access
			// token travels in a header, which a cross-site form cannot set, so CSRF tokens add nothing.
			.csrf(AbstractHttpConfigurer::disable)
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			.logout(AbstractHttpConfigurer::disable)
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/api/auth/**", "/api/public/**", "/actuator/health", "/error").permitAll()
				.anyRequest().authenticated())
			.exceptionHandling(errors -> errors
				.authenticationEntryPoint((request, response, ex) -> errorWriter.write(response,
						ApiError.of(401, "UNAUTHORIZED", "Sign in to continue")))
				.accessDeniedHandler((request, response, ex) -> errorWriter.write(response,
						ApiError.of(403, "FORBIDDEN", "You cannot do that"))))
			.addFilterBefore(new JwtAuthenticationFilter(accessTokens), UsernamePasswordAuthenticationFilter.class);

		AppProperties.RateLimit rateLimit = properties.rateLimit();
		if (rateLimit.enabled()) {
			// Runs before authentication so that even rejected logins count against the limit.
			http.addFilterBefore(new RateLimitFilter(rateLimiter, rateLimit.rules(), errorWriter),
					JwtAuthenticationFilter.class);
		}
		return http.build();
	}

}
