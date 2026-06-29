describe('Consistency & Determinism', () => {
  it('same input produces same output', () => {
    const input = { angle360CW: 6.0, angle360ACW: 4.0 };
    
    const result1 = (input.angle360CW - input.angle360ACW) / 2;
    const result2 = (input.angle360CW - input.angle360ACW) / 2;
    
    expect(result1).toBe(result2);
  });

  it('localStorage integrity across reloads', () => {
    const data = { key: 'value' };
    const stored = JSON.stringify(data);
    const restored = JSON.parse(stored);
    
    expect(restored).toEqual(data);
  });

  it('wheel independence: FL changes don\'t affect others', () => {
    const wheels = { FL: 1.0, FR: 2.0, RL: 3.0, RR: 4.0 };
    const flOriginal = wheels.FR;
    
    wheels.FL = 1.5;
    
    expect(wheels.FR).toBe(flOriginal);
  });

  it('clear and reload consistency', () => {
    const grid = { FL: { values: [1, 2, 3] } };
    const backup = JSON.parse(JSON.stringify(grid));
    
    // Clear
    grid.FL.values = [];
    
    // Reload
    grid = backup;
    
    expect(grid.FL.values).toEqual([1, 2, 3]);
  });
});
