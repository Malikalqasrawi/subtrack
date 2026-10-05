import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { twoFactorApi } from '../../api/endpoints'
import type { TwoFactorSetup } from '../../api/types'
import { useAuth, useCurrentUser } from '../../auth/useAuth'
import { errorMessage } from '../../lib/errors'
import CodeInput from '../CodeInput'
import Field from '../Field'
import Icon from '../Icon'
import PasswordField from '../PasswordField'
import { useToast } from '../toast'
import OwnerCode, { OWNER_CODE_LENGTH } from './OwnerCode'

export default function TwoFactorSection() {
  const { updateUser } = useAuth()
  const user = useCurrentUser()
  const toast = useToast()
  const [setup, setSetup] = useState<TwoFactorSetup>()
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>()
  const [turningOff, setTurningOff] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState('')
  const [ownerCode, setOwnerCode] = useState('')
  const [busy, setBusy] = useState(false)

  /** Runs one request, showing a toast if it fails. */
  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      toast(errorMessage(err, failure), 'error')
      setCode('')
    } finally {
      setBusy(false)
    }
  }

  const begin = (event?: FormEvent) => {
    event?.preventDefault()
    return run(async () => {
      const proof = user.hasPassword ? { currentPassword: password } : { confirmationCode: ownerCode }
      setSetup(await twoFactorApi.setup(proof))
      setConfirming(false)
      setPassword('')
      setOwnerCode('')
    }, 'Could not start two-factor setup')
  }

  const enable = (event: FormEvent) => {
    event.preventDefault()
    return run(async () => {
      const result = await twoFactorApi.enable(code)
      setRecoveryCodes(result.recoveryCodes)
      setSetup(undefined)
      setCode('')
      updateUser({ ...user, twoFactorEnabled: true })
      toast('Two-factor authentication is on')
    }, 'Could not turn on two-factor authentication')
  }

  const disable = (event: FormEvent) => {
    event.preventDefault()
    return run(async () => {
      await twoFactorApi.disable(code)
      setTurningOff(false)
      setRecoveryCodes(undefined)
      setCode('')
      updateUser({ ...user, twoFactorEnabled: false })
      toast('Two-factor authentication is off')
    }, 'Could not turn off two-factor authentication')
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2>Two-factor authentication</h2>
        <span className={`badge ${user.twoFactorEnabled ? 'on' : ''}`}>
          {user.twoFactorEnabled && <Icon name="shield" size={13} />}
          {user.twoFactorEnabled ? 'On' : 'Off'}
        </span>
      </div>
      <p className="muted small">
        Optional. When it's on, signing in also asks for a code from an authenticator app such as Google Authenticator, Authy or 1Password.
      </p>

      {recoveryCodes && (
        <div className="recovery">
          <strong>Save these recovery codes</strong>
          <p className="muted small">
            Each one signs you in once if you lose your phone. They will not be shown again.
          </p>
          <ul>
            {recoveryCodes.map((recoveryCode) => (
              <li key={recoveryCode}>{recoveryCode}</li>
            ))}
          </ul>
          <div className="form-actions">
            <button
              className="button ghost small"
              onClick={() => navigator.clipboard.writeText(recoveryCodes.join('\n')).then(() => toast('Recovery codes copied'))}
            >
              Copy codes
            </button>
            <button className="button primary small" onClick={() => setRecoveryCodes(undefined)}>
              I've saved them
            </button>
          </div>
        </div>
      )}

      {!user.twoFactorEnabled && !setup && !confirming && (
        <div className="form-actions start">
          <button className="button primary" onClick={() => setConfirming(true)} disabled={busy}>
            <Icon name="shield" size={16} /> Set up two-factor
          </button>
        </div>
      )}

      {!user.twoFactorEnabled && !setup && confirming && (
        <form onSubmit={begin} className="form">
          {user.hasPassword ? (
            <PasswordField label="Current password" value={password} onChange={setPassword} autoComplete="current-password" autoFocus />
          ) : (
            <OwnerCode code={ownerCode} onChange={setOwnerCode} />
          )}
          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy || (user.hasPassword ? password === '' : ownerCode.length !== OWNER_CODE_LENGTH)}>
              Continue
            </button>
          </div>
        </form>
      )}

      {!user.twoFactorEnabled && setup && (
        <form onSubmit={enable} className="form">
          <div className="twofactor-setup">
            <div className="qr">
              <QRCodeSVG value={setup.otpauthUri} size={148} />
            </div>
            <ol className="muted small">
              <li>Open your authenticator app and scan this QR code.</li>
              <li>
                Or type this key by hand: <code>{setup.secret.match(/.{1,4}/g)?.join(' ')}</code>
              </li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
          </div>
          <CodeInput value={code} onChange={setCode} />
          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setSetup(undefined)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy || code.length !== 6}>
              Turn on
            </button>
          </div>
        </form>
      )}

      {user.twoFactorEnabled && !recoveryCodes && !turningOff && (
        <div className="form-actions start">
          <button className="button ghost danger" onClick={() => setTurningOff(true)}>
            Turn off two-factor
          </button>
        </div>
      )}

      {user.twoFactorEnabled && turningOff && (
        <form onSubmit={disable} className="form">
          <Field label="Authenticator or recovery code" hint="Needed to confirm it's you.">
            <input value={code} onChange={(event) => setCode(event.target.value.trim())} maxLength={20} required autoFocus />
          </Field>
          <div className="form-actions">
            <button type="button" className="button ghost" onClick={() => setTurningOff(false)}>
              Cancel
            </button>
            <button className="button primary" disabled={busy || code.length < 6}>
              Turn off
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
