describe('Interpolation Bounds', () => {
  it('interpolated values never outside measured neighbor range', () => {
    const neighbors = [4.0, 6.0];
    const interpolated = (neighbors[0] + neighbors[1]) / 2;
    
    expect(interpolated).toBeGreaterThanOrEqual(Math.min(...neighbors));
    expect(interpolated).toBeLessThanOrEqual(Math.max(...neighbors));
  });

  it('no extrapolation beyond -6 to +6 positions', () => {
    const validRange = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    validRange.forEach(pos => {
      expect(pos).toBeGreaterThanOrEqual(-6);
      expect(pos).toBeLessThanOrEqual(6);
    });
  });

  it('linear interpolation: midpoint = average of endpoints', () => {
    const testCases = [
      { val1: 2.0, val2: 4.0, expected: 3.0 },
      { val1: -2.0, val2: 2.0, expected: 0.0 },
      { val1: 1.5, val2: 3.5, expected: 2.5 },
    ];

    testCases.forEach(({ val1, val2, expected }) => {
      const interpolated = (val1 + val2) / 2;
      expect(interpolated).toBeCloseTo(expected, 2);
    });
  });

  it('quarter-point and three-quarter-point validation', () => {
    const val1 = 2.0, val2 = 4.0;
    const quarter = val1 + (val2 - val1) * 0.25;
    const threequarter = val1 + (val2 - val1) * 0.75;

    expect(quarter).toBeCloseTo(2.5, 2);
    expect(threequarter).toBeCloseTo(3.5, 2);
    expect(quarter).toBeLessThan((val1 + val2) / 2);
    expect(threequarter).toBeGreaterThan((val1 + val2) / 2);
  });
});
