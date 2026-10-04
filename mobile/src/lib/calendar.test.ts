import type { RenewalEntry } from '@/api/types';
import { addMonths, groupByDate, monthWeeks, startOfMonth } from '@/lib/calendar';
import { toIsoDate } from '@/lib/format';

const renewal = (name: string, date: string): RenewalEntry => ({
  subscriptionId: name.toLowerCase(),
  name,
  category: 'ENTERTAINMENT',
  date,
  amount: 9.99,
  currency: 'USD',
  convertedAmount: 9.99,
});

describe('monthWeeks', () => {
  it('leaves the cells before the 1st empty', () => {
    const weeks = monthWeeks(new Date(2026, 9, 1));

    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(weeks[4]).toEqual(['2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']);
  });

  it('needs no empty cells when the month starts on Sunday and ends on Saturday', () => {
    const weeks = monthWeeks(new Date(2026, 1, 1));

    expect(weeks).toHaveLength(4);
    expect(weeks.flat()).not.toContain(null);
  });

  it('adds a sixth row and fills the last week when a long month starts late in the week', () => {
    const weeks = monthWeeks(new Date(2026, 7, 1));

    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-08-01']);
    expect(weeks[5]).toEqual(['2026-08-30', '2026-08-31', null, null, null, null, null]);
  });

  it('includes 29 February in a leap year', () => {
    expect(monthWeeks(new Date(2028, 1, 1)).flat()).toContain('2028-02-29');
    expect(monthWeeks(new Date(2026, 1, 1)).flat()).not.toContain('2026-02-29');
  });

  it('works from any day of the month', () => {
    expect(monthWeeks(new Date(2026, 9, 20))).toEqual(monthWeeks(new Date(2026, 9, 1)));
  });
});

describe('moving between months', () => {
  it('goes back to the first day of the month', () => {
    expect(toIsoDate(startOfMonth(new Date(2026, 9, 31, 23, 59)))).toBe('2026-10-01');
  });

  it('crosses the year in both directions', () => {
    expect(toIsoDate(addMonths(new Date(2026, 11, 1), 1))).toBe('2027-01-01');
    expect(toIsoDate(addMonths(new Date(2026, 0, 1), -1))).toBe('2025-12-01');
  });
});

describe('groupByDate', () => {
  it('collects the charges of each day, in the order they came', () => {
    const byDate = groupByDate([renewal('Netflix', '2026-10-14'), renewal('Spotify', '2026-10-20'), renewal('iCloud+', '2026-10-14')]);

    expect(byDate.get('2026-10-14')?.map((entry) => entry.name)).toEqual(['Netflix', 'iCloud+']);
    expect(byDate.get('2026-10-20')).toHaveLength(1);
    expect(byDate.get('2026-10-15')).toBeUndefined();
  });
});
