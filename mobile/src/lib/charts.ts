export interface Point {
  x: number;
  y: number;
}

/**
 * Splits a ring of the given circumference into one arc per value, each as long as its share.
 * `gap` is taken off the end of every arc so neighbours do not touch; a single value fills the ring.
 */
export function ringArcs(values: number[], circumference: number, gap: number): { length: number; offset: number }[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => ({ length: 0, offset: 0 }));
  const spacing = values.filter((value) => value > 0).length > 1 ? gap : 0;
  let offset = 0;
  return values.map((value) => {
    const share = (value / total) * circumference;
    const arc = { length: Math.max(0, share - spacing), offset };
    offset += share;
    return arc;
  });
}

/** Places values left to right across the width, measured up from zero so the highest touches the top. */
export function linePoints(values: number[], width: number, height: number, padding: number): Point[] {
  const highest = Math.max(...values, 0);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  return values.map((value, index) => ({
    x: padding + (values.length === 1 ? usableWidth / 2 : (index / (values.length - 1)) * usableWidth),
    y: padding + (highest === 0 ? usableHeight : (1 - value / highest) * usableHeight),
  }));
}

const round = (value: number) => Math.round(value * 10) / 10;

/** An SVG path through the points, and the same path closed down to the baseline for filling. */
export function linePaths(points: Point[], baseline: number): { line: string; area: string } {
  if (points.length === 0) return { line: '', area: '' };
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  return { line, area: `${line} L${round(last.x)} ${baseline} L${round(first.x)} ${baseline} Z` };
}
