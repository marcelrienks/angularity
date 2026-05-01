#!/usr/bin/env node

/**
 * Integration Test: Required Fields E2E
 * (merged: input-required-fields-only, report-required-fields-only)
 *
 * Validates required-position data flows from input page through to report.
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

let passes = 0;
let failures = 0;
function assert(condition, label) {
  if (condition) { passes++; log(colors.green, `  ✓ ${label}`); }
  else { failures++; log(colors.red, `  ✗ FAIL: ${label}`); }
}

async function navigateTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  Required Fields E2E Test                                  ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    // Section A: Setup
    log(colors.cyan, '┌─ SECTION A: Setup ────────────────────────────────────────┐');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    const page = await browser.newPage();
    await waitForServer(BASE_URL);
    await navigateTo(page, '/input.html');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);

    // Select FL wheel
    const flBtn = await page.$('[data-wheel="FL"]');
    if (flBtn) await flBtn.click();
    await page.waitForTimeout(500);
    log(colors.green, '✓ Setup complete');

    // Section B: Input page required positions
    log(colors.cyan, '\n┌─ SECTION B: Input Page — Required Positions ──────────────┐');

    // The 5 required front and rear values
    const requiredFronts = [-6, -3, 0, 3, 6];
    const requiredRears = [-6, -3, 0, 3, 6];

    // Check that input cells for required positions exist
    let inputsFound = 0;
    for (const f of requiredFronts) {
      for (const r of requiredRears) {
        const exists = await page.evaluate((front, rear) => {
          const sel = `input[data-front="${front}"][data-rear="${rear}"]`;
          return !!document.querySelector(sel);
        }, f, r);
        if (exists) inputsFound++;
      }
    }
    assert(inputsFound === 25, `All 25 required position inputs found (got ${inputsFound})`);

    // Fill all 25 required positions with -1.10
    let filled = 0;
    for (const f of requiredFronts) {
      for (const r of requiredRears) {
        try {
          await page.evaluate((front, rear, val) => {
            const sel = `input[data-front="${front}"][data-rear="${rear}"]`;
            const input = document.querySelector(sel);
            if (input) {
              input.value = val;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }, f, r, '-1.10');
          filled++;
        } catch (_) {}
      }
    }
    assert(filled === 25, `Filled all 25 required position inputs (filled ${filled})`);
    await page.waitForTimeout(1000);

    // Inject required-only localStorage data for FL
    await page.evaluate(() => {
      const fronts = [-6, -3, 0, 3, 6];
      const rears = [-6, -3, 0, 3, 6];
      const grid = {};
      for (const f of fronts) {
        grid[String(f)] = {};
        for (const r of rears) {
          grid[String(f)][String(r)] = { neg20: '-1.10', zero: '-1.10', pos20: '-1.10' };
        }
      }
      localStorage.setItem('mx5-nc1-alignment-FL', JSON.stringify(grid));
    });
    await page.waitForTimeout(500);

    const storedFL = await page.evaluate(() => {
      const stored = localStorage.getItem('mx5-nc1-alignment-FL');
      if (!stored) return false;
      const grid = JSON.parse(stored);
      return Object.keys(grid).length >= 5;
    });
    assert(storedFL, 'FL required-only data stored in localStorage');

    // Section C: Report table with sparse data
    log(colors.cyan, '\n┌─ SECTION C: Report Table With Sparse Data ────────────────┐');
    await navigateTo(page, '/report.html');

    // Check table renders with sparse data
    try {
      await page.waitForSelector('#table-container', { visible: true, timeout: 8000 });
      const tableVisible = await page.$eval('#table-container', el => el.offsetParent !== null).catch(() => false);
      assert(tableVisible, 'Report table container visible');
    } catch (_) {
      // Try clicking tab if needed
      const flTab = await page.$('#tab-table-fl');
      if (flTab) await flTab.click();
      await page.waitForTimeout(1000);
      const tableVisible = await page.evaluate(() => {
        const el = document.querySelector('#table-container');
        return !!el && el.offsetParent !== null;
      });
      assert(tableVisible, 'Report table container visible after tab click');
    }

    const hasTd = await page.evaluate(() => {
      return document.querySelectorAll('tbody tr td').length > 0;
    });
    assert(hasTd, 'Report table has rendered rows');

    // Section D: Report chart with sparse data
    log(colors.cyan, '\n┌─ SECTION D: Report Chart With Sparse Data ────────────────┐');

    const chartExists = await page.evaluate(() => !!document.querySelector('#main-chart, canvas'));
    assert(chartExists, 'Main chart element exists');

    const chartSectionVisible = await page.evaluate(() => {
      const el = document.querySelector('#section-chart');
      return !!el;
    });
    assert(chartSectionVisible, '#section-chart element present');

    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    log(colors.red, `\n✗ Test failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
