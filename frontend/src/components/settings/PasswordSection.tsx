import { useState } from 'react'
import type { FormEvent } from 'react'
import { userApi } from '../../api/endpoints'
import { useAuth, useCurrentUser } from '../../auth/useAuth'
import { errorMessage } from '../../lib/errors'
import { isStrongPassword } from '../../lib/password'
import PasswordField from '../PasswordField'
import { useToast } from '../toast'

export default function PasswordSection() {
  const { startSession } = useAuth()
  const user = useCurrentUser()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      // The server signs out every other device and hands this one a fresh session.
      startSession(await userApi.changePassword(current, next))
      toast(user.hasPassword ? 'Password changed' : 'Password set')
      setCurrent('')
      setNext('')
    } catch (err) {
      toast(errorMessage(err, 'Could not change the password'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card">
      <h2>{user.hasPassword ? 'Change password' : 'Set a password'}</h2>
      {!user.hasPassword && (
        <p className="muted small">You signed up with Google or Apple. Add a password to also sign in with your email.</p>
      )}
      <form onSubmit={onSubmit} className="form">
        {user.hasPassword && <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />}
        <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" showRules />
        <div className="form-actions">
          <button className="button primary" disabled={saving || !isStrongPassword(next)}>
            {saving ? 'Saving…' : user.hasPassword ? 'Change password' : 'Set password'}
          </button>
        </div>
      </form>
    </section>
  )
}
