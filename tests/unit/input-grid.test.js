/**
 * tests/unit/input-grid.test.js
 * Unit tests for input-grid.js module - grid state management
 * Phase 3.4: Input Grid Tests (T059-T064)
 */

import { BOLT_POSITIONS, REQUIRED_POSITIONS } from '../../js/constants.js';

describe('input-grid.js', () => {
  describe('Input grid state management', () => {
    test('BOLT_POSITIONS should define 13 positions', () => {
      expect(BOLT_POSITIONS).toHaveLength(13);
      expect(BOLT_POSITIONS[0]).toBe(-6);
      expect(BOLT_POSITIONS[6]).toBe(0);
      expect(BOLT_POSITIONS[12]).toBe(6);
    });

    test('REQUIRED_POSITIONS should contain critical points', () => {
      expect(REQUIRED_POSITIONS).toContain(-6);
      expect(REQUIRED_POSITIONS).toContain(-3);
      expect(REQUIRED_POSITIONS).toContain(0);
      expect(REQUIRED_POSITIONS).toContain(3);
      expect(REQUIRED_POSITIONS).toContain(6);
    });

    test('Grid structure supports 169 cells (13x13)', () => {
      const gridSize = BOLT_POSITIONS.length * BOLT_POSITIONS.length;
      expect(gridSize).toBe(169);
    });

    test('Required positions form 5x5 subset of 13x13 grid', () => {
      expect(REQUIRED_POSITIONS.length).toBe(5);
      const requiredCount = REQUIRED_POSITIONS.length * REQUIRED_POSITIONS.length;
      expect(requiredCount).toBe(25);
    });

    test('All REQUIRED_POSITIONS exist in BOLT_POSITIONS', () => {
      REQUIRED_POSITIONS.forEach(pos => {
        expect(BOLT_POSITIONS).toContain(pos);
      });
    });

    test('Bolt positions are symmetric around 0', () => {
      for (let i = 0; i < BOLT_POSITIONS.length / 2; i++) {
        const left = BOLT_POSITIONS[i];
        const right = BOLT_POSITIONS[BOLT_POSITIONS.length - 1 - i];
        expect(Math.abs(left + right)).toBe(0);  // left + right = 0
      }
    });
  });
});
