import { describe, expect, it } from 'vitest'
import { isStrongPassword, isValidPhone, normalizePhone } from './password'

describe('password rules', () => {
  it('accepts a password with a letter, a number and a special character', () => {
    expect(isStrongPassword('correct-horse-1')).toBe(true)
  })

  it.each(['short-1', 'onlyletters!', '12345678!', 'letters123', 'a1!'.padEnd(73, 'x')])('rejects %s', (password) => {
    expect(isStrongPassword(password)).toBe(false)
  })

  it('counts letters and digits from any alphabet', () => {
    expect(isStrongPassword('كلمةسر١٢٣!')).toBe(true)
  })
})

describe('phone numbers', () => {
  it('removes spaces, dashes and brackets', () => {
    expect(normalizePhone('+962 (79) 123-4567')).toBe('+962791234567')
  })

  it('needs the international format', () => {
    expect(isValidPhone('+962 79 123 4567')).toBe(true)
    expect(isValidPhone('0791234567')).toBe(false)
    expect(isValidPhone('+0791234567')).toBe(false)
    expect(isValidPhone('+96279')).toBe(false)
  })
})
