package com.subtrack.common;

import com.subtrack.config.AppProperties;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Encrypts values the server must be able to read back but that should not be readable from a
 * copy of the database, such as two-factor secrets. AES-256-GCM with a random nonce per value;
 * the key never touches the database. Stored as "v1:" + Base64(nonce + data).
 */
@Component
public class SecretBox {

	private static final String PREFIX = "v1:";

	private static final int NONCE_BYTES = 12;

	private static final int TAG_BITS = 128;

	private static final String HOW_TO = "Create one with: openssl rand -base64 32";

	private final SecretKeySpec key;

	private final SecureRandom random = new SecureRandom();

	@Autowired
	public SecretBox(AppProperties properties) {
		this(properties.security().encryptionKey());
	}

	public SecretBox(String base64Key) {
		if (base64Key == null || base64Key.isBlank()) {
			throw new IllegalStateException("ENCRYPTION_KEY is not set. " + HOW_TO);
		}
		byte[] bytes;
		try {
			bytes = Base64.getDecoder().decode(base64Key.trim());
		}
		catch (IllegalArgumentException ex) {
			throw new IllegalStateException("ENCRYPTION_KEY must be Base64. " + HOW_TO);
		}
		if (bytes.length != 32) {
			throw new IllegalStateException("ENCRYPTION_KEY must be 32 bytes. " + HOW_TO);
		}
		this.key = new SecretKeySpec(bytes, "AES");
	}

	public String seal(String plain) {
		if (plain == null) {
			return null;
		}
		try {
			byte[] nonce = new byte[NONCE_BYTES];
			random.nextBytes(nonce);
			Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
			cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, nonce));
			byte[] data = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
			return PREFIX + Base64.getEncoder()
				.encodeToString(ByteBuffer.allocate(nonce.length + data.length).put(nonce).put(data).array());
		}
		catch (GeneralSecurityException ex) {
			throw new IllegalStateException("Could not encrypt", ex);
		}
	}

	/** The original value. Values saved before encryption was added are returned as they are. */
	public String open(String sealed) {
		if (!isSealed(sealed)) {
			return sealed;
		}
		try {
			byte[] all = Base64.getDecoder().decode(sealed.substring(PREFIX.length()));
			Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
			cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, all, 0, NONCE_BYTES));
			return new String(cipher.doFinal(all, NONCE_BYTES, all.length - NONCE_BYTES), StandardCharsets.UTF_8);
		}
		catch (GeneralSecurityException | IllegalArgumentException ex) {
			throw new IllegalStateException("Could not decrypt a stored secret. Was ENCRYPTION_KEY changed?", ex);
		}
	}

	public static boolean isSealed(String value) {
		return value != null && value.startsWith(PREFIX);
	}

}
