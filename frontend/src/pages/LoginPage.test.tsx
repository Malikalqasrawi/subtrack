import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { authApi } from '../api/endpoints'
import { AuthContext } from '../auth/useAuth'
import { demoUser } from '../test/fixtures'
import LoginPage from './LoginPage'

vi.mock('../api/endpoints')

const startSession = vi.fn()
const session = { accessToken: 'token', expiresInSeconds: 900, user: demoUser }

function renderPage() {
  const auth = { user: null, startSession, clearSession: vi.fn(), updateUser: vi.fn(), logout: vi.fn() }
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<p>Verify your email</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

async function signIn(password = 'correct-horse-1') {
  await userEvent.type(screen.getByLabelText('Email'), 'demo@example.com')
  await userEvent.type(screen.getByLabelText('Password', { selector: 'input' }), password)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

beforeEach(() => {
  startSession.mockReset()
  vi.mocked(authApi.publicConfig).mockResolvedValue({ googleClientId: null, appleClientId: null })
})

describe('LoginPage', () => {
  it('starts a session with the right email and password', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ ...session, twoFactorRequired: false })
    renderPage()
    await signIn()

    expect(authApi.login).toHaveBeenCalledWith('demo@example.com', 'correct-horse-1')
    expect(startSession).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'token' }))
  })

  it('asks for a code when the account has two-factor on, and only then signs in', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge-1' })
    vi.mocked(authApi.twoFactor).mockResolvedValue(session)
    renderPage()
    await signIn()

    expect(startSession).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Two-factor check' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(authApi.twoFactor).toHaveBeenCalledWith('challenge-1', '123456')
    expect(startSession).toHaveBeenCalledWith(session)
  })

  it('goes back to the password step when the code step took too long', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge-1' })
    vi.mocked(authApi.twoFactor).mockRejectedValue(new ApiError(401, 'CHALLENGE_EXPIRED', 'That took too long. Sign in again.'))
    renderPage()
    await signIn()
    await userEvent.type(screen.getByLabelText('Code'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('That took too long. Sign in again.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it("shows the server's message for a wrong password or a locked account", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(429, 'ACCOUNT_LOCKED', 'Too many wrong attempts. Try again in 15 minutes, or reset your password.'),
    )
    renderPage()
    await signIn('wrong-password')

    expect(await screen.findByText(/Too many wrong attempts/)).toBeInTheDocument()
    expect(startSession).not.toHaveBeenCalled()
  })

  it('sends an unverified account to the code page with a fresh code', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in'))
    vi.mocked(authApi.resendVerification).mockResolvedValue(undefined)
    renderPage()
    await signIn()

    expect(await screen.findByText('Verify your email')).toBeInTheDocument()
    expect(authApi.resendVerification).toHaveBeenCalledWith('demo@example.com')
  })
})
