package com.subtrack.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import com.subtrack.common.error.ApiErrorWriter;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

class RateLimitFilterTest {

	private final RateLimitFilter filter = new RateLimitFilter(new InMemoryRateLimiter(),
			List.of(new RateLimitRule("auth", "/api/auth/", 3, Duration.ofMinutes(1)),
					new RateLimitRule("api", "/api/", 5, Duration.ofMinutes(1))),
			new ApiErrorWriter(JsonMapper.builder().build()));

	@Test
	void rejectsWith429OnceTheBucketIsEmpty() throws Exception {
		for (int i = 0; i < 3; i++) {
			assertThat(call("/api/auth/login", "1.1.1.1").getStatus()).isEqualTo(200);
		}
		MockHttpServletResponse rejected = call("/api/auth/login", "1.1.1.1");
		assertThat(rejected.getStatus()).isEqualTo(429);
		assertThat(rejected.getHeader("Retry-After")).isNotNull();
		assertThat(rejected.getContentAsString()).contains("RATE_LIMITED");
	}

	@Test
	void eachClientHasItsOwnBucket() throws Exception {
		for (int i = 0; i < 3; i++) {
			call("/api/auth/login", "1.1.1.1");
		}
		assertThat(call("/api/auth/login", "1.1.1.1").getStatus()).isEqualTo(429);
		assertThat(call("/api/auth/login", "2.2.2.2").getStatus()).isEqualTo(200);
	}

	@Test
	void theFirstMatchingRuleWinsAndRulesDoNotShareBuckets() throws Exception {
		for (int i = 0; i < 3; i++) {
			call("/api/auth/login", "1.1.1.1");
		}
		// The auth bucket is empty, but general API calls from the same client still pass.
		assertThat(call("/api/subscriptions", "1.1.1.1").getStatus()).isEqualTo(200);
	}

	@Test
	void rulesWithTheSameNameShareOneBucket() throws Exception {
		RateLimitFilter emailing = new RateLimitFilter(new InMemoryRateLimiter(),
				List.of(new RateLimitRule("emailed-codes", "/api/auth/register", 2, Duration.ofHours(1)),
						new RateLimitRule("emailed-codes", "/api/auth/forgot-password", 2, Duration.ofHours(1))),
				new ApiErrorWriter(JsonMapper.builder().build()));

		assertThat(call(emailing, "/api/auth/register", "1.1.1.1").getStatus()).isEqualTo(200);
		assertThat(call(emailing, "/api/auth/forgot-password", "1.1.1.1").getStatus()).isEqualTo(200);

		assertThat(call(emailing, "/api/auth/register", "1.1.1.1").getStatus()).isEqualTo(429);
		assertThat(call(emailing, "/api/auth/forgot-password", "1.1.1.1").getStatus()).isEqualTo(429);
		assertThat(call(emailing, "/api/auth/forgot-password", "2.2.2.2").getStatus()).isEqualTo(200);
	}

	@Test
	void pathsWithoutARuleAreNotLimited() throws Exception {
		for (int i = 0; i < 20; i++) {
			assertThat(call("/actuator/health", "1.1.1.1").getStatus()).isEqualTo(200);
		}
	}

	private MockHttpServletResponse call(String path, String ip) throws Exception {
		return call(filter, path, ip);
	}

	private static MockHttpServletResponse call(RateLimitFilter filter, String path, String ip) throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
		request.setRemoteAddr(ip);
		MockHttpServletResponse response = new MockHttpServletResponse();
		filter.doFilter(request, response, new MockFilterChain());
		return response;
	}

}
