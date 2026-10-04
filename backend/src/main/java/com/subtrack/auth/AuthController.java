package com.subtrack.auth;

import com.subtrack.auth.dto.AuthResponse;
import com.subtrack.auth.dto.ForgotPasswordRequest;
import com.subtrack.auth.dto.LoginRequest;
import com.subtrack.auth.dto.RefreshRequest;
import com.subtrack.auth.dto.RegisterRequest;
import com.subtrack.auth.dto.ResendVerificationRequest;
import com.subtrack.auth.dto.ResetPasswordRequest;
import com.subtrack.auth.dto.SocialLoginRequest;
import com.subtrack.auth.dto.TwoFactorLoginRequest;
import com.subtrack.auth.dto.VerifyEmailRequest;
import com.subtrack.auth.session.RefreshCookieFactory;
import com.subtrack.auth.session.SessionResponses;
import com.subtrack.auth.social.SocialProvider;
import com.subtrack.common.error.UnauthorizedException;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	private final SessionResponses sessionResponses;

	private final RefreshCookieFactory refreshCookies;

	public AuthController(AuthService authService, SessionResponses sessionResponses,
			RefreshCookieFactory refreshCookies) {
		this.authService = authService;
		this.sessionResponses = sessionResponses;
		this.refreshCookies = refreshCookies;
	}

	@PostMapping("/register")
	public ResponseEntity<Void> register(@Valid @RequestBody RegisterRequest request) {
		authService.register(request);
		return ResponseEntity.accepted().build();
	}

	@PostMapping("/resend-verification")
	public ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
		authService.resendVerification(request.email());
		return ResponseEntity.accepted().build();
	}

	@PostMapping("/verify")
	public ResponseEntity<AuthResponse> verify(@Valid @RequestBody VerifyEmailRequest request,
			@RequestHeader(name = SessionResponses.CLIENT_HEADER, required = false) String client) {
		return sessionResponses.respond(authService.verifyEmail(request), client);
	}

	@PostMapping("/login")
	public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request,
			@RequestHeader(name = SessionResponses.CLIENT_HEADER, required = false) String client) {
		return signInResponse(authService.login(request), client);
	}

	@PostMapping("/google")
	public ResponseEntity<AuthResponse> google(@Valid @RequestBody SocialLoginRequest request,
			@RequestHeader(name = SessionResponses.CLIENT_HEADER, required = false) String client) {
		return signInResponse(authService.socialLogin(SocialProvider.GOOGLE, request.idToken(), request.name()),
				client);
	}

	@PostMapping("/apple")
	public ResponseEntity<AuthResponse> apple(@Valid @RequestBody SocialLoginRequest request,
			@RequestHeader(name = SessionResponses.CLIENT_HEADER, required = false) String client) {
		return signInResponse(authService.socialLogin(SocialProvider.APPLE, request.idToken(), request.name()),
				client);
	}

	@PostMapping("/2fa")
	public ResponseEntity<AuthResponse> twoFactor(@Valid @RequestBody TwoFactorLoginRequest request,
			@RequestHeader(name = SessionResponses.CLIENT_HEADER, required = false) String client) {
		return sessionResponses.respond(authService.completeTwoFactor(request.challengeToken(), request.code()),
				client);
	}

	@PostMapping("/forgot-password")
	public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
		authService.forgotPassword(request.email());
		return ResponseEntity.accepted().build();
	}

	@PostMapping("/reset-password")
	public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
		authService.resetPassword(request);
		return ResponseEntity.noContent().build();
	}

	/**
	 * A token that arrived as a cookie is answered with a cookie, whatever the request claims to
	 * be, so a script in a browser page can never get a refresh token into its hands.
	 */
	@PostMapping("/refresh")
	public ResponseEntity<AuthResponse> refresh(
			@CookieValue(name = RefreshCookieFactory.NAME, required = false) String cookieToken,
			@Valid @RequestBody(required = false) RefreshRequest request) {
		String appToken = request == null ? null : request.refreshToken();
		if (appToken != null) {
			return sessionResponses.forApp(authService.refresh(appToken));
		}
		if (cookieToken == null) {
			throw new UnauthorizedException("INVALID_REFRESH_TOKEN", "Not signed in");
		}
		return sessionResponses.forBrowser(authService.refresh(cookieToken));
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(
			@CookieValue(name = RefreshCookieFactory.NAME, required = false) String cookieToken,
			@Valid @RequestBody(required = false) RefreshRequest request) {
		String appToken = request == null ? null : request.refreshToken();
		if (appToken != null) {
			authService.logout(appToken);
		}
		if (cookieToken != null) {
			authService.logout(cookieToken);
		}
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, refreshCookies.expire().toString()).build();
	}

	private ResponseEntity<AuthResponse> signInResponse(SignInResult result, String client) {
		return switch (result) {
			case SignInResult.SignedIn signedIn -> sessionResponses.respond(signedIn.session(), client);
			case SignInResult.TwoFactorRequired challenge ->
				ResponseEntity.ok(AuthResponse.secondFactorNeeded(challenge.challengeToken()));
		};
	}

}
