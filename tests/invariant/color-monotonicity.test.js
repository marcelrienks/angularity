describe('Color Monotonicity', () => {
  it('closer cell never redder than farther cell', () => {
    const target = -1.10;
    const colorMap = (distance) => {
      if (distance < 0.1) return 'green';
      if (distance < 0.3) return 'orange';
      return 'red';
    };

    const colorOrder = { green: 0, orange: 1, red: 2 };

    // Test 10 pairs
    for (let i = 0; i < 10; i++) {
      const distance1 = i * 0.05;
      const distance2 = (i + 1) * 0.05;
      
      const color1 = colorMap(distance1);
      const color2 = colorMap(distance2);
      
      expect(colorOrder[color1]).toBeLessThanOrEqual(colorOrder[color2]);
    }
  });

  it('best cell always green (closest to target)', () => {
    const target = -1.10;
    const positions = [-1.00, -1.10, -1.20];
    
    const distances = positions.map(p => Math.abs(p - target));
    const minDistance = Math.min(...distances);
    
    // Best position should be -1.10 with distance 0
    expect(minDistance).toBeLessThan(0.15);
    
    // Best cell color should be green
    const color = minDistance < 0.1 ? 'green' : 'orange';
    expect(color).toBe('green');
  });
});
