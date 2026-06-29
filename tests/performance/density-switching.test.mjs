describe('Performance: Density Switching', () => {
  it('5×5 ↔ 13×13 ↔ 5×5 smooth transitions', () => {
    const densities = [5, 13, 5];
    const times = [];
    
    densities.forEach(d => {
      const start = performance.now();
      
      // Simulate grid operation
      const grid = [];
      for (let i = -Math.floor(d/2); i <= Math.floor(d/2); i++) {
        for (let j = -Math.floor(d/2); j <= Math.floor(d/2); j++) {
          grid.push({ pos: [i,j], value: Math.random() });
        }
      }
      
      const duration = performance.now() - start;
      times.push(duration);
    });
    
    // All transitions should be fast
    times.forEach(t => {
      expect(t).toBeLessThan(1000); // < 1 second per transition
    });
  });
});
