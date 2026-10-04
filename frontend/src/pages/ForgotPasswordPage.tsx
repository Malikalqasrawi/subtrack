import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { authApi } from '../api/endpoints'
import AuthLayout from '../components/AuthLayout'
import CodeInput from '../components/CodeInput'
import Field from '../components/Field'
import PasswordField from '../components/PasswordField'
import { useToast } from '../components/toast'
import { isStrongPassword } from '../lib/password'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [email, setEmail] = useState((useLocation().state as { email?: string } | null)?.email ?? '')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(undefined)
    try {
      await authApi.forgotPassword(email)
      setCodeSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code')
    } finally {
      setSubmitting(false)
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(undefined)
    try {
      await authApi.resetPassword(email, code, password)
      toast('Password changed. Sign in with your new password.')
      navigate('/login')
    } catch (err) {
      setError(
        err instanceof ApiError && err.fieldErrors.newPassword
          ? `Password ${err.fieldErrors.newPassword}`
          : err instanceof Error
            ? err.message
            : 'Could not reset the password',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!codeSent) {
    return (
      <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send a code to reset it.">
        <form onSubmit={requestCode} className="form">
          <Field label="Email">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required autoFocus />
          </Field>
          {error && <div className="alert">{error}</div>}
          <button className="button primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={
        <>
          If <strong>{email}</strong> has an account, a 6-digit code is on its way. Enter it below.
        </>
      }
    >
      <form onSubmit={reset} className="form">
        <CodeInput value={code} onChange={setCode} autoFocus />
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" showRules />
        {error && <div className="alert">{error}</div>}
        <button className="button primary" disabled={submitting || code.length !== 6 || !isStrongPassword(password)}>
          {submitting ? 'Saving…' : 'Change password'}
        </button>
      </form>
      <p className="auth-switch">
        <button className="link-button" onClick={() => setCodeSent(false)}>
          Use a different email
        </button>
        {' · '}
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
