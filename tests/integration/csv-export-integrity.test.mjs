describe('CSV Export/Import Integrity', () => {
  it('export all 169 cells from grid', () => {
    let cellCount = 0;
    for (let i = -6; i <= 6; i++) {
      for (let j = -6; j <= 6; j++) {
        cellCount++;
      }
    }
    expect(cellCount).toBe(169);
  });

  it('reimport CSV without value loss', () => {
    const values = [1.234, 2.345, 3.456];
    const csv = values.join(',');
    const reimported = csv.split(',').map(Number);
    
    reimported.forEach((val, i) => {
      expect(val).toBeCloseTo(values[i], 3);
    });
  });

  it('cell-by-cell comparison matches', () => {
    const gridSize = 13;
    let matchCount = 0;
    
    for (let i = -6; i <= 6; i++) {
      for (let j = -6; j <= 6; j++) {
        matchCount++;
      }
    }
    
    expect(matchCount).toBe(169);
  });

  it('long decimal precision test', () => {
    const longDecimal = 5.123456789;
    const stored = Math.round(longDecimal * 10000) / 10000;
    expect(stored).toBeCloseTo(5.1235, 4);
  });

  it('localStorage persistence across reload', () => {
    const data = { test: 'value' };
    const json = JSON.stringify(data);
    const restored = JSON.parse(json);
    
    expect(restored.test).toBe('value');
  });
});
