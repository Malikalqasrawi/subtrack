package com.subtrack.auth.twofactor;

import com.subtrack.auth.AuthenticatedUser;
import com.subtrack.auth.twofactor.dto.RecoveryCodesResponse;
import com.subtrack.auth.twofactor.dto.TwoFactorCodeRequest;
import com.subtrack.auth.twofactor.dto.TwoFactorSetupRequest;
import com.subtrack.auth.twofactor.dto.TwoFactorSetupResponse;
import com.subtrack.user.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/2fa")
public class TwoFactorController {

	private final TwoFactorService twoFactorService;

	private final AccountService accountService;

	public TwoFactorController(TwoFactorService twoFactorService, AccountService accountService) {
		this.twoFactorService = twoFactorService;
		this.accountService = accountService;
	}

	@PostMapping("/setup")
	public TwoFactorSetupResponse setup(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody TwoFactorSetupRequest request) {
		accountService.confirmPassword(me.id(), request.currentPassword());
		return twoFactorService.beginSetup(me.id());
	}

	@PostMapping("/enable")
	public RecoveryCodesResponse enable(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody TwoFactorCodeRequest request) {
		return new RecoveryCodesResponse(twoFactorService.enable(me.id(), request.code()));
	}

	@PostMapping("/disable")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void disable(@AuthenticationPrincipal AuthenticatedUser me,
			@Valid @RequestBody TwoFactorCodeRequest request) {
		twoFactorService.disable(me.id(), request.code());
	}

}
