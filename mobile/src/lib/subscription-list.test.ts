import { monthlyTotal, nextSort, visibleSubscriptions } from '@/lib/subscription-list';
import { subscription } from '@/test/fixtures';

const netflix = subscription({ id: '1', name: 'Netflix', monthlyCost: 15.99, nextRenewalDate: '2026-10-14' });
const gym = subscription({ id: '2', name: 'Gym', monthlyCost: 35, nextRenewalDate: '2026-10-05' });
const spotify = subscription({ id: '3', name: 'Spotify', monthlyCost: 6, status: 'PAUSED', nextRenewalDate: null });
const all = [netflix, gym, spotify];

const names = (...args: Parameters<typeof visibleSubscriptions>) => visibleSubscriptions(...args).map((item) => item.name);

describe('visibleSubscriptions', () => {
  it('puts the soonest renewal first and ones with no renewal last', () => {
    expect(names(all, '', 'ALL', 'renewal')).toEqual(['Gym', 'Netflix', 'Spotify']);
  });

  it('can order by price, highest first, or by name', () => {
    expect(names(all, '', 'ALL', 'price')).toEqual(['Gym', 'Netflix', 'Spotify']);
    expect(names(all, '', 'ALL', 'name')).toEqual(['Gym', 'Netflix', 'Spotify']);
    expect(names([spotify, netflix], '', 'ALL', 'price')).toEqual(['Netflix', 'Spotify']);
  });

  it('keeps only the chosen status', () => {
    expect(names(all, '', 'PAUSED', 'renewal')).toEqual(['Spotify']);
    expect(names(all, '', 'CANCELLED', 'renewal')).toEqual([]);
  });

  it('searches the name, whatever the capitals or spaces around it', () => {
    expect(names(all, '  NET ', 'ALL', 'renewal')).toEqual(['Netflix']);
    expect(names(all, 'y', 'ALL', 'name')).toEqual(['Gym', 'Spotify']);
  });

  it('leaves the list it was given as it was', () => {
    const original = [...all];
    visibleSubscriptions(all, '', 'ALL', 'price');
    expect(all).toEqual(original);
  });
});

describe('nextSort', () => {
  it('goes round the three orders', () => {
    expect(nextSort('renewal')).toBe('price');
    expect(nextSort('price')).toBe('name');
    expect(nextSort('name')).toBe('renewal');
  });
});

describe('monthlyTotal', () => {
  it('adds up active subscriptions only', () => {
    expect(monthlyTotal(all)).toBeCloseTo(50.99);
  });
});
