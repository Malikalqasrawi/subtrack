import { brandFor, inkOn } from '@/lib/brands';

describe('brandFor', () => {
  it.each([
    ['Netflix', '#E50914'],
    ['netflix premium', '#E50914'],
    ['Spotify Family', '#1ED760'],
    ['iCloud+', '#3693F3'],
  ])('recognises %s', (name, color) => {
    expect(brandFor(name)?.color).toBe(color);
  });

  it('prefers the longer name when two brands fit', () => {
    expect(brandFor('YouTube Music')).not.toBe(brandFor('YouTube Premium'));
    expect(brandFor('YouTube Music')?.names).toContain('youtube music');
    expect(brandFor('Apple TV+')?.names).toContain('apple tv');
  });

  it('matches whole words only', () => {
    expect(brandFor('Pineapple delivery')).toBeUndefined();
    expect(brandFor('Wixel')).toBeUndefined();
  });

  it('leaves everything else to the category icon', () => {
    expect(brandFor('Gym')).toBeUndefined();
    expect(brandFor('')).toBeUndefined();
  });
});

describe('inkOn', () => {
  it('draws white on strong colours and dark on pale ones', () => {
    expect(inkOn('#E50914')).toBe('#FFFFFF');
    expect(inkOn('#000000')).toBe('#FFFFFF');
    expect(inkOn('#FFFC00')).toBe('#0C1118');
  });
});
