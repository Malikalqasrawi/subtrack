package com.subtrack.auth.dto;

import jakarta.validation.constraints.Size;

/** @param refreshToken sent by the mobile app; browsers send theirs as a cookie and no body */
public record RefreshRequest(@Size(max = 200) String refreshToken) {
}
