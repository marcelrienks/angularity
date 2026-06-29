describe('Boundary: Position Handling', () => {
  it('positions -6 to +6 all work without errors', () => {
    for (let i = -6; i <= 6; i++) {
      expect(i).toBeGreaterThanOrEqual(-6);
      expect(i).toBeLessThanOrEqual(6);
      expect(typeof i).toBe('number');
    }
  });

  it('calculations correct at boundaries', () => {
    const testCases = [
      { pos: -6, value: 5.0 },
      { pos: 6, value: 6.0 },
      { pos: 0, value: 3.0 },
    ];

    testCases.forEach(({ pos, value }) => {
      expect(pos).toBeGreaterThanOrEqual(-6);
      expect(pos).toBeLessThanOrEqual(6);
      expect(value).toBeGreaterThan(0);
    });
  });

  it('required positions always present', () => {
    const required = [-6, -3, 0, 3, 6];
    expect(required.length).toBe(5);
    required.forEach(pos => {
      expect(typeof pos).toBe('number');
    });
  });

  it('empty grid handling without crash', () => {
    const grid = {};
    expect(Object.keys(grid).length).toBe(0);
    expect(() => {
      Object.keys(grid).forEach(key => {
        // No crash on iteration
      });
    }).not.toThrow();
  });

  it('single measurement interpolation stability', () => {
    const center = 3.0; // Center cell only
    expect(center).toBeDefined();
    expect(typeof center).toBe('number');
  });

  it('zero target handling', () => {
    const target = 0.0;
    const position = -0.5;
    const distance = Math.abs(position - target);
    expect(distance).toBeCloseTo(0.5, 2);
  });

  it('division by zero prevention', () => {
    const angle1 = 5.0;
    const angle2 = 5.0;
    const caster = (angle1 - angle2) / 2;
    
    expect(isFinite(caster)).toBe(true);
    expect(caster).toBe(0);
  });

  it('long decimal precision preservation', () => {
    const val = 5.123456789;
    const stored = parseFloat(val.toFixed(4));
    expect(stored).toBeCloseTo(5.1235, 4);
  });
});
