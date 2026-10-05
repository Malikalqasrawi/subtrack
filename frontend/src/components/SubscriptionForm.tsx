import { useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../api/client'
import { BILLING_CYCLES, CATEGORIES, STATUSES } from '../api/types'
import type { Category, Subscription, SubscriptionRequest } from '../api/types'
import { categoryLabel, cycleLabel, statusLabel, toIsoDate } from '../lib/format'
import { useSaveSubscription } from '../lib/queries'
import Field from './Field'
import Modal from './Modal'

const REMINDER_OPTIONS = [
  { value: '', label: 'No reminder' },
  { value: '0', label: 'On the day' },
  { value: '1', label: '1 day before' },
  { value: '3', label: '3 days before' },
  { value: '7', label: '7 days before' },
  { value: '14', label: '14 days before' },
]

/** Common services, to fill in the name and category with one tap. */
const PRESETS: { name: string; category: Category }[] = [
  { name: 'Netflix', category: 'ENTERTAINMENT' },
  { name: 'Spotify', category: 'MUSIC' },
  { name: 'YouTube Premium', category: 'ENTERTAINMENT' },
  { name: 'iCloud+', category: 'CLOUD' },
  { name: 'ChatGPT Plus', category: 'PRODUCTIVITY' },
  { name: 'Xbox Game Pass', category: 'GAMING' },
  { name: 'Amazon Prime', category: 'SHOPPING' },
  { name: 'Gym', category: 'HEALTH' },
]

interface Props {
  /** The subscription to edit, or undefined to create a new one. */
  subscription?: Subscription
  currencies: string[]
  defaultCurrency: string
  onClose: () => void
  /** Called with the saved subscription's name. */
  onSaved: (name: string) => void
}

export default function SubscriptionForm({ subscription, currencies, defaultCurrency, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => ({
    name: subscription?.name ?? '',
    amount: subscription ? String(subscription.amount) : '',
    currency: subscription?.currency ?? defaultCurrency,
    billingCycle: subscription?.billingCycle ?? 'MONTHLY',
    category: subscription?.category ?? 'ENTERTAINMENT',
    firstBillingDate: subscription?.firstBillingDate ?? toIsoDate(new Date()),
    status: subscription?.status ?? 'ACTIVE',
    reminder: subscription ? (subscription.reminderDaysBefore?.toString() ?? '') : '3',
    websiteUrl: subscription?.websiteUrl ?? '',
    notes: subscription?.notes ?? '',
  }))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string>()
  const save = useSaveSubscription()
  const saving = save.isPending

  const set = (field: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)
    setFieldErrors({})
    const request: SubscriptionRequest = {
      name: form.name,
      amount: Number(form.amount),
      currency: form.currency,
      billingCycle: form.billingCycle,
      category: form.category,
      firstBillingDate: form.firstBillingDate,
      status: form.status,
      reminderDaysBefore: form.reminder === '' ? null : Number(form.reminder),
      websiteUrl: form.websiteUrl,
      notes: form.notes,
    }
    try {
      await save.mutateAsync({ id: subscription?.id, request })
      onSaved(request.name)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setFieldErrors(err.fieldErrors)
      else setError(err instanceof Error ? err.message : 'Could not save the subscription')
    }
  }

  return (
    <Modal title={subscription ? 'Edit subscription' : 'Add subscription'} onClose={onClose}>
      <form onSubmit={onSubmit} className="form">
        {!subscription && (
          <div className="chips presets" role="group" aria-label="Popular services">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.name}
                className={`chip ${form.name === preset.name ? 'selected' : ''}`}
                onClick={() => setForm((current) => ({ ...current, name: preset.name, category: preset.category }))}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
        <Field label="Name" error={fieldErrors.name}>
          <input value={form.name} onChange={set('name')} placeholder="Netflix" maxLength={100} required autoFocus />
        </Field>
        <div className="form-row">
          <Field label="Price" error={fieldErrors.amount}>
            <input type="number" min="0" step="any" value={form.amount} onChange={set('amount')} placeholder="9.99" required />
          </Field>
          <Field label="Currency" error={fieldErrors.currency}>
            <select value={form.currency} onChange={set('currency')}>
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </Field>
          <Field label="Billed" error={fieldErrors.billingCycle}>
            <select value={form.billingCycle} onChange={set('billingCycle')}>
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {cycleLabel(cycle)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Category" error={fieldErrors.category}>
            <select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" error={fieldErrors.status}>
            <select value={form.status} onChange={set('status')}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field
            label="First billing date"
            error={fieldErrors.firstBillingDate}
            hint="Any past or upcoming charge date. Renewals are counted from it."
          >
            <input type="date" value={form.firstBillingDate} onChange={set('firstBillingDate')} required />
          </Field>
          <Field label="Email reminder" error={fieldErrors.reminderDaysBefore}>
            <select value={form.reminder} onChange={set('reminder')}>
              {REMINDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Website (optional)" error={fieldErrors.websiteUrl}>
          <input type="url" value={form.websiteUrl} onChange={set('websiteUrl')} placeholder="https://" maxLength={255} />
        </Field>
        <Field label="Notes (optional)" error={fieldErrors.notes}>
          <textarea value={form.notes} onChange={set('notes')} rows={2} maxLength={500} />
        </Field>
        {error && <div className="alert">{error}</div>}
        <div className="form-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
