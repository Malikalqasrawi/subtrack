import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { userApi } from '../../api/endpoints'
import { useAuth, useCurrentUser } from '../../auth/useAuth'
import { errorMessage } from '../../lib/errors'
import { isValidPhone, normalizePhone } from '../../lib/password'
import { useCurrencies } from '../../lib/queries'
import { queryClient } from '../../lib/queryClient'
import Field from '../Field'
import { useToast } from '../toast'

export default function ProfileSection() {
  const { updateUser } = useAuth()
  const user = useCurrentUser()
  const toast = useToast()
  const { data: currencies } = useCurrencies()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [phone, setPhone] = useState(user.phoneNumber ?? '')
  const [defaultCurrency, setDefaultCurrency] = useState(user.defaultCurrency)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValidPhone(phone)) {
      setFieldErrors({ phoneNumber: 'Use international format, for example +962791234567' })
      return
    }
    setSaving(true)
    setFieldErrors({})
    try {
      updateUser(await userApi.update(displayName, normalizePhone(phone), defaultCurrency))
      // Totals are converted to the default currency, so everything loaded so far may be out of date.
      queryClient.invalidateQueries()
      toast('Profile saved')
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setFieldErrors(err.fieldErrors)
      else toast(errorMessage(err, 'Could not save your profile'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card">
      <h2>Profile</h2>
      <form onSubmit={onSubmit} className="form">
        <Field label="Name" error={fieldErrors.displayName}>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} required />
        </Field>
        <Field label="Phone number" error={fieldErrors.phoneNumber} hint="With country code, for example +962 79 123 4567">
          <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
        </Field>
        <Field label="Default currency" error={fieldErrors.defaultCurrency} hint="Totals and charts are converted to this currency.">
          <select value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value)}>
            {(currencies ?? [user.defaultCurrency]).map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </Field>
        <div className="form-actions">
          <button className="button primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </section>
  )
}
