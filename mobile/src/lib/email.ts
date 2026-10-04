/**
 * A quick check for typos before a request is made: something, an @, a domain with a dot.
 * Whether the address really exists is settled by the code that is emailed to it.
 */
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
