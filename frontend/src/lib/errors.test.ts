import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { errorMessage } from './errors'

describe('errorMessage', () => {
  it('prefers the first field error and names the field in words', () => {
    const error = new ApiError(400, 'VALIDATION_FAILED', 'Some fields are invalid', { phoneNumber: 'must be in international format' })
    expect(errorMessage(error, 'fallback')).toBe('Phone number must be in international format')
  })

  it('uses the server message when no field is to blame', () => {
    expect(errorMessage(new ApiError(403, 'WRONG_PASSWORD', 'Your current password is incorrect'), 'fallback')).toBe(
      'Your current password is incorrect',
    )
  })

  it('falls back for anything that is not an error', () => {
    expect(errorMessage('boom', 'Could not save')).toBe('Could not save')
  })
})
