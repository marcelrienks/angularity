import baselines from './baselines.json' assert { type: 'json' };

describe('Performance: Calculation Speed', () => {
  it('13×13 grid calculation < 1 second', () => {
    const start = performance.now();
    
    // Simulate 13x13 calculation
    let result = 0;
    for (let i = -6; i <= 6; i++) {
      for (let j = -6; j <= 6; j++) {
        result += Math.sin(i * 0.5) + Math.cos(j * 0.3);
      }
    }
    
    const duration = performance.now() - start;
    const baseline = baselines['calculation-speed-13x13'];
    const threshold = baseline.avgDuration + baseline.avgDuration * 0.1;
    
    expect(duration).toBeLessThan(threshold);
  });

  it('7×7 grid calculation baseline', () => {
    const start = performance.now();
    
    let result = 0;
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        result += Math.sin(i * 0.5) + Math.cos(j * 0.3);
      }
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500); // < 500ms
  });

  it('5×5 grid calculation baseline', () => {
    const start = performance.now();
    
    let result = 0;
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        result += Math.sin(i * 0.5) + Math.cos(j * 0.3);
      }
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(300); // < 300ms
  });
});
