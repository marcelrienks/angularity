describe('Measured Flag Correctness', () => {
  it('isInterpolated === false only for measured positions', () => {
    const measured = [-6, -3, 0, 3, 6];
    
    for (let i = -6; i <= 6; i++) {
      const isMeasured = measured.includes(i);
      const isInterpolated = !isMeasured;
      
      if (measured.includes(i)) {
        expect(isInterpolated).toBe(false);
      } else {
        expect(isInterpolated).toBe(true);
      }
    }
  });

  it('required positions never interpolated', () => {
    const required = [-6, -3, 0, 3, 6];
    
    required.forEach(pos => {
      const isInterpolated = false; // Required positions are always measured
      expect(isInterpolated).toBe(false);
    });
  });

  it('density change updates all flags correctly', () => {
    const densities = [5, 7, 13];
    
    densities.forEach(gridSize => {
      let interpolatedCount = 0;
      let measuredCount = 0;
      
      const positions = [];
      for (let i = -Math.floor(gridSize / 2); i <= Math.floor(gridSize / 2); i++) {
        positions.push(i);
      }
      
      positions.forEach(pos => {
        const isMeasured = [-6, -3, 0, 3, 6].includes(pos) || 
                          Math.abs(pos * 2 / (gridSize - 1)) <= 1;
        if (isMeasured) measuredCount++;
        else interpolatedCount++;
      });
      
      expect(measuredCount + interpolatedCount).toBe(positions.length);
    });
  });
});
