import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STATUSES } from '../api/types'
import type { Subscription, SubscriptionStatus } from '../api/types'
import { useCurrentUser } from '../auth/useAuth'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import Modal from '../components/Modal'
import SubscriptionForm from '../components/SubscriptionForm'
import { useToast } from '../components/toast'
import { categoryLabel, cycleUnit, formatDate, formatMoney, relativeDay, statusLabel } from '../lib/format'
import { useCurrencies, useDeleteSubscription, useSubscriptions } from '../lib/queries'

type StatusFilter = SubscriptionStatus | 'ALL'

const SORTS = {
  name: { label: 'Name', compare: (a: Subscription, b: Subscription) => a.name.localeCompare(b.name) },
  price: { label: 'Highest price', compare: (a: Subscription, b: Subscription) => b.monthlyCost - a.monthlyCost },
  renewal: {
    label: 'Next renewal',
    // Subscriptions that are not active have no next renewal and go last.
    compare: (a: Subscription, b: Subscription) =>
      (a.nextRenewalDate ?? '9999').localeCompare(b.nextRenewalDate ?? '9999'),
  },
}
type SortKey = keyof typeof SORTS

export default function SubscriptionsPage() {
  const user = useCurrentUser()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: subscriptions, error } = useSubscriptions()
  const { data: currencies } = useCurrencies()
  const deleteSubscription = useDeleteSubscription()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [sort, setSort] = useState<SortKey>('name')
  // undefined = form closed, null = adding, a subscription = editing it
  const [editing, setEditing] = useState<Subscription | null | undefined>(searchParams.has('new') ? null : undefined)
  const [deleting, setDeleting] = useState<Subscription>()

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (subscriptions ?? [])
      .filter(
        (subscription) =>
          (statusFilter === 'ALL' || subscription.status === statusFilter) &&
          (needle === '' || subscription.name.toLowerCase().includes(needle)),
      )
      .sort(SORTS[sort].compare)
  }, [subscriptions, query, statusFilter, sort])

  function closeForm() {
    setEditing(undefined)
    if (searchParams.has('new')) setSearchParams({}, { replace: true })
  }

  async function remove(subscription: Subscription) {
    setDeleting(undefined)
    try {
      await deleteSubscription.mutateAsync(subscription.id)
      toast(`${subscription.name} deleted`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete the subscription', 'error')
    }
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p className="muted">Everything you pay for on a schedule.</p>
        </div>
        <button className="button primary" onClick={() => setEditing(null)}>
          <Icon name="plus" size={16} /> Add subscription
        </button>
      </header>

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={16} />
          <input type="search" placeholder="Search by name" aria-label="Search subscriptions" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="chips" role="group" aria-label="Filter by status">
          {(['ALL', ...STATUSES] as StatusFilter[]).map((status) => (
            <button
              key={status}
              className={`chip ${statusFilter === status ? 'selected' : ''}`}
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'ALL' ? 'All' : statusLabel(status)}
            </button>
          ))}
        </div>
        <label className="sort">
          <span className="muted small">Sort by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            {Object.entries(SORTS).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <div className="alert">{error.message}</div>}
      {!subscriptions && !error && (
        <div className="sub-grid" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="skeleton" style={{ height: 150 }} key={index} />
          ))}
        </div>
      )}

      {subscriptions && visible.length === 0 && (
        <div className="card empty">
          <div className="empty-art">
            <Icon name="layers" size={30} />
          </div>
          <p className="muted">
            {subscriptions.length === 0 ? 'You have not added any subscriptions yet.' : 'No subscriptions match your filters.'}
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="sub-grid">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((subscription) => (
              <motion.article
                layout
                className="card sub-card"
                key={subscription.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: subscription.status === 'ACTIVE' ? 1 : 0.7, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              >
                <div className="sub-card-top">
                  <Avatar name={subscription.name} />
                  <div className="sub-main">
                    <div className="sub-name">
                      {subscription.name}
                      {subscription.websiteUrl && (
                        <a href={subscription.websiteUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${subscription.name} website`}>
                          <Icon name="external" size={14} />
                        </a>
                      )}
                    </div>
                    <div className="muted small">{categoryLabel(subscription.category)}</div>
                  </div>
                  {subscription.status !== 'ACTIVE' && <span className="badge">{statusLabel(subscription.status)}</span>}
                </div>
                <div className="sub-price">
                  {formatMoney(subscription.amount, subscription.currency)}
                  <span className="muted"> / {cycleUnit(subscription.billingCycle)}</span>
                </div>
                <div className="muted small">
                  {(subscription.currency !== subscription.displayCurrency || subscription.billingCycle !== 'MONTHLY') &&
                    `≈ ${formatMoney(subscription.monthlyCost, subscription.displayCurrency)} / month · `}
                  {subscription.nextRenewalDate
                    ? `Renews ${relativeDay(subscription.nextRenewalDate).toLowerCase()} (${formatDate(subscription.nextRenewalDate)})`
                    : 'No upcoming renewal'}
                </div>
                <div className="sub-actions">
                  {subscription.reminderDaysBefore !== null && subscription.status === 'ACTIVE' && (
                    <span className="muted small reminder-note" title="Email reminder is on">
                      <Icon name="bell" size={14} />
                      {subscription.reminderDaysBefore === 0 ? 'On the day' : `${subscription.reminderDaysBefore}d before`}
                    </span>
                  )}
                  <button className="button ghost small" onClick={() => setEditing(subscription)}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                  <button className="button ghost small danger" onClick={() => setDeleting(subscription)} aria-label={`Delete ${subscription.name}`}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {editing !== undefined && (
          <SubscriptionForm
            key="form"
            subscription={editing ?? undefined}
            currencies={currencies ?? [user.defaultCurrency]}
            defaultCurrency={user.defaultCurrency}
            onClose={closeForm}
            onSaved={(name) => {
              closeForm()
              toast(`${name} saved`)
            }}
          />
        )}
        {deleting && (
          <Modal key="delete" title={`Delete ${deleting.name}?`} onClose={() => setDeleting(undefined)}>
            <p className="muted">It will be removed from your totals, calendar and reminders. This cannot be undone.</p>
            <div className="form-actions">
              <button className="button ghost" onClick={() => setDeleting(undefined)}>
                Keep it
              </button>
              <button className="button danger-solid" onClick={() => remove(deleting)} autoFocus>
                Delete
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  )
}
