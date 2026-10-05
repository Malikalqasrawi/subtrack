package com.subtrack.subscription;

import com.subtrack.common.RowAccess;
import com.subtrack.common.error.BadRequestException;
import com.subtrack.common.error.NotFoundException;
import com.subtrack.currency.CurrencyConverter;
import com.subtrack.subscription.dto.SubscriptionRequest;
import com.subtrack.subscription.dto.SubscriptionResponse;
import com.subtrack.user.User;
import com.subtrack.user.UserService;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionService {

	private final SubscriptionRepository subscriptions;

	private final UserService userService;

	private final CurrencyConverter currencyConverter;

	private final RowAccess rowAccess;

	private final Clock clock;

	public SubscriptionService(SubscriptionRepository subscriptions, UserService userService,
			CurrencyConverter currencyConverter, RowAccess rowAccess, Clock clock) {
		this.subscriptions = subscriptions;
		this.userService = userService;
		this.currencyConverter = currencyConverter;
		this.rowAccess = rowAccess;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public List<SubscriptionResponse> list(UUID userId) {
		rowAccess.asUser(userId);
		User user = userService.getById(userId);
		return subscriptions.findByUserSortedByName(userId)
			.stream()
			.map(subscription -> toResponse(subscription, user))
			.toList();
	}

	@Transactional(readOnly = true)
	public SubscriptionResponse get(UUID userId, UUID id) {
		rowAccess.asUser(userId);
		return toResponse(findOwned(userId, id), userService.getById(userId));
	}

	@Transactional
	public SubscriptionResponse create(UUID userId, SubscriptionRequest request) {
		rowAccess.asUser(userId);
		requireSupportedCurrency(request.currency());
		User user = userService.getById(userId);
		Subscription subscription = subscriptions.save(new Subscription(user, request.toDetails()));
		return toResponse(subscription, user);
	}

	@Transactional
	public SubscriptionResponse update(UUID userId, UUID id, SubscriptionRequest request) {
		rowAccess.asUser(userId);
		requireSupportedCurrency(request.currency());
		Subscription subscription = findOwned(userId, id);
		subscription.apply(request.toDetails());
		return toResponse(subscription, userService.getById(userId));
	}

	@Transactional
	public void delete(UUID userId, UUID id) {
		rowAccess.asUser(userId);
		subscriptions.delete(findOwned(userId, id));
	}

	private Subscription findOwned(UUID userId, UUID id) {
		return subscriptions.findByIdAndUserId(id, userId)
			.orElseThrow(() -> new NotFoundException("Subscription not found"));
	}

	private void requireSupportedCurrency(String currency) {
		if (!currencyConverter.isSupported(currency)) {
			throw new BadRequestException("UNSUPPORTED_CURRENCY", "Unsupported currency: " + currency);
		}
	}

	private SubscriptionResponse toResponse(Subscription s, User user) {
		LocalDate today = LocalDate.now(clock);
		String displayCurrency = user.getDefaultCurrency();
		return new SubscriptionResponse(s.getId(), s.getName(), s.getAmount(), s.getCurrency(), s.getBillingCycle(),
				s.getCategory(), s.getFirstBillingDate(), s.isActive() ? s.nextRenewal(today) : null, s.getStatus(),
				s.getReminderDaysBefore(), s.getNotes(), s.getWebsiteUrl(),
				currencyConverter.convert(s.monthlyCost(), s.getCurrency(), displayCurrency), displayCurrency);
	}

}
