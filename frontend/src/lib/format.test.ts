import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { categoryLabel, cycleUnit, daysUntil, parseIsoDate, relativeDay, toIsoDate } from './format'

describe('dates', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 4, 15, 30))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads a yyyy-mm-dd string as a local date, not UTC', () => {
    const date = parseIsoDate('2026-10-04')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 4])
    expect(date.getHours()).toBe(0)
  })

  it('writes a date back in the same form', () => {
    expect(toIsoDate(new Date(2026, 0, 9))).toBe('2026-01-09')
    expect(toIsoDate(parseIsoDate('2026-12-31'))).toBe('2026-12-31')
  })

  it('counts whole days whatever the time of day', () => {
    expect(daysUntil('2026-10-04')).toBe(0)
    expect(daysUntil('2026-10-05')).toBe(1)
    expect(daysUntil('2026-11-03')).toBe(30)
    expect(daysUntil('2026-10-01')).toBe(-3)
  })

  it('describes a renewal relative to today', () => {
    expect(relativeDay('2026-10-04')).toBe('Today')
    expect(relativeDay('2026-10-05')).toBe('Tomorrow')
    expect(relativeDay('2026-10-12')).toBe('In 8 days')
    expect(relativeDay('2026-10-01')).toBe('Today')
  })
})

describe('labels', () => {
  it('turns enum names into words', () => {
    expect(categoryLabel('ENTERTAINMENT')).toBe('Entertainment')
    expect(cycleUnit('QUARTERLY')).toBe('quarter')
    expect(cycleUnit('YEARLY')).toBe('year')
  })
})
