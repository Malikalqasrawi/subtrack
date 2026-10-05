package com.subtrack.user;

import com.subtrack.auth.AuthSession;
import com.subtrack.auth.AuthenticatedUser;
import com.subtrack.auth.dto.AuthResponse;
import com.subtrack.auth.session.RefreshCookieFactory;
import com.subtrack.auth.session.SessionResponses;
import com.subtrack.user.dto.ChangeEmailRequest;
import com.subtrack.user.dto.ChangePasswordRequest;
import com.subtrack.user.dto.ConfirmEmailChangeRequest;
import com.subtrack.user.dto.DeleteAccountRequest;
import com.subtrack.user.dto.UpdateProfileRequest;
import com.subtrack.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
public class UserController {

	private final UserService userService;

	private final AccountService accountService;

	private final SessionResponses sessionResponses;

	private final RefreshCookieFactory refreshCookies;

	public UserController(UserService userService, AccountService accountService, SessionResponses sessionResponses,
			RefreshCookieFactory refreshCookies) {
		this.userService = userService;
		this.accountService = accountService;
		this.sessionResponses = sessionResponses;
		this.refreshCookies = refreshCookies;
	}

	@GetMapping
	public UserResponse me(@AuthenticationPrincipal AuthenticatedUser me) {
		return UserResponse.from(userService.getById(me.id()));
	}

	@PutMapping
	public UserResponse update(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody UpdateProfileRequest request) {
		return UserResponse.from(userService.updateProfile(me.id(), request));
	}

	@PostMapping("/password")
	public ResponseEntity<AuthResponse> changePassword(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody ChangePasswordRequest request,
			@RequestHeader(name = SessionResponses.CLIENT_HEADER, required = false) String client) {
		AuthSession session = accountService.changePassword(me.id(), request.currentPassword(),
				request.confirmationCode(), request.newPassword());
		return sessionResponses.respond(session, client);
	}

	/** For accounts without a password: the code they send along with a sensitive change. */
	@PostMapping("/confirmation-code")
	public ResponseEntity<Void> sendConfirmationCode(@AuthenticationPrincipal AuthenticatedUser me) {
		accountService.sendConfirmationCode(me.id());
		return ResponseEntity.accepted().build();
	}

	@PostMapping("/logout-all")
	public ResponseEntity<Void> logoutEverywhere(@AuthenticationPrincipal AuthenticatedUser me) {
		accountService.logoutEverywhere(me.id());
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, refreshCookies.expire().toString()).build();
	}

	@PostMapping("/email")
	public ResponseEntity<Void> requestEmailChange(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody ChangeEmailRequest request) {
		accountService.requestEmailChange(me.id(), request.newEmail(), request.currentPassword(),
				request.confirmationCode());
		return ResponseEntity.accepted().build();
	}

	@PostMapping("/email/confirm")
	public UserResponse confirmEmailChange(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody ConfirmEmailChangeRequest request) {
		return UserResponse.from(accountService.confirmEmailChange(me.id(), request.code()));
	}

	@DeleteMapping
	public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody DeleteAccountRequest request) {
		accountService.deleteAccount(me.id(), request.currentPassword(), request.confirmationCode());
		return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, refreshCookies.expire().toString()).build();
	}

}
