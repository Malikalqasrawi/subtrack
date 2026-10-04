package com.subtrack.insights.dto;

import java.math.BigDecimal;

/** @param month ISO year-month, for example 2026-10 */
public record MonthlyProjection(String month, BigDecimal amount) {
}
