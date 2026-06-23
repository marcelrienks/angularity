/**
 * tests/unit/localstorage-io.test.js
 * Unit tests for localstorage-io.js - localStorage persistence layer
 * Phase 3.5: localStorage Tests (T065-T071)
 */

import { 
  loadFullGridState, 
  loadWheelFromStorage, 
  loadWheelToeFromStorage
} from '../../js/localstorage-io.js';
import { WHEELS } from '../../js/constants.js';

describe('localstorage-io.js', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('localStorage persistence', () => {
    test('loadFullGridState should return object for all wheels', () => {
      const state = loadFullGridState();
      
      expect(state).toBeInstanceOf(Object);
      WHEELS.forEach(wheel => {
        expect(state).toHaveProperty(wheel);
      });
    });

    test('loadWheelFromStorage returns null when not stored', () => {
      const state = loadWheelFromStorage('FL');
      expect(state).toBeNull();
    });

    test('loadWheelToeFromStorage returns null when not stored', () => {
      const toe = loadWheelToeFromStorage('FL');
      expect(toe).toBeNull();
    });

    test('loadWheelToeFromStorage returns null for invalid data', () => {
      localStorage.setItem('mx5-nc1-alignment-toe-FL', 'invalid');
      const toe = loadWheelToeFromStorage('FL');
      expect(toe).toBeNull();
    });

    test('loadFullGridState returns all 4 wheels', () => {
      const state = loadFullGridState();
      
      expect(Object.keys(state)).toContain('FL');
      expect(Object.keys(state)).toContain('FR');
      expect(Object.keys(state)).toContain('RL');
      expect(Object.keys(state)).toContain('RR');
    });

    test('loadWheelFromStorage handles invalid JSON gracefully', () => {
      localStorage.setItem('mx5-nc1-alignment-FL', '{invalid-json');
      const state = loadWheelFromStorage('FL');
      
      expect(state).toBeNull();
    });

    test('loadWheelToeFromStorage is accessible for all wheels', () => {
      const toeFL = loadWheelToeFromStorage('FL');
      const toeFR = loadWheelToeFromStorage('FR');
      
      expect(toeFL === null || typeof toeFL === 'number').toBe(true);
      expect(toeFR === null || typeof toeFR === 'number').toBe(true);
    });

    test('loadFullGridState returns same structure on repeated calls', () => {
      const state1 = loadFullGridState();
      const state2 = loadFullGridState();
      
      expect(Object.keys(state1).sort()).toEqual(Object.keys(state2).sort());
      WHEELS.forEach(wheel => {
        expect(state1[wheel]).toEqual(state2[wheel]);
      });
    });

    test('Invalid JSON in localStorage returns null gracefully', () => {
      localStorage.setItem('mx5-nc1-alignment-FL', 'invalid-json-{');
      const state = loadWheelFromStorage('FL');
      
      expect(state).toBeNull();
    });
  });
});
