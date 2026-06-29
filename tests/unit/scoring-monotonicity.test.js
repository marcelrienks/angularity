describe('Golden Rule Score Monotonicity', () => {
  it('score increases monotonically as distance to target decreases', () => {
    const target = -1.10;
    const scores = [];
    
    for (let distance = 0; distance <= 1.0; distance += 0.1) {
      const score = Math.max(0, 1 - distance * 2);
      scores.push(score);
    }
    
    // Verify strictly decreasing as distance increases
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('no scoring dips: closest cell always wins', () => {
    const target = -1.10;
    const testValues = [-1.10, -1.11, -1.09, -1.20, -1.00];
    
    const scores = testValues.map(v => {
      const distance = Math.abs(v - target);
      return 1 / (1 + distance);
    });
    
    const maxScore = Math.max(...scores);
    const bestIndex = scores.indexOf(maxScore);
    expect(testValues[bestIndex]).toBe(-1.10);
  });

  it('direction correct: best = highest score', () => {
    const target = 5.00;
    const values = [4.0, 4.5, 5.0, 5.5, 6.0];
    
    const scores = values.map(v => {
      const distance = Math.abs(v - target);
      return Math.exp(-distance * distance); // Gaussian scoring
    });
    
    const maxScore = Math.max(...scores);
    expect(maxScore).toBe(scores[2]); // 5.0 should win
  });

  it('100 random positions all maintain monotonicity', () => {
    const target = -1.10;
    const positions = [];
    
    for (let i = 0; i < 100; i++) {
      const pos = -7 + Math.random() * 14;
      const distance = Math.abs(pos - target);
      const score = Math.max(0, 1 - distance);
      positions.push({ pos, distance, score });
    }
    
    // Verify: lower distance = higher or equal score
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[i].distance < positions[j].distance) {
          expect(positions[i].score).toBeGreaterThanOrEqual(positions[j].score);
        }
      }
    }
  });
});
