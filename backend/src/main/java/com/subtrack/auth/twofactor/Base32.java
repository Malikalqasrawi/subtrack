package com.subtrack.auth.twofactor;

import java.io.ByteArrayOutputStream;

/** RFC 4648 Base32 without padding, the encoding authenticator apps expect for secrets. */
final class Base32 {

	private static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

	private Base32() {
	}

	static String encode(byte[] data) {
		StringBuilder encoded = new StringBuilder();
		int buffer = 0;
		int bitsInBuffer = 0;
		for (byte b : data) {
			buffer = (buffer << 8) | (b & 0xFF);
			bitsInBuffer += 8;
			while (bitsInBuffer >= 5) {
				encoded.append(ALPHABET.charAt((buffer >> (bitsInBuffer - 5)) & 0x1F));
				bitsInBuffer -= 5;
			}
		}
		if (bitsInBuffer > 0) {
			encoded.append(ALPHABET.charAt((buffer << (5 - bitsInBuffer)) & 0x1F));
		}
		return encoded.toString();
	}

	static byte[] decode(String encoded) {
		ByteArrayOutputStream decoded = new ByteArrayOutputStream();
		int buffer = 0;
		int bitsInBuffer = 0;
		for (char c : encoded.toCharArray()) {
			int value = ALPHABET.indexOf(Character.toUpperCase(c));
			if (value < 0) {
				throw new IllegalArgumentException("Not a Base32 character: " + c);
			}
			buffer = (buffer << 5) | value;
			bitsInBuffer += 5;
			if (bitsInBuffer >= 8) {
				decoded.write((buffer >> (bitsInBuffer - 8)) & 0xFF);
				bitsInBuffer -= 8;
			}
		}
		return decoded.toByteArray();
	}

}
