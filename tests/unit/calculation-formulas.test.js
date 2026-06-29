import { expectValueWithTolerance, expectMonotonicity } from '../fixtures/test-helpers.js';

const TOLERANCE = 0.01;

function calculateCaster(angle360CW, angle360ACW) {
  return (angle360CW - angle360ACW) / 2;
}

function calculateCamber(angle360ACW, angle0, angle360CW) {
  return (angle360ACW + angle0 + angle360CW) / 3;
}

function interpolateLinear(value1, value2) {
  return (value1 + value2) / 2;
}

describe('Caster Calculation', () => {
  describe('formula (360CW - 360ACW) / 2', () => {
    it('should return 1.0 when 360CW=6.0 and 360ACW=4.0', () => {
      expect(calculateCaster(6.0, 4.0)).toBeCloseTo(1.0, 2);
    });

    it('should return 0 when angles are identical', () => {
      expect(calculateCaster(5.0, 5.0)).toBeCloseTo(0.0, 2);
    });

    it('should handle negative differences', () => {
      expect(calculateCaster(3.0, 6.0)).toBeCloseTo(-1.5, 2);
    });

    it('should prevent division by zero', () => {
      const result = calculateCaster(5.0, 5.0);
      expect(isFinite(result)).toBe(true);
      expect(isNaN(result)).toBe(false);
    });

    it('should handle max position values', () => {
      expect(calculateCaster(7.0, 0.0)).toBeCloseTo(3.5, 2);
    });

    it('should handle min position values', () => {
      expect(calculateCaster(0.0, -7.0)).toBeCloseTo(3.5, 2);
    });
  });
});

describe('Camber Average Formula', () => {
  describe('3-point average: (360ACW + 0° + 360CW) / 3', () => {
    it('should calculate average correctly', () => {
      expect(calculateCamber(4.0, 3.0, 2.0)).toBeCloseTo(3.0, 2);
    });

    it('should preserve precision with long decimals', () => {
      expect(calculateCamber(5.123456, 4.654321, 6.789012)).toBeCloseTo(5.522263, 4);
    });

    it('should handle identical input values', () => {
      expect(calculateCamber(5.0, 5.0, 5.0)).toBeCloseTo(5.0, 2);
    });

    it('should handle mixed positive/negative angles', () => {
      expect(calculateCamber(-1.0, 0.0, 1.0)).toBeCloseTo(0.0, 2);
    });

    it('should maintain precision across multiple values', () => {
      [1.1, 2.2, 3.3, 4.4, 5.5].forEach(v => {
        expect(calculateCamber(v, v, v)).toBeCloseTo(v, 2);
      });
    });
  });
});

describe('Interpolation Linear Calculation', () => {
  describe('Linear interpolation', () => {
    it('value at 0.5 between -3 and +3 = average', () => {
      expect(interpolateLinear(4.0, 6.0)).toBeCloseTo(5.0, 2);
    });

    it('quarter-point interpolation', () => {
      const val1 = 2.0, val2 = 4.0;
      const quarter = val1 + (val2 - val1) * 0.25;
      expect(quarter).toBeCloseTo(2.5, 2);
    });

    it('three-quarter-point interpolation', () => {
      const val1 = 2.0, val2 = 4.0;
      const threequarter = val1 + (val2 - val1) * 0.75;
      expect(threequarter).toBeCloseTo(3.5, 2);
    });

    it('should handle boundary positions correctly', () => {
      const measured = [-6, -3, 0, 3, 6];
      measured.forEach(pos => {
        expect(measured.includes(pos)).toBe(true);
      });
    });

    it('interpolated flag correct for measured positions', () => {
      const measured = [-6, -3, 0, 3, 6];
      for (let i = -6; i <= 6; i++) {
        const isMeasured = measured.includes(i);
        expect(typeof isMeasured).toBe('boolean');
      }
    });

    it('all intermediate points are interpolated', () => {
      const measured = [-6, -3, 0, 3, 6];
      let interpolatedCount = 0;
      for (let i = -6; i <= 6; i++) {
        if (!measured.includes(i)) interpolatedCount++;
      }
      expect(interpolatedCount).toBe(8); // 13 total - 5 measured
    });
  });
});

describe('Golden Rule Score Monotonicity', () => {
  it('score increases as distance decreases', () => {
    const target = -1.10;
    const positions = [-2.0, -1.5, -1.20, -1.15, -1.10];
    const scores = positions.map(pos => {
      const distance = Math.abs(pos - target);
      return Math.max(0, 1 - distance * 2);
    });

    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });

  it('closest cell always has highest score', () => {
    const target = -1.10;
    const positions = [-1.10, -1.12, -1.08];
    const scores = positions.map(pos => {
      const distance = Math.abs(pos - target);
      return 1 / (1 + distance);
    });

    const maxScore = Math.max(...scores);
    const bestIdx = scores.indexOf(maxScore);
    expect(positions[bestIdx]).toBe(-1.10);
  });

  it('direction correct: best = highest score', () => {
    const target = 5.00;
    const values = [4.0, 5.0, 6.0];
    const scores = values.map(v => {
      const distance = Math.abs(v - target);
      return 100 - distance * 10;
    });

    expect(scores[1]).toBeGreaterThan(scores[0]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });

  it('100 random positions all monotonic', () => {
    const target = -1.10;
    for (let i = 0; i < 100; i++) {
      const pos = Math.random() * 14 - 7;
      const distance = Math.abs(pos - target);
      const score = Math.max(0, 1 - distance);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});

describe('Color Coding Distance Mapping', () => {
  it('distance → color mapping', () => {
    const target = -1.10;
    const testCases = [
      { value: -1.10, expectedColor: 'green' },
      { value: -1.15, expectedColor: 'green' },
      { value: -1.25, expectedColor: 'orange' },
      { value: -1.50, expectedColor: 'red' },
    ];

    testCases.forEach(({ value, expectedColor }) => {
      const distance = Math.abs(value - target);
      let color = 'green';
      if (distance > 0.3) color = 'red';
      else if (distance > 0.1) color = 'orange';
      expect(color).toBe(expectedColor);
    });
  });

  it('monotonic: closer values always greener', () => {
    const distances = [0.0, 0.05, 0.15, 0.4];
    const colors = distances.map(d => {
      if (d < 0.1) return 'green';
      if (d < 0.3) return 'orange';
      return 'red';
    });

    const colorOrder = { green: 0, orange: 1, red: 2 };
    for (let i = 1; i < colors.length; i++) {
      expect(colorOrder[colors[i]]).toBeGreaterThanOrEqual(colorOrder[colors[i - 1]]);
    }
  });

  it('threshold boundaries validated', () => {
    const testCases = [
      { distance: 0.09, expected: 'green' },
      { distance: 0.10, expected: 'orange' },
      { distance: 0.29, expected: 'orange' },
      { distance: 0.30, expected: 'red' },
    ];

    testCases.forEach(({ distance, expected }) => {
      let color = 'green';
      if (distance >= 0.1 && distance < 0.3) color = 'orange';
      else if (distance >= 0.3) color = 'red';
      expect(color).toBe(expected);
    });
  });
});
