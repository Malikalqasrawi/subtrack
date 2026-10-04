package com.subtrack.auth.twofactor.dto;

/**
 * @param secret the key to type into an authenticator app by hand
 * @param otpauthUri the same key as a link, to show as a QR code
 */
public record TwoFactorSetupResponse(String secret, String otpauthUri) {
}
