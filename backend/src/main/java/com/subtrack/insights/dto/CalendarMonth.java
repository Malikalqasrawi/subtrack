package com.subtrack.insights.dto;

import java.math.BigDecimal;
import java.util.List;

public record CalendarMonth(String month, String currency, BigDecimal total, List<RenewalEntry> renewals) {
}
