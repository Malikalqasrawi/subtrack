package com.subtrack.mail;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmailLayoutTest {

	private static final String CODE_EMAIL = """
			Hi,

			Use this code to confirm your email address:

			    482913

			The code expires in 15 minutes. If you did not create a Subtrack account, you can ignore this email.
			""";

	private final EmailLayout layout = new EmailLayout();

	@Test
	void theCodeGetsItsOwnBoxAndEveryParagraphIsKept() {
		String html = layout.html("Your Subtrack verification code", CODE_EMAIL);

		assertThat(html).contains("letter-spacing:8px;color:#2EE59D;\">482913</p>");
		assertThat(html).contains(">Hi,</p>")
			.contains(">Use this code to confirm your email address:</p>")
			.contains(">The code expires in 15 minutes. If you did not create a Subtrack account, you can ignore this email.</p>");
		assertThat(html).contains("<title>Your Subtrack verification code</title>")
			.contains("<h1 style=\"margin:0 0 16px;")
			.contains(">Your Subtrack verification code</h1>");
	}

	@Test
	void theInboxPreviewLeavesOutTheGreetingAndTheCode() {
		String html = layout.html("Your Subtrack verification code", CODE_EMAIL);

		String preview = html.substring(html.indexOf("overflow:hidden;\">") + 18, html.indexOf("</div>"));
		assertThat(preview).startsWith("Use this code to confirm your email address: The code expires in 15 minutes.")
			.doesNotContain("482913")
			.doesNotContain("Hi,")
			.endsWith("…");
		assertThat(preview.length()).isLessThanOrEqualTo(120);
	}

	@Test
	void textThatCameFromAUserCannotBecomeMarkup() {
		String html = layout.html("<b>Tom & Jerry</b> renews today", """
				Hi Malik,

				Your <script>alert("x")</script> subscription renews today.
				""");

		assertThat(html).doesNotContain("<script>").doesNotContain("<b>Tom");
		assertThat(html).contains("&lt;b&gt;Tom &amp; Jerry&lt;/b&gt; renews today")
			.contains("Your &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; subscription renews today.");
	}

	@Test
	void anEmailWithoutACodeIsOnlyParagraphs() {
		String html = layout.html("Your Subtrack password was changed", """
				Hi,

				The password on your Subtrack account was just changed.

				If this was you, there is nothing to do.
				""");

		assertThat(html).doesNotContain("letter-spacing:8px");
		assertThat(html.split("<p style=", -1)).hasSize(4);
	}

	@Test
	void aSixDigitNumberInsideASentenceStaysInTheSentence() {
		String html = layout.html("Receipt", """
				Your order 123456 was paid.
				""");

		assertThat(html).doesNotContain("letter-spacing:8px").contains(">Your order 123456 was paid.</p>");
	}

	@Test
	void lineBreaksInsideAParagraphAreKept() {
		String html = layout.html("Summary", """
				Netflix: $15.99
				Spotify: $5.99
				""");

		assertThat(html).contains(">Netflix: $15.99<br>Spotify: $5.99</p>");
	}

}
