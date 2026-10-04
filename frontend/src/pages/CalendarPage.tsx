import { useMemo, useState } from 'react'
import type { RenewalEntry } from '../api/types'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { formatDate, formatMoney, toIsoDate } from '../lib/format'
import { useCalendar } from '../lib/queries'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MAX_PER_DAY = 3

export default function CalendarPage() {
  const [today] = useState(() => new Date())
  // The first day of the month being shown.
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const { data: current, error } = useCalendar(month.getFullYear(), month.getMonth() + 1)
  // Clicking a day narrows the list below the grid to that day.
  const [selectedDate, setSelectedDate] = useState<string>()

  const renewalsByDate = useMemo(() => {
    const byDate = new Map<string, RenewalEntry[]>()
    for (const renewal of current?.renewals ?? []) {
      byDate.set(renewal.date, [...(byDate.get(renewal.date) ?? []), renewal])
    }
    return byDate
  }, [current])

  const shift = (months: number) => {
    setSelectedDate(undefined)
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + months, 1))
  }
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlanks = month.getDay()
  const todayIso = toIsoDate(today)
  const listed = (current?.renewals ?? []).filter((renewal) => !selectedDate || renewal.date === selectedDate)

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Calendar</h1>
          <p className="muted">
            {current
              ? `${current.renewals.length} charges this month, ${formatMoney(current.total, current.currency)} in total.`
              : 'Loading…'}
          </p>
        </div>
        <div className="month-nav">
          <button className="button ghost small" onClick={() => shift(-1)} aria-label="Previous month">
            <Icon name="chevronLeft" size={16} />
          </button>
          <strong>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <button className="button ghost small" onClick={() => shift(1)} aria-label="Next month">
            <Icon name="chevronRight" size={16} />
          </button>
          <button
            className="button ghost small"
            onClick={() => {
              setSelectedDate(undefined)
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
            }}
          >
            Today
          </button>
        </div>
      </header>

      {error && <div className="alert">{error.message}</div>}

      <div className="card calendar">
        {WEEKDAYS.map((weekday) => (
          <div className="calendar-weekday" key={weekday}>
            {weekday}
          </div>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div className="calendar-day blank" key={`blank-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const iso = toIsoDate(new Date(month.getFullYear(), month.getMonth(), index + 1))
          const renewals = current ? (renewalsByDate.get(iso) ?? []) : []
          return (
            <button
              type="button"
              className={`calendar-day ${iso === todayIso ? 'today' : ''} ${iso === selectedDate ? 'selected' : ''} ${renewals.length > 0 ? 'has-events' : ''}`}
              key={iso}
              onClick={() => setSelectedDate(iso === selectedDate ? undefined : iso)}
              aria-pressed={iso === selectedDate}
              aria-label={`${formatDate(iso)}, ${renewals.length} charges`}
            >
              <span className="calendar-date">{index + 1}</span>
              {renewals.slice(0, MAX_PER_DAY).map((renewal) => (
                <span
                  className="calendar-event"
                  key={renewal.subscriptionId}
                  title={`${renewal.name} · ${formatMoney(renewal.amount, renewal.currency)}`}
                >
                  <span className="calendar-event-name">{renewal.name}</span>
                  <span className="calendar-event-amount">{formatMoney(renewal.amount, renewal.currency)}</span>
                </span>
              ))}
              {renewals.length > MAX_PER_DAY && <span className="muted small">+{renewals.length - MAX_PER_DAY} more</span>}
            </button>
          )
        })}
      </div>

      {current && current.renewals.length > 0 && (
        <section className="card">
          <div className="card-header">
            <h2>{selectedDate ? `Charges on ${formatDate(selectedDate)}` : 'Charges this month'}</h2>
            {selectedDate && (
              <button className="link-button" onClick={() => setSelectedDate(undefined)}>
                Show whole month
              </button>
            )}
          </div>
          {listed.length === 0 ? (
            <p className="muted">Nothing is charged on this day.</p>
          ) : (
            <ul className="renewal-list">
              {listed.map((renewal) => (
                <li key={renewal.subscriptionId + renewal.date}>
                  <Avatar name={renewal.name} size={36} />
                  <div className="renewal-main">
                    <div className="renewal-name">{renewal.name}</div>
                    <div className="muted small">{formatDate(renewal.date)}</div>
                  </div>
                  <div className="renewal-amount">{formatMoney(renewal.amount, renewal.currency)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
