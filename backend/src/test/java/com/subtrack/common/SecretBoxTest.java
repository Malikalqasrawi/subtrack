package com.subtrack.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import org.junit.jupiter.api.Test;

class SecretBoxTest {

	private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

	private final SecretBox box = new SecretBox(KEY);

	@Test
	void sealedValuesOpenToTheOriginal() {
		String sealed = box.seal("JBSWY3DPEHPK3PXP");
		assertThat(sealed).startsWith("v1:").doesNotContain("JBSWY3DPEHPK3PXP");
		assertThat(box.open(sealed)).isEqualTo("JBSWY3DPEHPK3PXP");
	}

	@Test
	void theSameValueIsSealedDifferentlyEachTime() {
		assertThat(box.seal("secret")).isNotEqualTo(box.seal("secret"));
	}

	@Test
	void valuesSavedBeforeEncryptionAreReturnedAsTheyAre() {
		assertThat(box.open("JBSWY3DPEHPK3PXP")).isEqualTo("JBSWY3DPEHPK3PXP");
		assertThat(box.open(null)).isNull();
		assertThat(box.seal(null)).isNull();
	}

	@Test
	void anotherKeyOrChangedDataCannotBeOpened() {
		String sealed = box.seal("secret");
		byte[] otherKey = new byte[32];
		otherKey[0] = 1;
		SecretBox other = new SecretBox(Base64.getEncoder().encodeToString(otherKey));
		assertThatThrownBy(() -> other.open(sealed)).isInstanceOf(IllegalStateException.class);

		String tampered = sealed.substring(0, sealed.length() - 4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
		assertThatThrownBy(() -> box.open(tampered)).isInstanceOf(IllegalStateException.class);
	}

	@Test
	void aMissingOrMalformedKeyStopsStartup() {
		assertThatThrownBy(() -> new SecretBox("")).hasMessageContaining("ENCRYPTION_KEY is not set");
		assertThatThrownBy(() -> new SecretBox("not base64!")).hasMessageContaining("must be Base64");
		assertThatThrownBy(() -> new SecretBox(Base64.getEncoder().encodeToString(new byte[16])))
			.hasMessageContaining("32 bytes");
	}

}
