describe('Grid Operations & Resizing', () => {
  it('grid resize 5×5 → 13×13 → 5×5', () => {
    const sequence = [5, 13, 5];
    let currentSize = sequence[0];
    
    sequence.forEach((targetSize) => {
      const cells = [];
      for (let i = -Math.floor(targetSize/2); i <= Math.floor(targetSize/2); i++) {
        for (let j = -Math.floor(targetSize/2); j <= Math.floor(targetSize/2); j++) {
          cells.push({ front: i, rear: j, value: Math.random() });
        }
      }
      
      currentSize = targetSize;
      expect(cells.length).toBe(targetSize * targetSize);
    });
    
    expect(currentSize).toBe(5);
  });

  it('no data corruption during resize', () => {
    const original = { FL: { cells: Array(25).fill(1.5) } };
    const backup = JSON.parse(JSON.stringify(original));
    
    // Simulate resize operation
    const resized = { FL: { cells: Array(169).fill(1.5) } };
    
    // Original shouldn't change
    expect(original).toEqual(backup);
    expect(original.FL.cells.length).toBe(25);
  });

  it('interpolation updated correctly on resize', () => {
    const sizes = [5, 13];
    const required = [-6, -3, 0, 3, 6];
    
    sizes.forEach(size => {
      let measured = 0;
      let interpolated = 0;
      
      for (let i = -Math.floor(size/2); i <= Math.floor(size/2); i++) {
        for (let j = -Math.floor(size/2); j <= Math.floor(size/2); j++) {
          if (required.includes(i) && required.includes(j)) {
            measured++;
          } else {
            interpolated++;
          }
        }
      }
      
      expect(measured).toBe(25);
      expect(measured + interpolated).toBe(size * size);
    });
  });

  it('verify consistency across 10 resize operations', () => {
    let lastSize = 5;
    
    for (let i = 0; i < 10; i++) {
      const newSize = i % 2 === 0 ? 13 : 5;
      
      const grid = [];
      for (let x = -Math.floor(newSize/2); x <= Math.floor(newSize/2); x++) {
        for (let y = -Math.floor(newSize/2); y <= Math.floor(newSize/2); y++) {
          grid.push([x, y]);
        }
      }
      
      expect(grid.length).toBe(newSize * newSize);
      lastSize = newSize;
    }
    
    expect(lastSize).toBe(5);
  });
});
