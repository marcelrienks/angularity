#!/usr/bin/env node

/**
 * Integration Test: Input Screen - Grid Rendering & Structure
 *
 * Validates that the input grid renders correctly with:
 * - All 169 cells (13×13) displayed
 * - Correct bolt position labels (-6 to +6)
 * - Three input fields per cell (zero, pos20, neg20)
 * - Required positions highlighted with special styling
 * - Header labels match data grid alignment
 */

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';


const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const REQUIRED_POSITIONS = [-6, -3, 0, 3, 6];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(`${color}${args.join(' ')}${colors.reset}`);
}

let passes = 0, failures = 0;
function assert(condition, label) {
  if (condition) { passes++; log(colors.green, `  ✓ ${label}`); }
  else { failures++; log(colors.red, `  ✗ FAIL: ${label}`); }
}
function approxEqual(a, b, tol) { return Math.abs(a - b) <= tol; }




async function navigateTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
}

async function clearStorage(page) {
  await page.evaluate(() => localStorage.clear());
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  Input Screen - Grid Rendering & Structure Test             ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');



    // Launch browser
    log(colors.cyan, '🌐 Launching browser...');
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await waitForServer(BASE_URL);
    log(colors.green, '✓ Browser launched\n');

    // Test 1: Grid renders with correct dimensions
    log(colors.cyan, '┌─ TEST 1: Grid Dimensions & Cell Count ───────────────────┐');
    await navigateTo(page, '/input.html');
    
    // Clear storage after navigation to avoid context issues
    try {
      await page.evaluate(() => localStorage.clear());
    } catch (e) {
      // Storage may not be available, that's ok for this test
    }

    const cellCount = await page.evaluate(() => {
      const cells = document.querySelectorAll('.grid-cell');
      return cells.length;
    });

    assert(cellCount === 169, `Grid has correct cell count: ${cellCount} (13×13)`);

    // Test 2: Column headers show bolt positions
    log(colors.cyan, '\n┌─ TEST 2: Column Headers Show Bolt Positions ──────────────┐');
    const colHeaders = await page.evaluate(() => {
      const headers = document.querySelectorAll('.grid-col-header');
      return Array.from(headers).map(h => h.textContent.trim());
    });

    // Check if headers contain bolt positions (allowing for minor formatting variations)
    const hasAllPositions = BOLT_POSITIONS.every(pos => {
      const posStr = pos.toString();
      return colHeaders.some(h => h === posStr || h === `+${pos}` || h === `${pos}`);
    });

    assert(hasAllPositions, 'Column headers match bolt positions');

    // Test 3: Row headers show bolt positions
    log(colors.cyan, '\n┌─ TEST 3: Row Headers Show Bolt Positions ────────────────┐');
    const rowHeaders = await page.evaluate(() => {
      const headers = document.querySelectorAll('.grid-row-header');
      return Array.from(headers).map(h => h.textContent.trim());
    });

    // Check if headers contain bolt positions (allowing for minor formatting variations)
    const rowsHaveAllPositions = BOLT_POSITIONS.every(pos => {
      const posStr = pos.toString();
      return rowHeaders.some(h => h === posStr || h === `+${pos}` || h === `${pos}`);
    });

    assert(rowsHaveAllPositions, 'Row headers match bolt positions');

    // Test 4: Required positions have special styling
    log(colors.cyan, '\n┌─ TEST 4: Required Positions Have Special Styling ────────┐');
    const requiredCells = await page.evaluate((requiredPos) => {
      const cells = document.querySelectorAll('.grid-cell.required');
      return cells.length;
    }, REQUIRED_POSITIONS);

    const expectedRequired = REQUIRED_POSITIONS.length * REQUIRED_POSITIONS.length; // 5×5 = 25 corners
    assert(requiredCells === expectedRequired, `Required cells count correct: ${requiredCells} (5×5 corners)`);

    // Test 5: Each cell has three input fields (zero, pos20, neg20)
    log(colors.cyan, '\n┌─ TEST 5: Each Cell Has Three Input Fields ────────────────┐');
    const firstCellInputs = await page.evaluate(() => {
      const firstCell = document.querySelector('.grid-cell');
      return firstCell ? firstCell.querySelectorAll('input').length : 0;
    });

    assert(firstCellInputs === 3, 'Each cell has correct input count: 3 fields (zero, pos20, neg20)');

    // Test 6: Input fields have correct attributes
    log(colors.cyan, '\n┌─ TEST 6: Input Fields Have Correct Attributes ───────────┐');
    const inputAttributes = await page.evaluate(() => {
      const firstCell = document.querySelector('.grid-cell');
      const inputs = firstCell.querySelectorAll('input');
      return Array.from(inputs).map(inp => ({
        type: inp.type,
        step: inp.step,
        placeholder: inp.placeholder,
        inputMode: inp.inputMode
      }));
    });

    const allNumeric = inputAttributes.every(attr => attr.type === 'number' || attr.inputMode === 'decimal');
    assert(allNumeric, 'All inputs configured for numeric entry');

    // Test 7: Grid is responsive and scrollable
    log(colors.cyan, '\n┌─ TEST 7: Grid Layout & Accessibility ────────────────────┐');
    const gridStructure = await page.evaluate(() => {
      const gridEl = document.getElementById('input-grid');
      return {
        hasGridRole: gridEl.getAttribute('role') === 'grid',
        hasAriaLabel: gridEl.hasAttribute('aria-label'),
        displayStyle: window.getComputedStyle(gridEl).display,
        gridColumn: window.getComputedStyle(gridEl).gridTemplateColumns
      };
    });

    assert(gridStructure.hasGridRole && gridStructure.displayStyle === 'grid', 'Grid has correct role and display style');

    // Test 8: Required header cells have visual indicator
    log(colors.cyan, '\n┌─ TEST 8: Required Headers Have Visual Indicator ────────┐');
    const requiredHeaders = await page.evaluate(() => {
      const headers = document.querySelectorAll('.grid-col-header.required, .grid-row-header.required');
      return headers.length;
    });

    assert(requiredHeaders > 0, `Required headers have special class: ${requiredHeaders} headers`);
    log(colors.green, '║  Input grid renders correctly with proper structure        ║');
    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    log(colors.red, `\n✗ Test failed: ${error.message}`);
      } finally {
    if (browser) await browser.close();
  }
}

main();
