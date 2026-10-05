package com.subtrack.insights;

import com.subtrack.common.RowAccess;
import com.subtrack.currency.CurrencyConverter;
import com.subtrack.insights.dto.CalendarMonth;
import com.subtrack.insights.dto.CategorySpend;
import com.subtrack.insights.dto.DashboardSummary;
import com.subtrack.insights.dto.MonthlyProjection;
import com.subtrack.insights.dto.RenewalEntry;
import com.subtrack.subscription.Category;
import com.subtrack.subscription.Subscription;
import com.subtrack.subscription.SubscriptionRepository;
import com.subtrack.subscription.SubscriptionStatus;
import com.subtrack.user.UserService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Read-only views over a user's active subscriptions: totals, upcoming renewals, calendar. */
@Service
public class InsightsService {

	static final int UPCOMING_DAYS = 30;

	static final int PROJECTION_MONTHS = 12;

	private final SubscriptionRepository subscriptions;

	private final UserService userService;

	private final CurrencyConverter currencyConverter;

	private final RowAccess rowAccess;

	private final Clock clock;

	public InsightsService(SubscriptionRepository subscriptions, UserService userService,
			CurrencyConverter currencyConverter, RowAccess rowAccess, Clock clock) {
		this.subscriptions = subscriptions;
		this.userService = userService;
		this.currencyConverter = currencyConverter;
		this.rowAccess = rowAccess;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public DashboardSummary summary(UUID userId) {
		rowAccess.asUser(userId);
		String currency = userService.getById(userId).getDefaultCurrency();
		List<Subscription> active = subscriptions.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);
		LocalDate today = LocalDate.now(clock);

		BigDecimal monthlyTotal = BigDecimal.ZERO;
		BigDecimal yearlyTotal = BigDecimal.ZERO;
		for (Subscription s : active) {
			monthlyTotal = monthlyTotal.add(currencyConverter.convert(s.monthlyCost(), s.getCurrency(), currency));
			yearlyTotal = yearlyTotal.add(currencyConverter.convert(s.yearlyCost(), s.getCurrency(), currency));
		}

		List<RenewalEntry> upcoming = renewalsBetween(active, today, today.plusDays(UPCOMING_DAYS), currency);

		List<MonthlyProjection> projection = new ArrayList<>();
		YearMonth firstMonth = YearMonth.from(today);
		for (int i = 0; i < PROJECTION_MONTHS; i++) {
			YearMonth month = firstMonth.plusMonths(i);
			List<RenewalEntry> charges = renewalsBetween(active, month.atDay(1), month.atEndOfMonth(), currency);
			projection.add(new MonthlyProjection(month.toString(), total(charges)));
		}

		return new DashboardSummary(currency, monthlyTotal, yearlyTotal, active.size(),
				spendByCategory(active, currency), upcoming, projection, currencyConverter.ratesAsOf());
	}

	@Transactional(readOnly = true)
	public CalendarMonth calendar(UUID userId, YearMonth month) {
		rowAccess.asUser(userId);
		String currency = userService.getById(userId).getDefaultCurrency();
		List<Subscription> active = subscriptions.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);
		List<RenewalEntry> renewals = renewalsBetween(active, month.atDay(1), month.atEndOfMonth(), currency);
		return new CalendarMonth(month.toString(), currency, total(renewals), renewals);
	}

	private List<RenewalEntry> renewalsBetween(List<Subscription> active, LocalDate from, LocalDate to,
			String currency) {
		List<RenewalEntry> entries = new ArrayList<>();
		for (Subscription s : active) {
			BigDecimal converted = currencyConverter.convert(s.getAmount(), s.getCurrency(), currency);
			for (LocalDate date : s.renewalsBetween(from, to)) {
				entries.add(new RenewalEntry(s.getId(), s.getName(), s.getCategory(), date, s.getAmount(),
						s.getCurrency(), converted));
			}
		}
		entries.sort(Comparator.comparing(RenewalEntry::date).thenComparing(RenewalEntry::name));
		return entries;
	}

	private List<CategorySpend> spendByCategory(List<Subscription> active, String currency) {
		Map<Category, List<Subscription>> grouped = active.stream()
			.collect(Collectors.groupingBy(Subscription::getCategory));
		return grouped.entrySet().stream().map(entry -> {
			BigDecimal monthly = entry.getValue()
				.stream()
				.map(s -> currencyConverter.convert(s.monthlyCost(), s.getCurrency(), currency))
				.reduce(BigDecimal.ZERO, BigDecimal::add);
			return new CategorySpend(entry.getKey(), monthly, entry.getValue().size());
		}).sorted(Comparator.comparing(CategorySpend::monthlyAmount).reversed()).toList();
	}

	private static BigDecimal total(List<RenewalEntry> entries) {
		return entries.stream().map(RenewalEntry::convertedAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
	}

}
