import { linePaths, linePoints, ringArcs } from '@/lib/charts';

describe('ringArcs', () => {
  it('gives each value an arc as long as its share, one after the other', () => {
    expect(ringArcs([50, 30, 20], 100, 0)).toEqual([
      { length: 50, offset: 0 },
      { length: 30, offset: 50 },
      { length: 20, offset: 80 },
    ]);
  });

  it('leaves a gap between neighbours without moving where they start', () => {
    expect(ringArcs([50, 50], 100, 4)).toEqual([
      { length: 46, offset: 0 },
      { length: 46, offset: 50 },
    ]);
  });

  it('closes the ring when there is only one value', () => {
    expect(ringArcs([12], 100, 4)).toEqual([{ length: 100, offset: 0 }]);
  });

  it('draws nothing when there is nothing to show', () => {
    expect(ringArcs([0, 0], 100, 4)).toEqual([
      { length: 0, offset: 0 },
      { length: 0, offset: 0 },
    ]);
  });
});

describe('linePoints', () => {
  it('spreads the values across the width with the highest at the top', () => {
    expect(linePoints([0, 50, 100], 220, 120, 10)).toEqual([
      { x: 10, y: 110 },
      { x: 110, y: 60 },
      { x: 210, y: 10 },
    ]);
  });

  it('measures from zero, so an even series is a line along the top', () => {
    expect(linePoints([40, 40], 220, 120, 10).map((point) => point.y)).toEqual([10, 10]);
    expect(linePoints([50, 100], 220, 120, 10).map((point) => point.y)).toEqual([60, 10]);
  });

  it('lies along the bottom when every value is zero', () => {
    expect(linePoints([0, 0], 220, 120, 10).map((point) => point.y)).toEqual([110, 110]);
  });

  it('centres a single value across the width', () => {
    expect(linePoints([40], 220, 120, 10)[0].x).toBe(110);
  });
});

describe('linePaths', () => {
  it('draws the line and closes the area down to the baseline', () => {
    const paths = linePaths(
      [
        { x: 10, y: 110 },
        { x: 110, y: 60.04 },
      ],
      120,
    );

    expect(paths.line).toBe('M10 110 L110 60');
    expect(paths.area).toBe('M10 110 L110 60 L110 120 L10 120 Z');
  });

  it('is empty without points', () => {
    expect(linePaths([], 120)).toEqual({ line: '', area: '' });
  });
});
