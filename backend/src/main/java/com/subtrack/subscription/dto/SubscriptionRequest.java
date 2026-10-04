package com.subtrack.subscription.dto;

import com.subtrack.subscription.BillingCycle;
import com.subtrack.subscription.Category;
import com.subtrack.subscription.SubscriptionDetails;
import com.subtrack.subscription.SubscriptionStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record SubscriptionRequest(@NotBlank @Size(max = 100) @Pattern(regexp = "[^\\p{Cntrl}]*", message = "must not contain line breaks") String name,
		@NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal amount,
		@NotBlank @Pattern(regexp = "[A-Z]{3}", message = "must be a 3-letter currency code") String currency,
		@NotNull BillingCycle billingCycle, @NotNull Category category, @NotNull LocalDate firstBillingDate,
		SubscriptionStatus status, @Min(0) @Max(30) Integer reminderDaysBefore, @Size(max = 500) String notes,
		@Size(max = 255) @Pattern(regexp = "^$|https?://.+", message = "must start with http:// or https://") String websiteUrl) {

	public SubscriptionDetails toDetails() {
		return new SubscriptionDetails(name, amount, currency, billingCycle, category, firstBillingDate,
				status == null ? SubscriptionStatus.ACTIVE : status, reminderDaysBefore, blankToNull(notes),
				blankToNull(websiteUrl));
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

}
