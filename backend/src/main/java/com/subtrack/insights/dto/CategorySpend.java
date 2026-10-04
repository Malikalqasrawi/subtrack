package com.subtrack.insights.dto;

import com.subtrack.subscription.Category;
import java.math.BigDecimal;

public record CategorySpend(Category category, BigDecimal monthlyAmount, int count) {
}
