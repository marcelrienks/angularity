#!/usr/bin/env node

/**
 * Integration Test: Input Clear → Report Empty Cycle
 *
 * Validates that when input data is cleared, the report page transitions
 * to the empty state (report empties) for both FL and FR wheels.
 *
 * Test Flow:
 * 1. Load input page, populate with data
 * 2. Load report page, verify data is displayed
 * 3. Clear input data
 * 4. Return to report page, verify it shows empty state
 * 5. Repeat for both FL and FR wheels
 */

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';


const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

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

async function setWheelData(page, wheel, data) {
  await page.evaluate((wheelId, wheelData) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    localStorage.setItem(key, JSON.stringify(wheelData));
  }, wheel, data);
}

async function getWheelData(page, wheel) {
  return await page.evaluate((wheelId) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }, wheel);
}

async function clearWheelData(page, wheel) {
  await page.evaluate((wheelId) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    localStorage.removeItem(key);
  }, wheel);
}

async function clearAllStorage(page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

async function navigateTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function hasDataInReport(page) {
  // Check if the report shows data (table visible) vs empty state
  return await page.evaluate(() => {
    const table = document.querySelector('table.data-table');
    const noDataMsg = document.querySelector('#no-data-msg');
    
    return {
      tableExists: table !== null,
      tableVisible: table ? window.getComputedStyle(table.parentElement).display !== 'none' : false,
      noDataMsgVisible: noDataMsg ? window.getComputedStyle(noDataMsg).display !== 'none' : false,
      noDataMsgText: noDataMsg ? noDataMsg.textContent : ''
    };
  });
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  MX5 NC1 Alignment - Input Clear → Report Empty Test       ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    await waitForServer(BASE_URL);

    // Launch browser
    log(colors.cyan, '🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    log(colors.green, '✓ Browser launched\n');

    const page = await browser.newPage();
    await page.setDefaultTimeout(10000);

    // Test data for both wheels
    const testData = {
      FL: {
        0: {
          0: { zero: '-1.05', pos20: '-3.25', neg20: '0.08' }
        }
      },
      FR: {
        0: {
          0: { zero: '-1.42', pos20: '-4.10', neg20: '0.08' }
        }
      }
    };

    log(colors.yellow, '📊 Test Wheels: FL, FR');

    // ═══════════════════════════════════════════════════════════════════════
    // Test 1: FL Wheel - Load, Display, Clear, Empty
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ TEST 1: FL Wheel - Clear/Empty Cycle ────────────────────┐');

    // STEP 1.1: Navigate to input and populate FL data
    log(colors.cyan, '\n  Step 1.1: Populate input with FL data');
    await navigateTo(page, '/input.html');
    await clearAllStorage(page);
    await setWheelData(page, 'FL', testData.FL);
    log(colors.green, '  ✓ FL data written to localStorage');

    // STEP 1.2: Navigate to report and verify data displays
    log(colors.cyan, '\n  Step 1.2: Navigate to report and verify display');
    await navigateTo(page, '/report.html');
    await page.waitForTimeout(1500);

    const reportStateBeforeClear = await hasDataInReport(page);
    const flDataBeforeClear = await getWheelData(page, 'FL');

    if (reportStateBeforeClear.tableVisible && flDataBeforeClear) {
      log(colors.green, `  ✓ Report displays data (table visible)`);
      log(colors.green, `  ✓ FL data stored: ${JSON.stringify(flDataBeforeClear)}`);
    } else {
      log(colors.red, `  ✗ Report not properly displaying data`);
      log(colors.red, `    Table visible: ${reportStateBeforeClear.tableVisible}`);
      log(colors.red, `    Data in storage: ${flDataBeforeClear !== null}`);
      assert(false, 'FL data not displaying in report');
    }

    // STEP 1.3: Clear FL data from input
    log(colors.cyan, '\n  Step 1.3: Clear FL data from input');
    await navigateTo(page, '/input.html');
    await clearWheelData(page, 'FL');
    const flDataAfterClear = await getWheelData(page, 'FL');
    
    if (flDataAfterClear === null) {
      log(colors.green, '  ✓ FL data cleared from storage');
    } else {
      log(colors.red, '  ✗ FL data still exists after clear');
      assert(false, 'FL data not fully cleared');
    }

    // STEP 1.4: Return to report and verify empty state
    log(colors.cyan, '\n  Step 1.4: Return to report and verify empty state');
    await navigateTo(page, '/report.html');
    await page.waitForTimeout(1500);

    const reportStateAfterClear = await hasDataInReport(page);
    const flDataAfterReload = await getWheelData(page, 'FL');

    if (reportStateAfterClear.noDataMsgVisible && !flDataAfterReload) {
      log(colors.green, '✓ Report now displays empty state');
      log(colors.green, `  Message: "${reportStateAfterClear.noDataMsgText}"`);
      log(colors.green, '✓ FL Wheel: LOAD → DISPLAY → CLEAR → EMPTY ✓');
    } else {
      log(colors.red, '✗ Report did not transition to empty state');
      log(colors.red, `  No-data visible: ${reportStateAfterClear.noDataMsgVisible}`);
      log(colors.red, `  Data still in storage: ${flDataAfterReload !== null}`);
      log(colors.red, `  Table still visible: ${reportStateAfterClear.tableVisible}`);
      assert(false, 'FL report did not empty after data clear');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Test 2: FR Wheel - Load, Display, Clear, Empty
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ TEST 2: FR Wheel - Clear/Empty Cycle ────────────────────┐');

    // STEP 2.1: Populate input with FR data
    log(colors.cyan, '\n  Step 2.1: Populate input with FR data');
    await navigateTo(page, '/input.html');
    await clearAllStorage(page);
    await setWheelData(page, 'FR', testData.FR);
    log(colors.green, '  ✓ FR data written to localStorage');

    // STEP 2.2: Navigate to report and verify data displays
    log(colors.cyan, '\n  Step 2.2: Navigate to report and verify display');
    await navigateTo(page, '/report.html');
    await page.waitForTimeout(1500);

    const frReportStateBeforeClear = await hasDataInReport(page);
    const frDataBeforeClear = await getWheelData(page, 'FR');

    if (frReportStateBeforeClear.tableVisible && frDataBeforeClear) {
      log(colors.green, `  ✓ Report displays data (table visible)`);
      log(colors.green, `  ✓ FR data stored: ${JSON.stringify(frDataBeforeClear)}`);
    } else {
      log(colors.red, `  ✗ Report not properly displaying data`);
      log(colors.red, `    Table visible: ${frReportStateBeforeClear.tableVisible}`);
      log(colors.red, `    Data in storage: ${frDataBeforeClear !== null}`);
      assert(false, 'FR data not displaying in report');
    }

    // STEP 2.3: Clear FR data from input
    log(colors.cyan, '\n  Step 2.3: Clear FR data from input');
    await navigateTo(page, '/input.html');
    await clearWheelData(page, 'FR');
    const frDataAfterClear = await getWheelData(page, 'FR');
    
    if (frDataAfterClear === null) {
      log(colors.green, '  ✓ FR data cleared from storage');
    } else {
      log(colors.red, '  ✗ FR data still exists after clear');
      assert(false, 'FR data not fully cleared');
    }

    // STEP 2.4: Return to report and verify empty state
    log(colors.cyan, '\n  Step 2.4: Return to report and verify empty state');
    await navigateTo(page, '/report.html');
    await page.waitForTimeout(1500);

    const frReportStateAfterClear = await hasDataInReport(page);
    const frDataAfterReload = await getWheelData(page, 'FR');

    if (frReportStateAfterClear.noDataMsgVisible && !frDataAfterReload) {
      log(colors.green, '✓ Report now displays empty state');
      log(colors.green, `  Message: "${frReportStateAfterClear.noDataMsgText}"`);
      log(colors.green, '✓ FR Wheel: LOAD → DISPLAY → CLEAR → EMPTY ✓');
    } else {
      log(colors.red, '✗ Report did not transition to empty state');
      log(colors.red, `  No-data visible: ${frReportStateAfterClear.noDataMsgVisible}`);
      log(colors.red, `  Data still in storage: ${frDataAfterReload !== null}`);
      log(colors.red, `  Table still visible: ${frReportStateAfterClear.tableVisible}`);
      assert(false, 'FR report did not empty after data clear');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUCCESS
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  Input clear → report empty verified for FL and FR          ║');
    log(colors.blue, '║  Complete cycle: LOAD → DISPLAY → CLEAR → EMPTY            ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    await page.close();
    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    log(colors.red, '\n❌ TEST FAILED');
    log(colors.red, `Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }

  }
}

main();
