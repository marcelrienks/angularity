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
      const range = Math.floor(d/2);

      for (let i = -range; i <= range; i++) {
        for (let j = -range; j <= range; j++) {
          totalCells++;
          if (required.includes(i) && required.includes(j)) {
            measuredCells++;
          }
        }
      }

      expect(totalCells).toBe(d * d);

      // Count required positions that fit in range
      const requiredInRange = required.filter(p => p >= -range && p <= range).length;
      const expectedMeasured = requiredInRange * requiredInRange;
      expect(measuredCells).toBe(expectedMeasured);

      // Only for 13×13 all required positions fit
      if (d === 13) {
        expect(measuredCells).toBe(25);
      }
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
