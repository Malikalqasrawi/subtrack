import type { RenewalEntry } from '@/api/types';
import { toIsoDate } from '@/lib/format';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export const addMonths = (month: Date, count: number) => new Date(month.getFullYear(), month.getMonth() + count, 1);

/**
 * The month as rows of seven cells, Sunday first. Each cell is a yyyy-mm-dd date, or null
 * for the empty cells before the 1st and after the last day.
 */
export function monthWeeks(month: Date): (string | null)[][] {
  const first = startOfMonth(month);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toIsoDate(new Date(first.getFullYear(), first.getMonth(), day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return weeks;
}

export function groupByDate(renewals: RenewalEntry[]): Map<string, RenewalEntry[]> {
  const byDate = new Map<string, RenewalEntry[]>();
  for (const renewal of renewals) {
    byDate.set(renewal.date, [...(byDate.get(renewal.date) ?? []), renewal]);
  }
  return byDate;
}
