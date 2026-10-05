import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { twoFactorApi, userApi } from '../../api/endpoints'
import type { User } from '../../api/types'
import { AuthContext } from '../../auth/useAuth'
import { demoUser } from '../../test/fixtures'
import DangerZone from './DangerZone'
import EmailSection from './EmailSection'
import PasswordSection from './PasswordSection'
import TwoFactorSection from './TwoFactorSection'

vi.mock('../../api/endpoints')

const NEW_PASSWORD = 'brand-new-pass-2!'
const googleUser: User = { ...demoUser, hasPassword: false }
const startSession = vi.fn()
const clearSession = vi.fn()

function renderFor(user: User, section: ReactElement) {
  const auth = { user, startSession, clearSession, updateUser: vi.fn(), logout: vi.fn() }
  render(<AuthContext.Provider value={auth}>{section}</AuthContext.Provider>)
}

/** Asks for the emailed code and fills it in, the way a paste from the email would. */
async function confirmWithCode(code: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Email me a code' }))
  await userEvent.click(screen.getByLabelText('Digit 1 of 6'))
  await userEvent.paste(code)
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('sensitive changes on an account without a password', () => {
  it('sets the first password only with the emailed code', async () => {
    vi.mocked(userApi.changePassword).mockResolvedValue({ accessToken: 'token', expiresInSeconds: 900, user: demoUser })
    renderFor(googleUser, <PasswordSection />)

    await userEvent.type(screen.getByLabelText(/^New password/, { selector: 'input' }), NEW_PASSWORD)
    expect(screen.getByRole('button', { name: 'Set password' })).toBeDisabled()

    await confirmWithCode('123456')
    expect(userApi.sendConfirmationCode).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Resend in 60s' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }))

    expect(userApi.changePassword).toHaveBeenCalledWith({ confirmationCode: '123456' }, NEW_PASSWORD)
    expect(startSession).toHaveBeenCalled()
  })

  it('starts an email change with the emailed code', async () => {
    renderFor(googleUser, <EmailSection />)

    await userEvent.type(screen.getByLabelText('New email'), 'new@example.com')
    expect(screen.getByRole('button', { name: 'Send confirmation code' })).toBeDisabled()
    await confirmWithCode('123456')
    await userEvent.click(screen.getByRole('button', { name: 'Send confirmation code' }))

    expect(userApi.requestEmailChange).toHaveBeenCalledWith('new@example.com', { confirmationCode: '123456' })
  })

  it('starts two-factor setup with the emailed code', async () => {
    vi.mocked(twoFactorApi.setup).mockResolvedValue({ secret: 'AAAABBBBCCCCDDDD', otpauthUri: 'otpauth://totp/Subtrack' })
    renderFor(googleUser, <TwoFactorSection />)

    await userEvent.click(screen.getByRole('button', { name: 'Set up two-factor' }))
    expect(twoFactorApi.setup).not.toHaveBeenCalled()
    await confirmWithCode('123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(twoFactorApi.setup).toHaveBeenCalledWith({ confirmationCode: '123456' })
  })

  it('deletes the account with the emailed code', async () => {
    renderFor(googleUser, <DangerZone />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }))
    expect(screen.getByRole('button', { name: 'Delete forever' })).toBeDisabled()
    await confirmWithCode('123456')
    await userEvent.click(screen.getByRole('button', { name: 'Delete forever' }))

    expect(userApi.deleteAccount).toHaveBeenCalledWith({ confirmationCode: '123456' })
    expect(clearSession).toHaveBeenCalled()
  })
})

describe('sensitive changes on an account with a password', () => {
  it('sends the current password and never asks for a code', async () => {
    vi.mocked(userApi.changePassword).mockResolvedValue({ accessToken: 'token', expiresInSeconds: 900, user: demoUser })
    renderFor(demoUser, <PasswordSection />)

    expect(screen.queryByRole('button', { name: 'Email me a code' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Current password', { selector: 'input' }), 'correct-horse-1')
    await userEvent.type(screen.getByLabelText(/^New password/, { selector: 'input' }), NEW_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))

    expect(userApi.changePassword).toHaveBeenCalledWith({ currentPassword: 'correct-horse-1' }, NEW_PASSWORD)
    expect(userApi.sendConfirmationCode).not.toHaveBeenCalled()
  })
})
