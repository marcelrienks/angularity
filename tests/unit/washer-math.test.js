/**
 * tests/unit/washer-math.test.js
 *
 * Unit tests for js/washer-math.js
 * Tests: rotation angle calculations, marker coordinate calculations
 */

import {
  calculateRotationAngle,
  calculateMarkerCoordinates,
  validateBoltPosition,
  getAllBoltPositions,
  generateWasherMarkers,
} from '../../js/washer-math.js';
import { washerAngles, markerCoordinates, positionDifferencePattern } from '../fixtures/index.js';

describe('washer-math.js', () => {
  describe('calculateRotationAngle()', () => {
    it('returns correct angle for position 0 (6 o-clock)', () => {
      const angle = calculateRotationAngle(0);
      expect(angle).toBe(90);
    });

    it('returns correct angle for position +6 (3 o-clock)', () => {
      const angle = calculateRotationAngle(6);
      expect(angle).toBe(0);
    });

    it('returns correct angle for position -6 (9 o-clock)', () => {
      const angle = calculateRotationAngle(-6);
      expect(angle).toBe(180);
    });

    it('calculates all positions from fixture', () => {
      Object.values(washerAngles).forEach((sample) => {
        const result = calculateRotationAngle(sample.boltPosition);
        expect(result).toBe(sample.expectedAngle);
      });
    });

    it('all positions differ by 15 degrees', () => {
      positionDifferencePattern.testCases.forEach((testCase) => {
        const angle1 = calculateRotationAngle(testCase.from);
        const angle2 = calculateRotationAngle(testCase.to);

        // Handle wraparound at 360°
        let delta = Math.abs(angle2 - angle1);
        if (delta > 180) {
          delta = 360 - delta;
        }

        expect(delta).toBeCloseTo(testCase.expectedDelta, 1);
      });
    });

    it('handles boundary positions (-6, 0, +6)', () => {
      expect(() => calculateRotationAngle(-6)).not.toThrow();
      expect(() => calculateRotationAngle(0)).not.toThrow();
      expect(() => calculateRotationAngle(6)).not.toThrow();
    });

    it('throws on invalid positions', () => {
      expect(() => calculateRotationAngle(-7)).toThrow();
      expect(() => calculateRotationAngle(7)).toThrow();
      expect(() => calculateRotationAngle(0.5)).toThrow(); // Non-integer
      expect(() => calculateRotationAngle(NaN)).toThrow();
    });

    it('produces angles in valid 0-360 range', () => {
      for (let pos = -6; pos <= 6; pos++) {
        const angle = calculateRotationAngle(pos);
        expect(angle).toBeGreaterThanOrEqual(0);
        expect(angle).toBeLessThanOrEqual(360);
      }
    });
  });

  describe('calculateMarkerCoordinates()', () => {
    it('returns correct coordinates for position 0 (6 o-clock, bottom)', () => {
      const coords = calculateMarkerCoordinates(0, 50, 50, 50);
      expect(coords.x).toBeCloseTo(50, 1); // Center x
      expect(coords.y).toBeCloseTo(100, 1); // Bottom (center + radius)
    });

    it('returns correct coordinates for position +6 (3 o-clock, right)', () => {
      const coords = calculateMarkerCoordinates(6, 50, 50, 50);
      expect(coords.x).toBeCloseTo(100, 1); // Right (center + radius)
      expect(coords.y).toBeCloseTo(50, 1); // Center y
    });

    it('returns correct coordinates for position -6 (9 o-clock, left)', () => {
      const coords = calculateMarkerCoordinates(-6, 50, 50, 50);
      expect(coords.x).toBeCloseTo(0, 1); // Left (center - radius)
      expect(coords.y).toBeCloseTo(50, 1); // Center y
    });

    it('calculates coordinates for all positions from fixture', () => {
      const sampleCoords = markerCoordinates.radius50;

      Object.entries(sampleCoords).forEach(([key, sample]) => {
        if (sample.boltPosition !== undefined) {
          const result = calculateMarkerCoordinates(
            sample.boltPosition,
            sampleCoords.radius,
            sampleCoords.center.x,
            sampleCoords.center.y
          );

          expect(result.x).toBeCloseTo(sample.x, 0); // Allow ±1 px tolerance
          expect(result.y).toBeCloseTo(sample.y, 0);
        }
      });
    });

    it('handles alternative radius (100)', () => {
      const coords = calculateMarkerCoordinates(0, 100, 50, 50);
      expect(coords.x).toBeCloseTo(50, 1); // Center
      expect(coords.y).toBeCloseTo(150, 1); // Bottom (center + 100)
    });

    it('maintains circular pattern (all equidistant from center)', () => {
      const radius = 50;
      const centerX = 50;
      const centerY = 50;

      for (let pos = -6; pos <= 6; pos++) {
        const coords = calculateMarkerCoordinates(pos, radius, centerX, centerY);
        const distance = Math.sqrt(
          Math.pow(coords.x - centerX, 2) + Math.pow(coords.y - centerY, 2)
        );

        expect(distance).toBeCloseTo(radius, 0); // ±1 tolerance for rounding
      }
    });

    it('handles non-standard canvas sizes', () => {
      const coords = calculateMarkerCoordinates(0, 100, 100, 100);
      expect(coords.x).toBe(100); // Center
      expect(coords.y).toBe(200); // Center + radius
    });

    it('throws on invalid bolt position', () => {
      expect(() => {
        calculateMarkerCoordinates(-7, 50, 50, 50);
      }).toThrow();
    });
  });

  describe('validateBoltPosition()', () => {
    it('validates correct positions', () => {
      for (let pos = -6; pos <= 6; pos++) {
        expect(validateBoltPosition(pos)).toBe(true);
      }
    });

    it('rejects out-of-range positions', () => {
      expect(() => validateBoltPosition(-7)).toThrow();
      expect(() => validateBoltPosition(7)).toThrow();
    });

    it('rejects non-integer positions', () => {
      expect(() => validateBoltPosition(0.5)).toThrow();
      expect(() => validateBoltPosition('0')).toThrow();
    });

    it('rejects null and undefined', () => {
      expect(() => validateBoltPosition(null)).toThrow();
      expect(() => validateBoltPosition(undefined)).toThrow();
    });
  });

  describe('getAllBoltPositions()', () => {
    it('returns array of 13 positions', () => {
      const positions = getAllBoltPositions();
      expect(positions.length).toBe(13);
    });

    it('returns positions from -6 to +6', () => {
      const positions = getAllBoltPositions();
      expect(positions[0]).toBe(-6);
      expect(positions[6]).toBe(0);
      expect(positions[12]).toBe(6);
    });

    it('positions are in ascending order', () => {
      const positions = getAllBoltPositions();
      for (let i = 0; i < positions.length - 1; i++) {
        expect(positions[i + 1]).toBe(positions[i] + 1);
      }
    });
  });

  describe('generateWasherMarkers()', () => {
    it('generates 13 markers (one per position)', () => {
      const markers = generateWasherMarkers();
      expect(markers.length).toBe(13);
    });

    it('each marker has all required properties', () => {
      const markers = generateWasherMarkers();
      markers.forEach((marker) => {
        expect(marker).toHaveProperty('position');
        expect(marker).toHaveProperty('angle');
        expect(marker).toHaveProperty('x');
        expect(marker).toHaveProperty('y');
      });
    });

    it('markers cover all positions -6 to +6', () => {
      const markers = generateWasherMarkers();
      const positions = markers.map((m) => m.position);

      expect(positions).toEqual(expect.arrayContaining([-6, -3, 0, 3, 6]));
      expect(positions.length).toBe(13);
    });

    it('markers have valid angles', () => {
      const markers = generateWasherMarkers();
      markers.forEach((marker) => {
        expect(marker.angle).toBeGreaterThanOrEqual(0);
        expect(marker.angle).toBeLessThanOrEqual(360);
      });
    });

    it('markers form valid circle with default parameters', () => {
      const markers = generateWasherMarkers();
      const radius = 50;
      const centerX = 50;
      const centerY = 50;

      markers.forEach((marker) => {
        const distance = Math.sqrt(
          Math.pow(marker.x - centerX, 2) + Math.pow(marker.y - centerY, 2)
        );
        expect(distance).toBeCloseTo(radius, 0);
      });
    });

    it('handles custom radius and center', () => {
      const markers = generateWasherMarkers(100, 100, 100);

      // Position 0 should be at bottom
      const pos0 = markers.find((m) => m.position === 0);
      expect(pos0.x).toBeCloseTo(100, 0); // Center
      expect(pos0.y).toBeCloseTo(200, 0); // Center + radius
    });
  });

  describe('Error handling', () => {
    it('handles edge case: position exactly at boundaries', () => {
      expect(calculateRotationAngle(-6)).toBe(180);
      expect(calculateRotationAngle(6)).toBe(0);
    });

    it('consistent results for repeated calls', () => {
      const angle1 = calculateRotationAngle(3);
      const angle2 = calculateRotationAngle(3);
      expect(angle1).toBe(angle2);
    });

    it('coordinate calculations are deterministic', () => {
      const coord1 = calculateMarkerCoordinates(0, 50, 50, 50);
      const coord2 = calculateMarkerCoordinates(0, 50, 50, 50);
      expect(coord1.x).toBe(coord2.x);
      expect(coord1.y).toBe(coord2.y);
    });
  });
});
