import { useState } from 'react'
import type { FormEvent } from 'react'
import { userApi } from '../../api/endpoints'
import { useAuth, useCurrentUser } from '../../auth/useAuth'
import { errorMessage } from '../../lib/errors'
import CodeInput from '../CodeInput'
import Field from '../Field'
import PasswordField from '../PasswordField'
import { useToast } from '../toast'

export default function EmailSection() {
  const { updateUser } = useAuth()
  const user = useCurrentUser()
  const toast = useToast()
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  // Set once a code has been sent to the new address and is waiting to be confirmed.
  const [pendingEmail, setPendingEmail] = useState<string>()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function requestChange(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await userApi.requestEmailChange(newEmail, password)
      setPendingEmail(newEmail)
    } catch (err) {
      toast(errorMessage(err, 'Could not start the email change'), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      updateUser(await userApi.confirmEmailChange(code))
      toast('Email address changed')
      setPendingEmail(undefined)
      setNewEmail('')
      setPassword('')
      setCode('')
    } catch (err) {
      toast(errorMessage(err, 'Could not confirm the code'), 'error')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>Email address</h2>
      <p className="muted small">
        Currently <strong>{user.email}</strong>
      </p>
      {pendingEmail ? (
        <form onSubmit={confirm} className="form">
          <p className="muted small">
            Enter the code we sent to <strong>{pendingEmail}</strong>. Your email changes once it is confirmed.
          </p>
          <CodeInput value={code} onChange={setCode} autoFocus />
          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setPendingEmail(undefined)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy || code.length !== 6}>
              Confirm new email
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={requestChange} className="form">
          <Field label="New email">
            <input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} autoComplete="email" required />
          </Field>
          {user.hasPassword && <PasswordField label="Current password" value={password} onChange={setPassword} autoComplete="current-password" />}
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              {busy ? 'Sending…' : 'Send confirmation code'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
