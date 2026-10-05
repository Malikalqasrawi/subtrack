import { useState } from 'react'
import { userApi } from '../../api/endpoints'
import { useCurrentUser } from '../../auth/useAuth'
import { errorMessage } from '../../lib/errors'
import { useCooldown } from '../../lib/useCooldown'
import CodeInput from '../CodeInput'
import { useToast } from '../toast'

export const OWNER_CODE_LENGTH = 6

/**
 * For accounts without a password: emails a code to the account's own address and takes it,
 * as the proof a password would otherwise give.
 */
export default function OwnerCode({ code, onChange }: { code: string; onChange: (code: string) => void }) {
  const user = useCurrentUser()
  const toast = useToast()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [cooldown, restartCooldown] = useCooldown(60, false)

  async function send() {
    setSending(true)
    try {
      await userApi.sendConfirmationCode()
      setSent(true)
      restartCooldown()
    } catch (err) {
      toast(errorMessage(err, 'Could not send the code'), 'error')
    } finally {
      setSending(false)
    }
  }

  if (!sent) {
    return (
      <>
        <p className="muted small">
          This account has no password. To confirm it is you, we email a code to <strong>{user.email}</strong>.
        </p>
        <div className="form-actions start">
          <button type="button" className="button ghost" onClick={send} disabled={sending}>
            {sending ? 'Sending…' : 'Email me a code'}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="muted small">
        Enter the code we sent to <strong>{user.email}</strong>.{' '}
        <button type="button" className="link-button" onClick={send} disabled={cooldown > 0 || sending}>
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </p>
      <CodeInput value={code} onChange={onChange} />
    </>
  )
}
