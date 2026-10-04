import { isStrongPassword, isValidPhone, normalizePhone } from '@/lib/password';

describe('isStrongPassword', () => {
  it('accepts a password with a letter, a number and a special character', () => {
    expect(isStrongPassword('Subtrack#2026')).toBe(true);
  });

  it.each(['Ab1!', 'abcdefgh!', '12345678!', 'abcd1234', `Ab1!${'x'.repeat(70)}`])('rejects %s', (password) => {
    expect(isStrongPassword(password)).toBe(false);
  });

  it('does not count a space as the special character', () => {
    expect(isStrongPassword('abcd 1234')).toBe(false);
  });
});

describe('phone numbers', () => {
  it('removes spaces, brackets and dashes', () => {
    expect(normalizePhone('+962 (79) 123-4567')).toBe('+962791234567');
  });

  it('accepts international format', () => {
    expect(isValidPhone('+962 79 123 4567')).toBe(true);
  });

  it.each(['0791234567', '+0791234567', '+9627', '+96279123456789012', '+962 79 abc'])('rejects %s', (phone) => {
    expect(isValidPhone(phone)).toBe(false);
  });
});
