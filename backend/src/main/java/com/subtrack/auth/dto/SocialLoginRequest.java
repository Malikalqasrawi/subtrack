package com.subtrack.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * @param idToken the ID token the provider's sign-in button returned to the browser
 * @param name the person's name if the provider gave it to the browser (Apple does so only once)
 */
public record SocialLoginRequest(@NotBlank @Size(max = 4096) String idToken, @Size(max = 80) String name) {
}
