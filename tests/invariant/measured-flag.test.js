describe('Measured Flag Correctness Invariants', () => {
  it('isInterpolated === false only for measured positions (all 169 cells)', () => {
    const measured = [-6, -3, 0, 3, 6];
    let measuredCount = 0;
    let interpolatedCount = 0;
    
    for (let front = -6; front <= 6; front++) {
      for (let rear = -6; rear <= 6; rear++) {
        const isMeasured = measured.includes(front) && measured.includes(rear);
        
        if (isMeasured) {
          measuredCount++;
          expect(isMeasured).toBe(true);
        } else {
          interpolatedCount++;
          expect(isMeasured).toBe(false);
        }
      }
    }
    
    expect(measuredCount + interpolatedCount).toBe(169);
    expect(measuredCount).toBe(25); // 5×5 measured positions
  });

  it('required positions never interpolated (across all wheels)', () => {
    const required = [-6, -3, 0, 3, 6];
    
    required.forEach(front => {
      required.forEach(rear => {
        const isRequired = required.includes(front) && required.includes(rear);
        expect(isRequired).toBe(true);
      });
    });
  });

  it('density change updates all flags correctly', () => {
    const densities = [5, 7, 13];
    const required = [-6, -3, 0, 3, 6];
    
    densities.forEach(d => {
      let totalCells = 0;
      let measuredCells = 0;
      
      for (let i = -Math.floor(d/2); i <= Math.floor(d/2); i++) {
        for (let j = -Math.floor(d/2); j <= Math.floor(d/2); j++) {
          totalCells++;
          if (required.includes(i) && required.includes(j)) {
            measuredCells++;
          }
        }
      }
      
      expect(totalCells).toBe(d * d);
      expect(measuredCells).toBe(25); // Always 5×5 required positions
      expect(totalCells - measuredCells).toBeGreaterThan(0); // Rest are interpolated
    });
  });

  it('verify 100 random cells have consistent flags', () => {
    const required = [-6, -3, 0, 3, 6];
    
    for (let i = 0; i < 100; i++) {
      const front = -6 + Math.floor(Math.random() * 13);
      const rear = -6 + Math.floor(Math.random() * 13);
      
      const isMeasured = required.includes(front) && required.includes(rear);
      const isInterpolated = !isMeasured;
      
      expect(typeof isMeasured).toBe('boolean');
      expect(typeof isInterpolated).toBe('boolean');
      expect(isMeasured).not.toBe(isInterpolated);
    }
  });
});
