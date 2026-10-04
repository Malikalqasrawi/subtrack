import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CategorySpend, DashboardSummary, MonthlyProjection, RenewalEntry } from '../api/types'
import { useCurrentUser } from '../auth/useAuth'
import AnimatedNumber from '../components/AnimatedNumber'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { categoryLabel, daysUntil, formatDate, formatMoney, formatMonth, relativeDay } from '../lib/format'
import { useSummary } from '../lib/queries'

const UPCOMING_WINDOW_DAYS = 30

export default function DashboardPage() {
  const user = useCurrentUser()
  const { data: summary, error } = useSummary()
  const [greeting] = useState(() => greetingFor(new Date().getHours()))

  return (
    <>
      <header className="page-header">
        <div>
          <h1>
            {greeting}, {user.displayName.split(' ')[0]}
          </h1>
          <p className="muted">Here's where your money goes.</p>
        </div>
        <Link className="button primary" to="/subscriptions?new=1">
          <Icon name="plus" size={16} /> Add subscription
        </Link>
      </header>
      {error && <div className="alert">{error.message}</div>}
      {!summary && !error && <DashboardSkeleton />}
      {summary && summary.activeCount === 0 && (
        <div className="card empty">
          <div className="empty-art">
            <Icon name="layers" size={30} />
          </div>
          <h2>No active subscriptions yet</h2>
          <p className="muted">Add the services you pay for to see what they cost and when they renew.</p>
          <Link className="button primary" to="/subscriptions?new=1">
            Add your first subscription
          </Link>
        </div>
      )}
      {summary && summary.activeCount > 0 && <Dashboard summary={summary} />}
    </>
  )
}

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Dashboard({ summary }: { summary: DashboardSummary }) {
  const { currency } = summary
  const next = summary.upcoming[0]
  return (
    <div className="stagger">
      <section className="hero">
        <div className="blob blob-a" />
        <div className="hero-main">
          <div className="hero-label">Monthly spend</div>
          <div className="hero-value">
            <AnimatedNumber value={summary.monthlyTotal} format={(value) => formatMoney(value, currency)} />
          </div>
          <div className="hero-note">Averaged across all billing cycles</div>
        </div>
        <div className="hero-stats">
          <div>
            <span>Per year</span>
            <strong>
              <AnimatedNumber value={summary.yearlyTotal} format={(value) => formatMoney(value, currency)} />
            </strong>
          </div>
          <div>
            <span>Active</span>
            <strong>
              <AnimatedNumber value={summary.activeCount} format={(value) => String(Math.round(value))} />
            </strong>
          </div>
          <div>
            <span>Next renewal</span>
            <strong>{next ? `${next.name} · ${relativeDay(next.date).toLowerCase()}` : 'None in 30 days'}</strong>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-column">
          <section className="card">
            <h2>Charges by month</h2>
            <p className="muted small">What will actually be billed over the next 12 months, in {currency}.</p>
            <ProjectionChart projection={summary.projection} currency={currency} />
          </section>
          <section className="card">
            <h2>Monthly spend by category</h2>
            <p className="muted small">Average per month, in {currency}.</p>
            <CategoryBars categories={summary.byCategory} currency={currency} />
          </section>
        </div>
        <section className="card">
          <h2>Upcoming renewals</h2>
          <p className="muted small">Next {UPCOMING_WINDOW_DAYS} days</p>
          <UpcomingList upcoming={summary.upcoming} displayCurrency={currency} />
        </section>
      </div>
      <p className="muted small footnote">
        Amounts in other currencies are converted to {currency} using rates from {new Date(summary.ratesAsOf).toLocaleDateString()}.
      </p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="stagger" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton" style={{ height: 172 }} />
      <div className="dashboard-grid">
        <div className="skeleton" style={{ height: 320 }} />
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    </div>
  )
}

function ProjectionChart({ projection, currency }: { projection: MonthlyProjection[]; currency: string }) {
  const compact = new Intl.NumberFormat(undefined, { notation: 'compact' })
  return (
    <figure className="chart" aria-label="Bar chart of charges per month for the next 12 months">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={projection} barCategoryGap="25%" margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickFormatter={(month: string) => formatMonth(month)} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value: number) => compact.format(value)} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            isAnimationActive={false}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as MonthlyProjection | undefined
              if (!active || !point) return null
              return (
                <div className="chart-tooltip">
                  <div className="muted small">{formatMonth(point.month, true)}</div>
                  <strong>{formatMoney(point.amount, currency)}</strong>
                </div>
              )
            }}
          />
          {/* The bars grow in with a CSS animation (see .recharts-bar-rectangle), which also honours reduced motion. */}
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <caption>Charges per month</caption>
        <tbody>
          {projection.map((point) => (
            <tr key={point.month}>
              <th scope="row">{formatMonth(point.month, true)}</th>
              <td>{formatMoney(point.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function CategoryBars({ categories, currency }: { categories: CategorySpend[]; currency: string }) {
  const largest = Math.max(...categories.map((category) => category.monthlyAmount), 0.01)
  return (
    <ul className="category-bars">
      {categories.map((category, index) => (
        <li key={category.category}>
          <span className="category-name">
            {categoryLabel(category.category)} <span className="muted">· {category.count}</span>
          </span>
          <span className="category-track">
            <span
              className="category-bar"
              style={{ width: `${(category.monthlyAmount / largest) * 100}%`, '--i': index } as CSSProperties}
            />
          </span>
          <span className="category-value">{formatMoney(category.monthlyAmount, currency)}</span>
        </li>
      ))}
    </ul>
  )
}

function UpcomingList({ upcoming, displayCurrency }: { upcoming: RenewalEntry[]; displayCurrency: string }) {
  if (upcoming.length === 0) return <p className="muted">Nothing renews in the next 30 days.</p>
  return (
    <ul className="renewal-list">
      {upcoming.map((renewal) => {
        // How much of the 30-day window has already passed: fuller means sooner.
        const closeness = 1 - Math.max(0, daysUntil(renewal.date)) / UPCOMING_WINDOW_DAYS
        return (
          <li key={renewal.subscriptionId + renewal.date}>
            <Avatar name={renewal.name} size={36} />
            <div className="renewal-main">
              <div className="renewal-name">{renewal.name}</div>
              <div className="muted small">
                {relativeDay(renewal.date)} · {formatDate(renewal.date)}
              </div>
              <div className="countdown" aria-hidden="true">
                <span style={{ width: `${Math.max(4, closeness * 100)}%` }} />
              </div>
            </div>
            <div className="renewal-amount">
              {formatMoney(renewal.amount, renewal.currency)}
              {renewal.currency !== displayCurrency && (
                <div className="muted small">≈ {formatMoney(renewal.convertedAmount, displayCurrency)}</div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
