/**
 * tests/unit/math-utils.test.js
 * 
 * Unit tests for math-utils.js module
 * Tests utility functions: calculateCaster, calculateDeltas, getColorThreshold, formatAngle, formatMillimeters
 * 
 * Phase 3.3: Math Utils Tests (T051-T058)
 * Target: ≥12 test cases, ≥80% line coverage, ≥85% branch coverage
 */

import { 
  calculateCaster, 
  calculateCasterMultiplier,
  calculateEffectiveWheelAngle,
  calculateDeltas, 
  getColorThreshold, 
  formatAngle, 
  formatMillimeters,
  DEFAULT_STEERING_RATIO
} from '../../js/math-utils.js';

describe('math-utils.js', () => {
  
  // ─────────────────────────────────────────────────────────────
  // T051: calculateCaster formula
  // ─────────────────────────────────────────────────────────────
  describe('calculateCaster()', () => {
    test('T051.1: Should calculate caster as dynamic multiplier × |camberCW - camberACW|', () => {
      const camberNeg20 = -0.8;
      const camberPos20 = -1.2;
      const sweep = Math.abs(camberPos20 - camberNeg20);  // 0.4°
      const expectedCaster = calculateCasterMultiplier(DEFAULT_STEERING_RATIO) * sweep;
      
      const result = calculateCaster(camberNeg20, camberPos20);
      
      expect(result).toBeCloseTo(expectedCaster, 4);
    });

    test('T051.2: Should work with various camber sweeps', () => {
      const testCases = [
        { neg20: -1.0, pos20: -1.0, expectedSweep: 0 },
        { neg20: -0.5, pos20: -1.5, expectedSweep: 1.0 },
        { neg20: 0.0, pos20: -1.0, expectedSweep: 1.0 },
        { neg20: -0.9, pos20: -1.1, expectedSweep: 0.2 },
      ];
      
      testCases.forEach(tc => {
        const result = calculateCaster(tc.neg20, tc.pos20);
        const expected = calculateCasterMultiplier(DEFAULT_STEERING_RATIO) * tc.expectedSweep;
        expect(result).toBeCloseTo(expected, 4);
      });
    });

    test('T051.3: 15:1 steering ratio produces 24° effective wheel angle', () => {
      expect(calculateEffectiveWheelAngle(15)).toBeCloseTo(24, 8);
    });

    test('T051.4: Rear wheel caster calculation uses same formula as front', () => {
      const camberFL_neg20 = -0.8;
      const camberFL_pos20 = -1.2;
      const casterFL = calculateCaster(camberFL_neg20, camberFL_pos20, { steeringRatio: 15 });

      const camberRL_acw = -1.5;
      const camberRL_cw = -2.0;
      const casterRL = calculateCaster(camberRL_acw, camberRL_cw, { steeringRatio: 15 });

      // Same formula applied. FL sweep: 0.4°, RL sweep: 0.5°. Caster ratio should match.
      const sweepFL = Math.abs(camberFL_pos20 - camberFL_neg20);
      const sweepRL = Math.abs(camberRL_cw - camberRL_acw);

      expect(casterRL / casterFL).toBeCloseTo(sweepRL / sweepFL, 5);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // T052: calculateDeltas returns object (CRITICAL!)
  // ─────────────────────────────────────────────────────────────
  describe('calculateDeltas()', () => {
    test('T052.1: Should return object with delta and absDelta (not single number)', () => {
      const value = -1.1;
      const target = -1.0;
      
      const result = calculateDeltas(value, target);
      
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('delta');
      expect(result).toHaveProperty('absDelta');
    });

    test('T052.2: delta should be signed difference (value - target)', () => {
      const testCases = [
        { value: -1.1, target: -1.0, expectedDelta: -0.1 },
        { value: -0.9, target: -1.0, expectedDelta: 0.1 },
        { value: 5.5, target: 5.0, expectedDelta: 0.5 },
        { value: 0, target: 1, expectedDelta: -1 },
      ];
      
      testCases.forEach(tc => {
        const result = calculateDeltas(tc.value, tc.target);
        expect(result.delta).toBeCloseTo(tc.expectedDelta, 5);
      });
    });

    test('T052.3: absDelta should be absolute value of delta', () => {
      const testCases = [
        { value: -1.1, target: -1.0, expectedAbsDelta: 0.1 },
        { value: -0.9, target: -1.0, expectedAbsDelta: 0.1 },
        { value: 5.5, target: 5.0, expectedAbsDelta: 0.5 },
        { value: -3, target: 2, expectedAbsDelta: 5 },
      ];
      
      testCases.forEach(tc => {
        const result = calculateDeltas(tc.value, tc.target);
        expect(result.absDelta).toBeCloseTo(tc.expectedAbsDelta, 5);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // T053: getColorThreshold boundary values (integration tests tier logic)
  // ─────────────────────────────────────────────────────────────
  describe('getColorThreshold() - boundary values', () => {
    test('T053.4: Camber boundary 0.15° (green threshold)', () => {
      expect(getColorThreshold(0.15, 'camber')).toBe('target-met');
      expect(getColorThreshold(0.151, 'camber')).toBe('near-target');
    });

    test('T053.5: Camber boundary 0.40° (orange/red boundary)', () => {
      expect(getColorThreshold(0.40, 'camber')).toBe('near-target');
      expect(getColorThreshold(0.401, 'camber')).toBe('off-target');
    });

    test('T053.6: Caster boundary 0.25° (green threshold)', () => {
      expect(getColorThreshold(0.25, 'caster')).toBe('target-met');
      expect(getColorThreshold(0.251, 'caster')).toBe('near-target');
    });

    test('T053.7: Caster boundary 0.60° (orange/red boundary)', () => {
      expect(getColorThreshold(0.60, 'caster')).toBe('near-target');
      expect(getColorThreshold(0.601, 'caster')).toBe('off-target');
    });

    test('T053.8: Toe boundary 0.10° (green threshold)', () => {
      expect(getColorThreshold(0.10, 'toe')).toBe('target-met');
      expect(getColorThreshold(0.101, 'toe')).toBe('near-target');
    });

    test('T053.9: Toe boundary 0.20° (orange/red boundary)', () => {
      expect(getColorThreshold(0.20, 'toe')).toBe('near-target');
      expect(getColorThreshold(0.201, 'toe')).toBe('off-target');
    });
  });


  // ─────────────────────────────────────────────────────────────
  // T057: formatAngle with degree symbol
  // ─────────────────────────────────────────────────────────────
  describe('formatAngle()', () => {
    test('T057.1: Should include degree symbol', () => {
      const result = formatAngle(2.456, 2);
      expect(result).toContain('°');
    });

    test('T057.2: Should format with specified precision', () => {
      const testCases = [
        { value: 2.456, precision: 2, expected: '2.46°' },
        { value: 1.234, precision: 2, expected: '1.23°' },
        { value: -1.1, precision: 2, expected: '-1.10°' },
        { value: 5.555, precision: 1, expected: '5.6°' },
      ];
      
      testCases.forEach(tc => {
        const result = formatAngle(tc.value, tc.precision);
        expect(result).toBe(tc.expected);
      });
    });

    test('T057.3: Default precision should be 2 decimal places', () => {
      const result = formatAngle(1.234);
      expect(result).toBe('1.23°');
    });

    test('T057.4: Should work with negative angles', () => {
      const result = formatAngle(-1.1);
      expect(result).toBe('-1.10°');
    });

    test('T057.5: Should work with zero', () => {
      const result = formatAngle(0);
      expect(result).toBe('0.00°');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // T058: formatMillimeters with mm suffix
  // ─────────────────────────────────────────────────────────────
  describe('formatMillimeters()', () => {
    test('T058.1: Should include mm suffix', () => {
      const result = formatMillimeters(0.375, 2);
      expect(result).toContain('mm');
    });

    test('T058.2: Should format with specified precision', () => {
      const testCases = [
        { value: 0.375, precision: 2, expected: '0.38 mm' },
        { value: 1.234, precision: 2, expected: '1.23 mm' },
        { value: 0.58, precision: 2, expected: '0.58 mm' },
        { value: 2.555, precision: 1, expected: '2.6 mm' },
      ];
      
      testCases.forEach(tc => {
        const result = formatMillimeters(tc.value, tc.precision);
        expect(result).toBe(tc.expected);
      });
    });

    test('T058.3: Default precision should be 2 decimal places', () => {
      const result = formatMillimeters(1.234);
      expect(result).toBe('1.23 mm');
    });

    test('T058.4: Should work with negative values', () => {
      const result = formatMillimeters(-0.5);
      expect(result).toBe('-0.50 mm');
    });

    test('T058.5: Should work with zero', () => {
      const result = formatMillimeters(0);
      expect(result).toBe('0.00 mm');
    });

    test('T058.6: Should use correct spacing (" mm", not "mm")', () => {
      const result = formatMillimeters(1.0);
      expect(result).toMatch(/ mm$/);
      expect(result).not.toMatch(/^.*\d+mm$/);  // Should not match "1.00mm"
      expect(result).toContain(' mm');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Integration tests
  // ─────────────────────────────────────────────────────────────
  describe('Integration: Complete calculation pipeline', () => {
    test('T059.1: Calculate caster, then compute deltas, then determine color', () => {
      const camberNeg20 = -0.8;
      const camberPos20 = -1.2;
      const targetCaster = 5.0;
      
      // Step 1: Calculate caster
      const caster = calculateCaster(camberNeg20, camberPos20);
      expect(caster).toBeGreaterThan(0);
      
      // Step 2: Calculate delta from target
      const deltas = calculateDeltas(caster, targetCaster);
      expect(deltas.delta).toBeDefined();
      expect(deltas.absDelta).toBeDefined();
      
      // Step 3: Determine color tier
      const color = getColorThreshold(deltas.absDelta, 'caster');
      expect(['target-met', 'near-target', 'off-target']).toContain(color);
    });

    test('T059.2: Format angle and millimeters in report', () => {
      const camber = -1.1;
      const toe = 0.58;
      
      const camberFormatted = formatAngle(camber, 2);
      const toeFormatted = formatMillimeters(toe, 2);
      
      expect(camberFormatted).toBe('-1.10°');
      expect(toeFormatted).toBe('0.58 mm');
      expect(camberFormatted).toContain('°');
      expect(toeFormatted).toContain('mm');
    });
  });
});
