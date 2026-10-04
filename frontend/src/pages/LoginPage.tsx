import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { authApi } from '../api/endpoints'
import type { AuthResponse } from '../api/types'
import { useAuth } from '../auth/useAuth'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import PasswordField from '../components/PasswordField'
import SocialButtons from '../components/SocialButtons'

export default function LoginPage() {
  const { startSession } = useAuth()
  const navigate = useNavigate()
  // The sign-up page hands over a challenge when a Google/Apple account has two-factor on.
  const handedOver = (useLocation().state as { challengeToken?: string } | null)?.challengeToken
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [challengeToken, setChallengeToken] = useState(handedOver)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  /** Finishes sign-in, or moves to the second step when the account has two-factor on. */
  function onResult(result: AuthResponse) {
    setError(undefined)
    if (result.twoFactorRequired) setChallengeToken(result.challengeToken)
    else startSession(result)
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(undefined)
    try {
      onResult(await authApi.login(email, password))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        // The password was right, so carry it along: verifying needs it too.
        await authApi.resendVerification(email).catch(() => {})
        navigate('/verify', { state: { email, password } })
        return
      }
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitCode(event: FormEvent) {
    event.preventDefault()
    if (!challengeToken) return
    setSubmitting(true)
    setError(undefined)
    try {
      startSession(await authApi.twoFactor(challengeToken, code))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CHALLENGE_EXPIRED') setChallengeToken(undefined)
      setError(err instanceof Error ? err.message : 'Could not check the code')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  if (challengeToken) {
    return (
      <AuthLayout title="Two-factor check" subtitle="Enter the 6-digit code from your authenticator app, or one of your recovery codes.">
        <form onSubmit={submitCode} className="form">
          <Field label="Code">
            <input
              className="code-single"
              value={code}
              onChange={(event) => setCode(event.target.value.trim())}
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={20}
              required
              autoFocus
            />
          </Field>
          {error && <div className="alert">{error}</div>}
          <button className="button primary" disabled={submitting || code.length < 6}>
            {submitting ? 'Checking…' : 'Continue'}
          </button>
        </form>
        <p className="auth-switch">
          <button className="link-button" onClick={() => setChallengeToken(undefined)}>
            Back to sign in
          </button>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to see what renews next.">
      <form onSubmit={submitPassword} className="form">
        <Field label="Email">
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required autoFocus />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <Link className="forgot-link" to="/forgot-password" state={{ email }}>
          Forgot password?
        </Link>
        {error && <div className="alert">{error}</div>}
        <button className="button primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <SocialButtons onResult={onResult} onError={setError} />
      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  )
}
