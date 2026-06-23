/**
 * tests/unit/constants.test.js
 *
 * Validation tests for js/constants.js
 * Ensures configuration values are correct and consistent
 */

import {
  BOLT_POSITIONS,
  TARGET_CAMBER,
  TARGET_CASTER,
  TARGET_STEERING_RATIO,
  CASTER_MULTIPLIER,
  CAMBER_GREEN_THRESHOLD,
  CAMBER_ORANGE_THRESHOLD,
  CASTER_GREEN_THRESHOLD,
  CASTER_ORANGE_THRESHOLD,
  TOE_TOLERANCE,
  COLOURS,
} from '../../js/constants.js';

describe('constants.js', () => {
  describe('Bolt position configuration', () => {
    it('defines 13 bolt positions', () => {
      expect(BOLT_POSITIONS.length).toBe(13);
    });

    it('positions range from -6 to +6', () => {
      expect(BOLT_POSITIONS[0]).toBe(-6);
      expect(BOLT_POSITIONS[6]).toBe(0);
      expect(BOLT_POSITIONS[12]).toBe(6);
    });
  });

  describe('Target values', () => {
    it('defines target camber as -1.1 degrees', () => {
      expect(TARGET_CAMBER).toBe(-1.1);
    });

    it('defines target caster as 5.0 degrees', () => {
      expect(TARGET_CASTER).toBe(5.0);
    });

    it('defines caster multiplier', () => {
      const expected = 1 / (2 * Math.sin((360 / TARGET_STEERING_RATIO) * (Math.PI / 180)));
      expect(CASTER_MULTIPLIER).toBeCloseTo(expected, 12);
      expect(typeof CASTER_MULTIPLIER).toBe('number');
    });
  });

  describe('Color tier thresholds', () => {
    it('defines camber thresholds', () => {
      expect(CAMBER_GREEN_THRESHOLD).toBe(0.15);
      expect(CAMBER_ORANGE_THRESHOLD).toBe(0.40);
    });

    it('defines caster thresholds', () => {
      expect(CASTER_GREEN_THRESHOLD).toBe(0.25);
      expect(CASTER_ORANGE_THRESHOLD).toBe(0.60);
    });

    it('thresholds have correct ordering', () => {
      expect(CAMBER_GREEN_THRESHOLD).toBeLessThan(CAMBER_ORANGE_THRESHOLD);
      expect(CASTER_GREEN_THRESHOLD).toBeLessThan(CASTER_ORANGE_THRESHOLD);
    });
  });

  describe('Symmetry tolerances', () => {
    it('defines toe tolerance', () => {
      expect(TOE_TOLERANCE).toBeDefined();
      expect(typeof TOE_TOLERANCE).toBe('number');
      expect(TOE_TOLERANCE).toBeGreaterThan(0);
    });
  });

  describe('Color definitions', () => {
    it('defines color palette', () => {
      expect(COLOURS).toBeDefined();
      expect(COLOURS).toHaveProperty('green');
      expect(COLOURS).toHaveProperty('orange');
      expect(COLOURS).toHaveProperty('red');
      expect(COLOURS).toHaveProperty('blue');
      expect(COLOURS).toHaveProperty('purple');
    });

    it('colors are valid hex/rgb values', () => {
      Object.values(COLOURS).forEach((color) => {
        expect(typeof color).toBe('string');
        expect(color).toMatch(/^#[0-9a-f]{6}$|^rgb|^hsl/i);
      });
    });
  });

  describe('Value consistency', () => {
    it('all numeric values are finite numbers', () => {
      expect(isFinite(TARGET_CAMBER)).toBe(true);
      expect(isFinite(TARGET_CASTER)).toBe(true);
      expect(isFinite(CASTER_MULTIPLIER)).toBe(true);
      expect(isFinite(CAMBER_GREEN_THRESHOLD)).toBe(true);
    });

    it('thresholds are positive values', () => {
      expect(CAMBER_GREEN_THRESHOLD).toBeGreaterThan(0);
      expect(CAMBER_ORANGE_THRESHOLD).toBeGreaterThan(0);
      expect(CASTER_GREEN_THRESHOLD).toBeGreaterThan(0);
      expect(CASTER_ORANGE_THRESHOLD).toBeGreaterThan(0);
    });
  });
});
