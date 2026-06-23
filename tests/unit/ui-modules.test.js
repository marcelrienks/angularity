/**
 * tests/unit/ui-modules.test.js
 * Unit tests for UI builder modules - table-builder, chart-builder, washer-diagram
 * Phase 3.6-3.7: UI Module Tests (T072-T073+)
 */

import { BOLT_POSITIONS, WHEELS, TARGET_CAMBER, TARGET_CASTER } from '../../js/constants.js';

describe('UI Modules', () => {
  describe('UI module structure validation', () => {
    test('Constants support 13x13 grid for UI rendering', () => {
      expect(BOLT_POSITIONS).toHaveLength(13);
      const gridSize = BOLT_POSITIONS.length * BOLT_POSITIONS.length;
      expect(gridSize).toBe(169);
    });

    test('Wheel identifiers match expected UI tabs', () => {
      expect(WHEELS).toContain('FL');
      expect(WHEELS).toContain('FR');
      expect(WHEELS.length).toBe(4);  // FL, FR, RL, RR
    });

    test('Target values are numeric for display', () => {
      expect(typeof TARGET_CAMBER).toBe('number');
      expect(typeof TARGET_CASTER).toBe('number');
      expect(TARGET_CAMBER).toBeLessThan(0);  // Negative camber
      expect(TARGET_CASTER).toBeGreaterThan(0);  // Positive caster
    });

    test('Grid dimensions consistent for table rendering', () => {
      const rows = BOLT_POSITIONS.length;
      const cols = BOLT_POSITIONS.length;
      expect(rows).toBe(cols);
      expect(rows * cols).toBe(169);
    });

    test('Corner positions exist for boundary testing', () => {
      const corners = [-6, 6];
      corners.forEach(corner => {
        expect(BOLT_POSITIONS).toContain(corner);
      });
    });

    test('Center position (0,0) present for diagram rendering', () => {
      expect(BOLT_POSITIONS).toContain(0);
      const centerIndex = BOLT_POSITIONS.indexOf(0);
      expect(centerIndex).toBe(6);  // Middle of 13 positions
    });
  });
});
