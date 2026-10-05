package com.subtrack.auth;

import com.subtrack.mail.EmailMessage;
import com.subtrack.mail.EmailSender;
import com.subtrack.ratelimit.RateLimitRule;
import com.subtrack.ratelimit.RateLimiter;
import com.subtrack.user.User;
import java.time.Duration;
import org.springframework.stereotype.Component;

/**
 * Tells the owner of an address that someone tried to sign up with it again, or to move
 * another account to it. Those requests answer everyone the same way, so this email is how a
 * person who forgot they already have an account finds out. It carries nothing the other
 * person typed.
 */
@Component
public class ExistingAccountNotice {

	static final String SUBJECT = "You already have a Subtrack account";

	private static final String BODY = """
			Hi,

			Someone just tried to use this email address for a Subtrack account, but it already has one.

			If it was you, sign in with this address. If you no longer know your password, choose "Forgot password?" on the sign-in screen.

			If it was not you, you can ignore this email. Nothing on your account has changed.
			""";

	/** Anyone can send these requests again and again, so an address hears about it once a day at most. */
	private static final RateLimitRule ONCE_A_DAY = new RateLimitRule("existing-account-notice", "/", 1,
			Duration.ofDays(1));

	private final EmailSender emailSender;

	private final RateLimiter rateLimiter;

	public ExistingAccountNotice(EmailSender emailSender, RateLimiter rateLimiter) {
		this.emailSender = emailSender;
		this.rateLimiter = rateLimiter;
	}

	public void send(User user) {
		if (rateLimiter.tryConsume(user.getId().toString(), ONCE_A_DAY).allowed()) {
			emailSender.send(new EmailMessage(user.getEmail(), SUBJECT, BODY));
		}
	}

}
