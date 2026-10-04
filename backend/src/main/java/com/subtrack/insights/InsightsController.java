package com.subtrack.insights;

import com.subtrack.auth.AuthenticatedUser;
import com.subtrack.common.error.BadRequestException;
import com.subtrack.insights.dto.CalendarMonth;
import com.subtrack.insights.dto.DashboardSummary;
import java.time.DateTimeException;
import java.time.YearMonth;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

	private final InsightsService insightsService;

	public InsightsController(InsightsService insightsService) {
		this.insightsService = insightsService;
	}

	@GetMapping("/summary")
	public DashboardSummary summary(@AuthenticationPrincipal AuthenticatedUser me) {
		return insightsService.summary(me.id());
	}

	@GetMapping("/calendar")
	public CalendarMonth calendar(@AuthenticationPrincipal AuthenticatedUser me, @RequestParam int year,
			@RequestParam int month) {
		try {
			return insightsService.calendar(me.id(), YearMonth.of(year, month));
		}
		catch (DateTimeException ex) {
			throw new BadRequestException("Invalid year or month");
		}
	}

}
