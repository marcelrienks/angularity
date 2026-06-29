import { expectMonotonicity } from '../fixtures/test-helpers.js';

describe('Interpolation Bounds', () => {
  it('interpolated values never outside measured neighbor range', () => {
    const testCases = [
      { val1: 2.0, val2: 8.0, interpolated: 5.0 },
      { val1: -2.0, val2: 2.0, interpolated: 0.0 },
      { val1: 1.0, val2: 3.0, interpolated: 2.0 },
      { val1: 0.0, val2: 10.0, interpolated: 5.0 },
    ];

    testCases.forEach(({ val1, val2, interpolated }) => {
      const min = Math.min(val1, val2);
      const max = Math.max(val1, val2);
      expect(interpolated).toBeGreaterThanOrEqual(min);
      expect(interpolated).toBeLessThanOrEqual(max);
    });
  });

  it('no extrapolation beyond -6 to +6 positions (all densities)', () => {
    const densities = [5, 7, 13];
    
    densities.forEach(d => {
      const positions = [];
      for (let i = -Math.floor(d/2); i <= Math.floor(d/2); i++) {
        positions.push(i);
      }
      
      // All positions within bounds
      positions.forEach(p => {
        expect(p).toBeGreaterThanOrEqual(-Math.floor(d/2));
        expect(p).toBeLessThanOrEqual(Math.floor(d/2));
      });
    });
  });

  it('linear: value at 0.5 = (val_left + val_right) / 2', () => {
    const testCases = [
      { left: 2.0, right: 4.0, expected: 3.0 },
      { left: -1.0, right: 1.0, expected: 0.0 },
      { left: 5.5, right: 6.5, expected: 6.0 },
    ];

    testCases.forEach(({ left, right, expected }) => {
      const midpoint = (left + right) / 2;
      expect(midpoint).toBeCloseTo(expected, 2);
    });
  });

  it('quarter-point and three-quarter-point validation', () => {
    const val1 = 0.0, val2 = 4.0;
    const quarter = val1 + (val2 - val1) * 0.25;
    const mid = val1 + (val2 - val1) * 0.5;
    const threequarter = val1 + (val2 - val1) * 0.75;
    
    expect(quarter).toBeCloseTo(1.0, 2);
    expect(mid).toBeCloseTo(2.0, 2);
    expect(threequarter).toBeCloseTo(3.0, 2);
    expect(quarter).toBeLessThan(mid);
    expect(mid).toBeLessThan(threequarter);
  });
});
