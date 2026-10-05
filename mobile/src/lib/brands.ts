import { BRANDS, type Brand } from '@/lib/brand-icons';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Longer names first, so "YouTube Music" is not taken for YouTube.
const MATCHERS = BRANDS.flatMap((brand) => brand.names.map((name) => ({ brand, name })))
  .sort((a, b) => b.name.length - a.name.length)
  .map(({ brand, name }) => ({ brand, pattern: new RegExp(`(^|[^a-z0-9])${escape(name)}($|[^a-z0-9])`) }));

/** The brand a subscription's name points to, matched on whole words, or undefined for anything else. */
export function brandFor(subscriptionName: string): Brand | undefined {
  const name = subscriptionName.toLowerCase();
  return MATCHERS.find((matcher) => matcher.pattern.test(name))?.brand;
}

/** White on most brand colours, near-black on the pale ones. */
export function inkOn(color: string): string {
  const [red, green, blue] = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
  return (red * 299 + green * 587 + blue * 114) / 1000 > 160 ? '#0C1118' : '#FFFFFF';
}
