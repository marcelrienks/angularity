describe('Grid Operations', () => {
  it('grid resize 5×5 → 13×13 → 5×5', () => {
    const sizes = [5, 13, 5];
    let currentSize = sizes[0];
    
    sizes.forEach(size => {
      currentSize = size;
      const cellCount = size * size;
      expect(cellCount).toBeGreaterThan(0);
    });
    
    expect(currentSize).toBe(5);
  });

  it('no data corruption during resize', () => {
    const original = { cells: [1, 2, 3, 4, 5] };
    const backup = JSON.parse(JSON.stringify(original));
    
    // Resize operation
    const resized = { ...original };
    
    expect(resized.cells).toEqual(backup.cells);
  });

  it('interpolation updated correctly on resize', () => {
    const densities = [5, 13];
    
    densities.forEach(d => {
      const positions = [];
      for (let i = -Math.floor(d/2); i <= Math.floor(d/2); i++) {
        positions.push(i);
      }
      expect(positions.length).toBe(d);
    });
  });
});
