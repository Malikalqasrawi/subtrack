import { ApiError } from '@/api/client';
import { errorMessage } from '@/lib/errors';

describe('errorMessage', () => {
  it('uses the message the API sent', () => {
    expect(errorMessage(new ApiError(403, 'WRONG_PASSWORD', 'Your current password is incorrect'), 'Fallback')).toBe(
      'Your current password is incorrect',
    );
  });

  it('prefers the message of a specific field and names the field in words', () => {
    const error = new ApiError(400, 'VALIDATION', 'Check the form', { newPassword: 'must have a special character' });

    expect(errorMessage(error, 'Fallback')).toBe('New password must have a special character');
  });

  it('falls back when the failure is not an error at all', () => {
    expect(errorMessage('boom', 'Could not save your profile')).toBe('Could not save your profile');
  });
});
