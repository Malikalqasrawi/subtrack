import { isValidEmail } from '@/lib/email';

describe('isValidEmail', () => {
  it.each(['malik@example.com', ' malik@example.com ', 'first.last+tag@mail.example.co'])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(['', 'malik', 'malik@', '@example.com', 'malik@example', 'malik @example.com', 'malik@exa mple.com', 'a@b@c.com'])(
    'rejects %s',
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});
