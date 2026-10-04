package com.subtrack.auth;

import com.subtrack.auth.dto.AuthResponse;
import com.subtrack.auth.dto.ForgotPasswordRequest;
import com.subtrack.auth.dto.LoginRequest;
import com.subtrack.auth.dto.RegisterRequest;
import com.subtrack.auth.dto.ResendVerificationRequest;
import com.subtrack.auth.dto.ResetPasswordRequest;
import com.subtrack.auth.dto.SocialLoginRequest;
import com.subtrack.auth.dto.TwoFactorLoginRequest;
import com.subtrack.auth.dto.VerifyEmailRequest;
import com.subtrack.auth.session.RefreshCookieFactory;
import com.subtrack.auth.social.SocialProvider;
import com.subtrack.auth.token.AccessTokenService;
import com.subtrack.common.error.UnauthorizedException;
import com.subtrack.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	private final AccessTokenService accessTokens;

	private final RefreshCookieFactory refreshCookies;

	public AuthController(AuthService authService, AccessTokenService accessTokens,
			RefreshCookieFactory refreshCookies) {
		this.authService = authService;
		this.accessTokens = accessTokens;
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
	public ResponseEntity<AuthResponse> verify(@Valid @RequestBody VerifyEmailRequest request) {
		return sessionResponse(authService.verifyEmail(request));
	}

	@PostMapping("/login")
	public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
		return signInResponse(authService.login(request));
	}

	@PostMapping("/google")
	public ResponseEntity<AuthResponse> google(@Valid @RequestBody SocialLoginRequest request) {
		return signInResponse(authService.socialLogin(SocialProvider.GOOGLE, request.idToken(), request.name()));
	}

	@PostMapping("/apple")
	public ResponseEntity<AuthResponse> apple(@Valid @RequestBody SocialLoginRequest request) {
		return signInResponse(authService.socialLogin(SocialProvider.APPLE, request.idToken(), request.name()));
	}

	@PostMapping("/2fa")
	public ResponseEntity<AuthResponse> twoFactor(@Valid @RequestBody TwoFactorLoginRequest request) {
		return sessionResponse(authService.completeTwoFactor(request.challengeToken(), request.code()));
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

	@PostMapping("/refresh")
	public ResponseEntity<AuthResponse> refresh(
			@CookieValue(name = RefreshCookieFactory.NAME, required = false) String refreshToken) {
		if (refreshToken == null) {
			throw new UnauthorizedException("INVALID_REFRESH_TOKEN", "Not signed in");
		}
		return sessionResponse(authService.refresh(refreshToken));
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(
			@CookieValue(name = RefreshCookieFactory.NAME, required = false) String refreshToken) {
		if (refreshToken != null) {
			authService.logout(refreshToken);
		}
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, refreshCookies.expire().toString()).build();
	}

	private ResponseEntity<AuthResponse> signInResponse(SignInResult result) {
		return switch (result) {
			case SignInResult.SignedIn signedIn -> sessionResponse(signedIn.session());
			case SignInResult.TwoFactorRequired challenge ->
				ResponseEntity.ok(AuthResponse.secondFactorNeeded(challenge.challengeToken()));
		};
	}

	private ResponseEntity<AuthResponse> sessionResponse(AuthSession session) {
		AuthResponse body = AuthResponse.signedIn(session.accessToken(), accessTokens.timeToLive().toSeconds(),
				UserResponse.from(session.user()));
		return ResponseEntity.ok()
			.header(HttpHeaders.SET_COOKIE, refreshCookies.create(session.refreshToken()).toString())
			.body(body);
	}

}
