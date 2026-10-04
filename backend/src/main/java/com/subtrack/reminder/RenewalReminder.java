package com.subtrack.reminder;

import java.math.BigDecimal;
import java.time.LocalDate;

public record RenewalReminder(String recipientEmail, String recipientName, String subscriptionName,
		BigDecimal amount, String currency, LocalDate renewalDate, long daysUntilRenewal) {
}
