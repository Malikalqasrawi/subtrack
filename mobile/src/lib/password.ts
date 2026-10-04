/** The same rules the backend enforces, shown live while the user types. */
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (password: string) => password.length >= 8 && password.length <= 72 },
  { label: 'A letter', test: (password: string) => /\p{L}/u.test(password) },
  { label: 'A number', test: (password: string) => /\p{N}/u.test(password) },
  { label: 'A special character, like ! or #', test: (password: string) => /[^\p{L}\p{N}\s]/u.test(password) },
];

export const isStrongPassword = (password: string) => PASSWORD_RULES.every((rule) => rule.test(password));

/** "+962 79 123-4567" -> "+962791234567" */
export const normalizePhone = (phone: string) => phone.replace(/[\s()-]/g, '');

export const isValidPhone = (phone: string) => /^\+[1-9]\d{7,14}$/.test(normalizePhone(phone));
