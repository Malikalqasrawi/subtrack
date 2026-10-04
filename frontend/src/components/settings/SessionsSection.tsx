import { useState } from 'react'
import { userApi } from '../../api/endpoints'
import { useAuth } from '../../auth/useAuth'
import { errorMessage } from '../../lib/errors'
import { useToast } from '../toast'

export default function SessionsSection() {
  const { clearSession } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  async function signOutEverywhere() {
    setBusy(true)
    try {
      await userApi.logoutEverywhere()
      clearSession()
    } catch (err) {
      toast(errorMessage(err, 'Could not sign out of all devices'), 'error')
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <h2>Sessions</h2>
      <p className="muted small">
        Signs you out on every phone, tablet and computer, including this one. Use it if you left an account open somewhere.
      </p>
      <div className="form-actions start">
        <button className="button ghost" onClick={signOutEverywhere} disabled={busy}>
          {busy ? 'Signing out…' : 'Sign out of all devices'}
        </button>
      </div>
    </section>
  )
}
