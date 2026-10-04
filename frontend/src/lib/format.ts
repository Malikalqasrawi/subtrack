import type { BillingCycle, Category, SubscriptionStatus } from '../api/types'

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount)
}

/** Parses a yyyy-mm-dd string as a local date (new Date(string) would treat it as UTC). */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function formatDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseIsoDate(iso).getTime() - today.getTime()) / 86_400_000)
}

export function relativeDay(iso: string): string {
  const days = daysUntil(iso)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

/** "2026-10" -> "Oct" (or "Oct 2026" when long). */
export function formatMonth(yearMonth: string, long = false): string {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(
    undefined,
    long ? { month: 'long', year: 'numeric' } : { month: 'short' },
  )
}

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase()

export const categoryLabel = (category: Category) => titleCase(category)
export const statusLabel = (status: SubscriptionStatus) => titleCase(status)
export const cycleLabel = (cycle: BillingCycle) => titleCase(cycle)

const CYCLE_UNITS: Record<BillingCycle, string> = {
  WEEKLY: 'week',
  MONTHLY: 'month',
  QUARTERLY: 'quarter',
  YEARLY: 'year',
}
export const cycleUnit = (cycle: BillingCycle) => CYCLE_UNITS[cycle]
