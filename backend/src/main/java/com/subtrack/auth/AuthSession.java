package com.subtrack.auth;

import com.subtrack.user.User;

/** The tokens handed out when a user signs in or refreshes. */
public record AuthSession(User user, String accessToken, String refreshToken) {
}
