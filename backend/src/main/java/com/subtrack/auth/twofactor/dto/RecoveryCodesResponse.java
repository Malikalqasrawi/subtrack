package com.subtrack.auth.twofactor.dto;

import java.util.List;

public record RecoveryCodesResponse(List<String> recoveryCodes) {
}
