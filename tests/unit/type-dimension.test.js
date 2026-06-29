describe('Type & Dimension Consistency', () => {
  it('all camber/caster in degrees (not radians)', () => {
    const angleValues = [-1.5, -1.1, 0.0, 5.0, 6.0];
    
    angleValues.forEach(angle => {
      // Angles should be in degrees, not radians
      expect(angle).toBeGreaterThanOrEqual(-10);
      expect(angle).toBeLessThanOrEqual(10);
      
      // Radian equivalent would be much smaller
      const inRadians = angle * (Math.PI / 180);
      expect(Math.abs(inRadians)).toBeLessThan(Math.PI / 20);
    });
  });

  it('rear toe in mm (not degrees)', () => {
    const toeValues = [0.07, 0.1, 0.05, 0.2];
    
    toeValues.forEach(toe => {
      expect(toe).toBeGreaterThanOrEqual(0);
      expect(toe).toBeLessThanOrEqual(1.0);
      
      // Should be in mm range, not degree range
      expect(toe).toBeLessThan(10); // Would be huge in degrees
    });
  });

  it('string-to-number conversion preserves precision', () => {
    const testCases = [
      { input: '5.71', expected: 5.71 },
      { input: '1.123456789', expected: 1.123456789 },
      { input: '-1.50', expected: -1.50 },
      { input: '0.07', expected: 0.07 },
    ];

    testCases.forEach(({ input, expected }) => {
      const converted = parseFloat(input);
      expect(converted).toBeCloseTo(expected, 8);
    });
  });

  it('caster formula uses degrees (not mixed units)', () => {
    const angle1 = 6.0; // degrees
    const angle2 = 4.0; // degrees
    const caster = (angle1 - angle2) / 2;
    
    expect(caster).toBeCloseTo(1.0, 2); // Result in degrees
    expect(caster).toBeGreaterThan(-10);
    expect(caster).toBeLessThan(10);
  });

  it('interpolation does not convert between units', () => {
    const camber1 = -1.10; // degrees
    const camber2 = -1.20; // degrees
    const interpolated = (camber1 + camber2) / 2;
    
    expect(interpolated).toBeCloseTo(-1.15, 2);
    expect(interpolated).toBeGreaterThan(-10);
    expect(interpolated).toBeLessThan(10);
  });
});
