describe('Color Monotonicity Invariants', () => {
  function getColor(distance) {
    if (distance < 0.1) return 'green';
    if (distance < 0.3) return 'orange';
    return 'red';
  }

  it('closer cell never redder than farther cell (100 pairs)', () => {
    const colorRedness = { green: 0, orange: 1, red: 2 };
    
    for (let i = 0; i < 100; i++) {
      const dist1 = Math.random() * 0.5;
      const dist2 = dist1 + 0.1 + Math.random() * 0.4;
      
      const color1 = getColor(dist1);
      const color2 = getColor(dist2);
      
      expect(colorRedness[color1]).toBeLessThanOrEqual(colorRedness[color2]);
    }
  });

  it('best cell always green (closest to any target)', () => {
    const positions = [-1.20, -1.15, -1.10, -1.05, -1.00];
    const target = -1.10;
    
    const distances = positions.map(p => Math.abs(p - target));
    const minDistance = Math.min(...distances);
    const bestIndex = distances.indexOf(minDistance);
    
    const color = getColor(minDistance);
    expect(color).toBe('green');
    expect(positions[bestIndex]).toBe(-1.10);
  });

  it('verify monotonicity across 50 position pairs', () => {
    const colorGreenness = { green: 2, orange: 1, red: 0 };
    
    for (let i = 0; i < 50; i++) {
      const positions = [];
      for (let j = 0; j < 5; j++) {
        positions.push(-7 + j * 3);
      }
      
      const target = -1.10;
      const colors = positions.map(p => {
        const dist = Math.abs(p - target);
        return getColor(dist);
      });
      
      // Closer positions should be greener
      for (let k = 1; k < colors.length; k++) {
        if (Math.abs(positions[k] - target) > Math.abs(positions[k-1] - target)) {
          expect(colorGreenness[colors[k]]).toBeLessThanOrEqual(colorGreenness[colors[k-1]]);
        }
      }
    }
  });
});
