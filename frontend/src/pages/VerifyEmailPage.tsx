import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { authApi } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import AuthLayout from '../components/AuthLayout'
import CodeInput from '../components/CodeInput'
import { useCooldown } from '../lib/useCooldown'

export default function VerifyEmailPage() {
  const { startSession } = useAuth()
  // The email and password arrive from the sign-up or sign-in page. They are kept in memory
  // only, so after a page reload we send the user back to sign in.
  const state = useLocation().state as { email?: string; password?: string } | null
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, restartCooldown] = useCooldown(60)

  if (!state?.email || !state.password) return <Navigate to="/login" replace />
  const { email, password } = state

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(undefined)
    setNotice(undefined)
    try {
      startSession(await authApi.verify(email, password, code))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the code')
      setCode('')
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    setError(undefined)
    try {
      await authApi.resendVerification(email)
      setNotice('A new code is on its way.')
      restartCooldown()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code')
    }
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        <>
          Enter the 6-digit code we sent to <strong>{email}</strong>. It expires in 15 minutes.
        </>
      }
    >
      <form onSubmit={onSubmit} className="form">
        <CodeInput value={code} onChange={setCode} autoFocus />
        {error && <div className="alert">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        <button className="button primary" disabled={submitting || code.length !== 6}>
          {submitting ? 'Verifying…' : 'Verify email'}
        </button>
      </form>
      <p className="auth-switch">
        Didn't get it?{' '}
        <button className="link-button" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
        {' · '}
        <Link to="/register">Use a different email</Link>
      </p>
    </AuthLayout>
  )
}
