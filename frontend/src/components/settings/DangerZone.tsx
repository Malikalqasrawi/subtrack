import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { userApi } from '../../api/endpoints'
import { useAuth, useCurrentUser } from '../../auth/useAuth'
import { errorMessage } from '../../lib/errors'
import Field from '../Field'
import Modal from '../Modal'
import PasswordField from '../PasswordField'
import { useToast } from '../toast'

const CONFIRM_WORD = 'DELETE'

export default function DangerZone() {
  const { clearSession } = useAuth()
  const user = useCurrentUser()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setDeleting(true)
    try {
      await userApi.deleteAccount(password)
      toast('Your account has been deleted')
      clearSession()
    } catch (err) {
      toast(errorMessage(err, 'Could not delete the account'), 'error')
      setDeleting(false)
    }
  }

  return (
    <section className="card danger-zone">
      <h2>Delete account</h2>
      <p className="muted small">Permanently removes your account, subscriptions and reminders. This cannot be undone.</p>
      <div className="form-actions start">
        <button className="button ghost danger" onClick={() => setOpen(true)}>
          Delete my account
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <Modal title="Delete your account?" onClose={() => setOpen(false)}>
            <form onSubmit={onSubmit} className="form">
              <p className="muted">
                Everything tied to <strong>{user.email}</strong> will be removed for good.
              </p>
              {user.hasPassword ? (
                <PasswordField label="Your password" value={password} onChange={setPassword} autoComplete="current-password" autoFocus />
              ) : (
                <Field label={`Type ${CONFIRM_WORD} to confirm`}>
                  <input value={typed} onChange={(event) => setTyped(event.target.value)} required autoFocus />
                </Field>
              )}
              <div className="form-actions">
                <button type="button" className="button ghost" onClick={() => setOpen(false)}>
                  Keep my account
                </button>
                <button className="button danger-solid" disabled={deleting || (!user.hasPassword && typed !== CONFIRM_WORD)}>
                  {deleting ? 'Deleting…' : 'Delete forever'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </section>
  )
}
