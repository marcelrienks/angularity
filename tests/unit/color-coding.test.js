describe('Color Coding Distance Mapping', () => {
  function getColor(distance) {
    if (distance < 0.1) return 'green';
    if (distance < 0.3) return 'orange';
    return 'red';
  }

  it('distance → color (green/orange/red) mapping', () => {
    const testCases = [
      { distance: 0.0, expected: 'green' },
      { distance: 0.05, expected: 'green' },
      { distance: 0.10, expected: 'orange' },
      { distance: 0.20, expected: 'orange' },
      { distance: 0.30, expected: 'red' },
      { distance: 0.50, expected: 'red' },
    ];

    testCases.forEach(({ distance, expected }) => {
      expect(getColor(distance)).toBe(expected);
    });
  });

  it('monotonic: closer values always greener', () => {
    const colorGreenness = { green: 2, orange: 1, red: 0 };
    const distances = [0.0, 0.05, 0.15, 0.35, 0.60];
    
    const colors = distances.map(d => getColor(d));
    
    // Verify greenness decreases as distance increases
    for (let i = 1; i < colors.length; i++) {
      expect(colorGreenness[colors[i]]).toBeLessThanOrEqual(colorGreenness[colors[i - 1]]);
    }
  });

  it('threshold boundaries validated', () => {
    expect(getColor(0.09)).toBe('green');
    expect(getColor(0.10)).toBe('orange');
    expect(getColor(0.29)).toBe('orange');
    expect(getColor(0.30)).toBe('red');
    
    // Boundary precision
    expect(getColor(0.099)).toBe('green');
    expect(getColor(0.101)).toBe('orange');
  });

  it('100 random distances all colored correctly', () => {
    for (let i = 0; i < 100; i++) {
      const distance = Math.random() * 1.0;
      const color = getColor(distance);
      
      expect(['green', 'orange', 'red']).toContain(color);
      
      if (distance < 0.1) expect(color).toBe('green');
      else if (distance < 0.3) expect(color).toBe('orange');
      else expect(color).toBe('red');
    }
  });
});
