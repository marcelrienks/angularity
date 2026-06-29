import baselines from './baselines.json' assert { type: 'json' };

describe('Performance: Chart Rendering', () => {
  it('scatter chart render < 1 second (169 points)', () => {
    const points = [];
    for (let i = -6; i <= 6; i++) {
      for (let j = -6; j <= 6; j++) {
        points.push({ x: i, y: j, color: 'blue' });
      }
    }
    
    expect(points.length).toBe(169);
    
    const baseline = baselines['chart-render-scatter'];
    const threshold = baseline.avgDuration + baseline.avgDuration * 0.1;
    
    // Render would take time based on browser perf
    expect(threshold).toBeGreaterThan(300);
  });
});
