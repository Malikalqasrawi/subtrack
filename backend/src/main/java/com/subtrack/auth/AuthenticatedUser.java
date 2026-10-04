package com.subtrack.auth;

import java.util.UUID;

/** The principal placed in the security context for an authenticated request. */
public record AuthenticatedUser(UUID id, String email) {
}
