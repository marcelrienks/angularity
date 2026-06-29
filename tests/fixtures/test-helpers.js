import fs from 'fs';
import path from 'path';

/**
 * Generate a grid state for testing
 * @param {number} gridSize - 5, 7, or 13
 * @param {*} fillWith - Value to populate cells with (or undefined for empty)
 * @returns {Object} Grid state object
 */
export function generateGridState(gridSize = 13, fillWith = null) {
  const positions = [];
  for (let i = -Math.floor(gridSize / 2); i <= Math.floor(gridSize / 2); i++) {
    positions.push(i);
  }

  const grid = {};
  positions.forEach(front => {
    grid[front] = {};
    positions.forEach(rear => {
      grid[front][rear] = fillWith !== null ? fillWith : {
        measured: false,
        isInterpolated: true,
        angle360ACW: null,
        angle0: null,
        angle360CW: null,
      };
    });
  });

  return grid;
}

/**
 * Calculate expected value for a position
 * @param {Object} cell - Cell with angle360ACW, angle0, angle360CW
 * @returns {Object} { camber, caster }
 */
export function calculateExpectedValue(cell) {
  const { angle360ACW = 0, angle0 = 0, angle360CW = 0 } = cell;
  const camber = (angle360ACW + angle0 + angle360CW) / 3;
  const caster = (angle360CW - angle360ACW) / 2;

  return {
    camber: Math.round(camber * 100) / 100,
    caster: Math.round(caster * 100) / 100,
  };
}

/**
 * Load fixture file
 * @param {string} filename - Fixture filename (e.g., 'alignment-export-v1.json')
 * @returns {Object} Parsed fixture
 */
export function loadFixtureFile(filename) {
  const fixturePath = path.join(process.cwd(), 'tests/fixtures/exports', filename);
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Compare two grids
 * @param {Object} actual - Actual grid
 * @param {Object} expected - Expected grid
 * @param {number} tolerance - Tolerance for numeric comparisons
 * @returns {Object} { match: boolean, differences: [] }
 */
export function compareGrids(actual, expected, tolerance = 0.01) {
  const differences = [];

  for (const front in expected) {
    for (const rear in expected[front]) {
      const expCell = expected[front][rear];
      const actCell = actual[front]?.[rear];

      if (!actCell) {
        differences.push({ position: `${front},${rear}`, reason: 'Cell missing' });
        continue;
      }

      // Compare numeric fields with tolerance
      ['angle360ACW', 'angle0', 'angle360CW'].forEach(field => {
        if (typeof expCell[field] === 'number' && typeof actCell[field] === 'number') {
          if (Math.abs(expCell[field] - actCell[field]) > tolerance) {
            differences.push({
              position: `${front},${rear}`,
              field,
              expected: expCell[field],
              actual: actCell[field],
            });
          }
        }
      });

      // Compare boolean/string fields exactly
      if (expCell.measured !== actCell.measured) {
        differences.push({
          position: `${front},${rear}`,
          field: 'measured',
          expected: expCell.measured,
          actual: actCell.measured,
        });
      }
    }
  }

  return {
    match: differences.length === 0,
    differences,
  };
}

/**
 * Extract values from UI using Puppeteer
 * @param {Page} page - Puppeteer page
 * @param {string} selector - CSS selector
 * @returns {Promise<Array>} Array of extracted values
 */
export async function extractUIValues(page, selector) {
  return page.$$eval(selector, elements =>
    elements.map(el => ({
      text: el.textContent.trim(),
      value: el.value,
      id: el.id,
      class: el.className,
    }))
  );
}

/**
 * Assert value with tolerance
 * @param {number} actual - Actual value
 * @param {number} expected - Expected value
 * @param {number} tolerance - Tolerance
 * @throws {Error} If values don't match within tolerance
 */
export function expectValueWithTolerance(actual, expected, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(
      `Expected ${expected} but got ${actual} (diff: ${diff}, tolerance: ${tolerance})`
    );
  }
}

/**
 * Assert symmetry
 * @param {number} valueA - First value
 * @param {number} valueB - Second value
 * @param {number} tolerance - Tolerance
 * @throws {Error} If values not equal within tolerance
 */
export function expectSymmetry(valueA, valueB, tolerance = 0.01) {
  if (Math.abs(valueA - valueB) > tolerance) {
    throw new Error(`Values not symmetric: ${valueA} vs ${valueB} (tolerance: ${tolerance})`);
  }
}

/**
 * Assert monotonicity across array
 * @param {Array<number>} values - Values in order
 * @param {boolean} increasing - Whether values should increase
 * @throws {Error} If monotonicity violated
 */
export function expectMonotonicity(values, increasing = true) {
  for (let i = 1; i < values.length; i++) {
    const isCorrect = increasing ? values[i] >= values[i - 1] : values[i] <= values[i - 1];
    if (!isCorrect) {
      throw new Error(
        `Monotonicity violated at index ${i}: ${values[i - 1]} → ${values[i]}`
      );
    }
  }
}

export default {
  generateGridState,
  calculateExpectedValue,
  loadFixtureFile,
  compareGrids,
  extractUIValues,
  expectValueWithTolerance,
  expectSymmetry,
  expectMonotonicity,
};
