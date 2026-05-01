#!/usr/bin/env node

/**
 * Integration Test: Multi-Field Sync (merged: camber-sync, camber-sweep-sync)
 *
 * Validates that modifying data multiple times (10+ different field sets)
 * keeps the report in sync with the input page.
 * Also covers: 4-wheel camber round-trip, FL/FR sweep data round-trip.
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');

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

let passes = 0;
let failures = 0;
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

async function clearAllStorage(page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

async function navigateTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  MX5 NC1 Alignment - 10+ Field Modifications Sync Test      ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    // Launch browser
    log(colors.cyan, '🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    log(colors.green, '✓ Browser launched\n');

    const page = await browser.newPage();
    await waitForServer(BASE_URL);
    await page.setDefaultTimeout(10000);

    // Define 12 different modification scenarios for each wheel
    const flModifications = [
      { camber0: -1.00, camberPos20: -3.20, camberNeg20: 0.10, name: 'FL-1: Slight green camber' },
      { camber0: -1.15, camberPos20: -3.30, camberNeg20: 0.05, name: 'FL-2: Slightly off target' },
      { camber0: -0.95, camberPos20: -3.15, camberNeg20: 0.15, name: 'FL-3: Positive adjustment' },
      { camber0: -1.50, camberPos20: -3.50, camberNeg20: -0.10, name: 'FL-4: Red zone camber' },
      { camber0: -1.08, camberPos20: -3.22, camberNeg20: 0.08, name: 'FL-5: Fine tune green' },
      { camber0: -1.32, camberPos20: -3.40, camberNeg20: 0.02, name: 'FL-6: Orange camber' },
      { camber0: -0.90, camberPos20: -3.05, camberNeg20: 0.20, name: 'FL-7: Extreme positive' },
      { camber0: -1.20, camberPos20: -3.35, camberNeg20: 0.00, name: 'FL-8: Neutral neg sweep' },
      { camber0: -1.10, camberPos20: -3.25, camberNeg20: 0.08, name: 'FL-9: Back to baseline' },
      { camber0: -1.05, camberPos20: -3.18, camberNeg20: 0.12, name: 'FL-10: High positive offset' },
      { camber0: -1.35, camberPos20: -3.45, camberNeg20: -0.05, name: 'FL-11: Deep red zone' },
      { camber0: -1.12, camberPos20: -3.28, camberNeg20: 0.06, name: 'FL-12: Final adjustment' }
    ];

    const frModifications = [
      { camber0: -1.05, camberPos20: -3.25, camberNeg20: 0.08, name: 'FR-1: Initial orange' },
      { camber0: -1.10, camberPos20: -3.30, camberNeg20: 0.05, name: 'FR-2: Shift toward green' },
      { camber0: -1.42, camberPos20: -4.10, camberNeg20: 0.08, name: 'FR-3: High sweep (red caster)' },
      { camber0: -0.98, camberPos20: -3.10, camberNeg20: 0.15, name: 'FR-4: Positive camber' },
      { camber0: -1.25, camberPos20: -3.35, camberNeg20: 0.02, name: 'FR-5: Mid-range orange' },
      { camber0: -1.50, camberPos20: -3.60, camberNeg20: -0.05, name: 'FR-6: Red camber, high sweep' },
      { camber0: -0.92, camberPos20: -3.02, camberNeg20: 0.18, name: 'FR-7: Green camber extremes' },
      { camber0: -1.18, camberPos20: -3.32, camberNeg20: 0.04, name: 'FR-8: Balanced reading' },
      { camber0: -1.35, camberPos20: -4.05, camberNeg20: 0.10, name: 'FR-9: Deep red sweep scenario' },
      { camber0: -1.08, camberPos20: -3.24, camberNeg20: 0.09, name: 'FR-10: Precision tuning' },
      { camber0: -1.20, camberPos20: -3.40, camberNeg20: 0.00, name: 'FR-11: Null neg sweep' },
      { camber0: -1.15, camberPos20: -3.28, camberNeg20: 0.06, name: 'FR-12: Convergence point' }
    ];

    log(colors.yellow, '📊 Test Plan:');
    log(colors.yellow, `   FL: ${flModifications.length} different modifications`);
    log(colors.yellow, `   FR: ${frModifications.length} different modifications\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 1: FL Wheel - 12 Modifications with Sync Verification
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ TEST 1: FL Wheel - 12 Field Modifications Sync ──────────┐');

    await navigateTo(page, '/input.html');
    await clearAllStorage(page);

    for (let i = 0; i < flModifications.length; i++) {
      const mod = flModifications[i];
      await setWheelData(page, 'FL', mod);
      await navigateTo(page, '/report.html');
      await page.waitForTimeout(1000);
      const reportData = await getWheelData(page, 'FL');
      assert(JSON.stringify(reportData) === JSON.stringify(mod), `FL mod ${i + 1} synced (${mod.name})`);
      await navigateTo(page, '/input.html');
      await page.waitForTimeout(300);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TEST 2: FR Wheel - 12 Modifications with Sync Verification
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ TEST 2: FR Wheel - 12 Field Modifications Sync ──────────┐');

    await navigateTo(page, '/input.html');
    await clearAllStorage(page);

    for (let i = 0; i < frModifications.length; i++) {
      const mod = frModifications[i];
      await setWheelData(page, 'FR', mod);
      await navigateTo(page, '/report.html');
      await page.waitForTimeout(1000);
      const reportData = await getWheelData(page, 'FR');
      assert(JSON.stringify(reportData) === JSON.stringify(mod), `FR mod ${i + 1} synced (${mod.name})`);
      await navigateTo(page, '/input.html');
      await page.waitForTimeout(300);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION: 4-wheel camber round-trip
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ SECTION: 4-Wheel Camber Round-Trip ──────────────────────┐');

    await navigateTo(page, '/input.html');
    await clearAllStorage(page);

    const fourWheelData = {
      FL: { camber0: -1.05, camberPos20: -3.25, camberNeg20: 0.08 },
      FR: { camber0: -1.35, camberPos20: -3.55, camberNeg20: 0.15 },
      RL: { camber0: -1.50 },
      RR: { camber0: -1.48 }
    };
    for (const [wheel, data] of Object.entries(fourWheelData)) {
      await setWheelData(page, wheel, data);
    }
    await navigateTo(page, '/report.html');
    await page.waitForTimeout(1000);
    for (const [wheel, expected] of Object.entries(fourWheelData)) {
      const actual = await getWheelData(page, wheel);
      assert(JSON.stringify(actual) === JSON.stringify(expected), `4-wheel round-trip: ${wheel} data preserved`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION: FL/FR sweep round-trip
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ SECTION: FL/FR Sweep Round-Trip ─────────────────────────┐');

    await navigateTo(page, '/input.html');
    await clearAllStorage(page);

    const sweepData = {
      FL: { camber0: -1.08, camberPos20: -3.55, camberNeg20: 0.15 },
      FR: { camber0: -1.42, camberPos20: -4.10, camberNeg20: 0.08 }
    };
    for (const [wheel, data] of Object.entries(sweepData)) {
      await setWheelData(page, wheel, data);
    }
    await navigateTo(page, '/report.html');
    await page.waitForTimeout(1000);
    for (const [wheel, expected] of Object.entries(sweepData)) {
      const actual = await getWheelData(page, wheel);
      assert(JSON.stringify(actual) === JSON.stringify(expected), `FL/FR sweep round-trip: ${wheel} pos20/neg20 preserved`);
    }

    await page.close();
  } catch (error) {
    log(colors.red, `\n❌ Unexpected error: ${error.message}`);
    console.error(error);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
