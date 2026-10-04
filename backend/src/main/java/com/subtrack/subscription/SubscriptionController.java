package com.subtrack.subscription;

import com.subtrack.auth.AuthenticatedUser;
import com.subtrack.subscription.dto.SubscriptionRequest;
import com.subtrack.subscription.dto.SubscriptionResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

	private final SubscriptionService subscriptionService;

	public SubscriptionController(SubscriptionService subscriptionService) {
		this.subscriptionService = subscriptionService;
	}

	@GetMapping
	public List<SubscriptionResponse> list(@AuthenticationPrincipal AuthenticatedUser me) {
		return subscriptionService.list(me.id());
	}

	@GetMapping("/{id}")
	public SubscriptionResponse get(@AuthenticationPrincipal AuthenticatedUser me, @PathVariable UUID id) {
		return subscriptionService.get(me.id(), id);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public SubscriptionResponse create(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody SubscriptionRequest request) {
		return subscriptionService.create(me.id(), request);
	}

	@PutMapping("/{id}")
	public SubscriptionResponse update(@AuthenticationPrincipal AuthenticatedUser me, @PathVariable UUID id,
			@Valid @RequestBody SubscriptionRequest request) {
		return subscriptionService.update(me.id(), id, request);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@AuthenticationPrincipal AuthenticatedUser me, @PathVariable UUID id) {
		subscriptionService.delete(me.id(), id);
	}

}
