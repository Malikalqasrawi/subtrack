package com.subtrack.user.dto;

import jakarta.validation.constraints.Size;

public record DeleteAccountRequest(@Size(max = 72) String currentPassword) {
}
