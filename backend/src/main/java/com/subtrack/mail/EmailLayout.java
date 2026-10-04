package com.subtrack.mail;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Builds the HTML version of an email from its plain text, so the two versions always say the
 * same thing. Blank lines separate paragraphs, and a line holding only a 6-digit code is shown
 * large. Styles are inline because many mail apps ignore style sheets.
 */
@Component
public class EmailLayout {

	private static final Pattern BLANK_LINES = Pattern.compile("\\R\\s*\\R");

	private static final Pattern CODE = Pattern.compile("\\d{6}");

	private static final Pattern GREETING = Pattern.compile("Hi\\b[^\\n]{0,90},");

	private static final int PREVIEW_LENGTH = 120;

	private static final String FONT = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

	private static final String PAGE = """
			<!DOCTYPE html>
			<html lang="en">
			<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<meta name="color-scheme" content="dark">
			<meta name="supported-color-schemes" content="dark">
			<title>%1$s</title>
			</head>
			<body style="margin:0;padding:0;background:#080B10;">
			<div style="display:none;max-height:0;overflow:hidden;">%2$s</div>
			<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#080B10;">
			<tr><td align="center" style="padding:32px 16px;">
			<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;">
			<tr><td style="padding:0 4px 16px;%4$sfont-size:20px;font-weight:800;color:#2EE59D;">Subtrack</td></tr>
			<tr><td style="padding:28px 24px 14px;background:#0F141B;border:1px solid #212A36;border-radius:14px;">
			<h1 style="margin:0 0 16px;%4$sfont-size:20px;line-height:1.3;color:#E9EEF5;">%1$s</h1>
			%3$s</td></tr>
			<tr><td style="padding:16px 4px 0;%4$sfont-size:12px;line-height:1.5;color:#7D899B;">Subtrack keeps track of your subscriptions and what renews next.</td></tr>
			</table>
			</td></tr>
			</table>
			</body>
			</html>
			""";

	private static final String PARAGRAPH = "<p style=\"margin:0 0 14px;" + FONT
			+ "font-size:15px;line-height:1.6;color:#A6B1C2;\">%s</p>\n";

	private static final String CODE_BOX = "<p style=\"margin:4px 0 18px;padding:16px;background:#151B24;border:1px solid #212A36;"
			+ "border-radius:12px;text-align:center;font-family:ui-monospace,Menlo,Consolas,monospace;"
			+ "font-size:30px;font-weight:700;letter-spacing:8px;color:#2EE59D;\">%s</p>\n";

	public String html(String subject, String text) {
		StringBuilder content = new StringBuilder();
		for (String block : blocks(text)) {
			content.append(CODE.matcher(block).matches() ? CODE_BOX.formatted(block)
					: PARAGRAPH.formatted(escape(block).replaceAll("\\R", "<br>")));
		}
		return PAGE.formatted(escape(subject), escape(preview(text)), content, FONT);
	}

	/** The line mail apps show next to the subject: the message itself, without the greeting or a code. */
	private static String preview(String text) {
		List<String> lines = new ArrayList<>();
		for (String block : blocks(text)) {
			if (!CODE.matcher(block).matches() && !GREETING.matcher(block).matches()) {
				lines.add(block.replaceAll("\\s+", " "));
			}
		}
		String preview = String.join(" ", lines);
		return preview.length() <= PREVIEW_LENGTH ? preview : preview.substring(0, PREVIEW_LENGTH - 1).strip() + "…";
	}

	private static List<String> blocks(String text) {
		return BLANK_LINES.splitAsStream(text.strip()).map(String::strip).filter(block -> !block.isEmpty()).toList();
	}

	private static String escape(String value) {
		return value.replace("&", "&amp;")
			.replace("<", "&lt;")
			.replace(">", "&gt;")
			.replace("\"", "&quot;")
			.replace("'", "&#39;");
	}

}
