import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { authApi } from '../api/endpoints'
import type { AuthResponse } from '../api/types'
import { useAuth } from '../auth/useAuth'
import AuthLayout from '../components/AuthLayout'
import Field from '../components/Field'
import PasswordField from '../components/PasswordField'
import SocialButtons from '../components/SocialButtons'
import { isStrongPassword, isValidPhone, normalizePhone } from '../lib/password'

export default function RegisterPage() {
  const { startSession } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)
    if (!isValidPhone(phone)) {
      setFieldErrors({ phoneNumber: 'Use international format, for example +962791234567' })
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    try {
      await authApi.register(email, password, displayName, normalizePhone(phone))
      navigate('/verify', { state: { email, password } })
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setFieldErrors(err.fieldErrors)
      else setError(err instanceof Error ? err.message : 'Could not create the account')
    } finally {
      setSubmitting(false)
    }
  }

  function onSocialResult(result: AuthResponse) {
    if (result.twoFactorRequired) navigate('/login', { state: { challengeToken: result.challengeToken } })
    else startSession(result)
  }

  return (
    <AuthLayout title="Create your account" subtitle="We'll email you a code to confirm your address.">
      <form onSubmit={onSubmit} className="form">
        <Field label="Name" error={fieldErrors.displayName}>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={80} required autoFocus />
        </Field>
        <Field label="Email" error={fieldErrors.email}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Phone number" error={fieldErrors.phoneNumber} hint="With country code, for example +962 79 123 4567">
          <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" placeholder="+962 79 123 4567" required />
        </Field>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" error={fieldErrors.password} showRules />
        {error && <div className="alert">{error}</div>}
        <button className="button primary" disabled={submitting || !isStrongPassword(password)}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <SocialButtons onResult={onSocialResult} onError={setError} />
      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
