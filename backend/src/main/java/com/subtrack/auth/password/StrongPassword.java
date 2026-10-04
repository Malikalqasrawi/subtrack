package com.subtrack.auth.password;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * The password policy, declared once and reused wherever a new password is accepted:
 * 8 to 72 characters with at least one letter, one number and one special character.
 */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({ ElementType.FIELD, ElementType.RECORD_COMPONENT, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {

	String message() default "must be 8 to 72 characters with a letter, a number and a special character";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}
