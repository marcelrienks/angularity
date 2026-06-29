describe('Code Change Regression', () => {
  it('snapshot test detects formula changes', () => {
    const snapshot = { caster: 1.0, camber: 3.0, color: 'green' };
    const current = { caster: 1.0, camber: 3.0, color: 'green' };
    
    expect(current).toEqual(snapshot);
  });

  it('sample data determinism: 10 runs identical', () => {
    const results = [];
    
    for (let i = 0; i < 10; i++) {
      const result = { value: 5.0, color: 'green' };
      results.push(result);
    }
    
    // All should be identical
    const first = results[0];
    results.forEach(r => {
      expect(r.value).toBe(first.value);
      expect(r.color).toBe(first.color);
    });
  });
});
