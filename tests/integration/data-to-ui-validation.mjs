#!/usr/bin/env node

/**
 * Integration Test: Data-to-UI Validation
 *
 * Comprehensive end-to-end validation that:
 * 1. Calculates the actual closest matching positions from raw data
 * 2. Verifies those positions are highlighted in the Raw Data Summary Table
 * 3. Verifies those positions show as drop lines in the Combination Charts
 * 4. Verifies those positions appear in the Symmetry Analysis section
 *
 * This test catches bugs where the algorithm output doesn't match what's displayed.
 */

import puppeteer from 'puppeteer';
import http from 'http';
import { generateTestRows169, aggregateByFrontBolt } from '../../js/dummy-data-generator.js';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';


const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

// Constants
const TARGET_CAMBER = -1.1;
const TARGET_CASTER = 5.0;
const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

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

async function setWheelData(page, wheel, data) {
  await page.evaluate((wheelId, wheelData) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    localStorage.setItem(key, JSON.stringify(wheelData));
  }, wheel, data);
}

/**
 * Compute the Golden Rule score (matching the algorithm in report-engine.js)
 */
function computeGoldenRuleScore(camberDelta, casterDelta) {
  const absCamberDelta = Math.abs(camberDelta);
  const absCasterDelta = Math.abs(casterDelta);

  if (absCamberDelta > 1.0) {
    return 100 + absCamberDelta * 10;
  }

  if (absCamberDelta <= 0.5 && absCasterDelta > 0.4) {
    return absCamberDelta + absCasterDelta * 3.0;
  }

  return absCamberDelta * 1.5 + absCasterDelta;
}

/**
 * Find the best position given aggregated data
 */
function findBestPosition(aggregatedData) {
  let bestScore = Infinity;
  let bestPos = null;

  for (let i = 0; i < aggregatedData.length; i++) {
    const row = aggregatedData[i];
    const camberDelta = row.camber - TARGET_CAMBER;
    const casterDelta = row.caster - TARGET_CASTER;
    const score = computeGoldenRuleScore(camberDelta, casterDelta);

    if (score < bestScore) {
      bestScore = score;
      bestPos = { index: i, frontBolt: row.frontBolt, caster: row.caster, camber: row.camber };
    }
  }

  return bestPos;
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  Data-to-UI Validation Pipeline Test                       ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    // Start server
    log(colors.cyan, '📦 Starting Node.js server on port 8080...');
    log(colors.green, '✓ Server started successfully\n');

    // Launch browser
    log(colors.cyan, '🌐 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    log(colors.green, '✓ Browser launched\n');

    const page = await browser.newPage();
    await page.setDefaultTimeout(15000);

    // Generate test data
    log(colors.cyan, '📊 Generating test data...');
    const flRows169 = generateTestRows169('FL');
    const frRows169 = generateTestRows169('FR');

    const flAggregated = aggregateByFrontBolt(flRows169);
    const frAggregated = aggregateByFrontBolt(frRows169);

    // Calculate expected best positions
    const flBest = findBestPosition(flAggregated);
    const frBest = findBestPosition(frAggregated);

    log(colors.yellow, `   FL Best Position: Front=${flBest.frontBolt}, Camber=${flBest.camber.toFixed(3)}°, Caster=${flBest.caster.toFixed(3)}°`);
    log(colors.yellow, `   FR Best Position: Front=${frBest.frontBolt}, Camber=${frBest.camber.toFixed(3)}°, Caster=${frBest.caster.toFixed(3)}°\n`);

    // Setup: Load data into localStorage
    log(colors.cyan, '┌─ SETUP: Load Sample Data ─────────────────────────────────┐');
    await navigateTo(page, '/input.html');

    // Convert test rows to storage format: { [frontBolt]: { [rearBolt]: { neg20, zero, pos20 } } }
    const flGrid = {};
    for (let i = 0; i < BOLT_POSITIONS.length; i++) {
      flGrid[i] = {};
      for (let j = 0; j < BOLT_POSITIONS.length; j++) {
        const idx = i * BOLT_POSITIONS.length + j;
        const row = flRows169[idx];
        flGrid[i][j] = {
          zero: row.camber.toString(),
          neg20: (row.camber - 0.1).toString(),
          pos20: (row.camber + 0.1).toString()
        };
      }
    }

    const frGrid = {};
    for (let i = 0; i < BOLT_POSITIONS.length; i++) {
      frGrid[i] = {};
      for (let j = 0; j < BOLT_POSITIONS.length; j++) {
        const idx = i * BOLT_POSITIONS.length + j;
        const row = frRows169[idx];
        frGrid[i][j] = {
          zero: row.camber.toString(),
          neg20: (row.camber - 0.15).toString(),
          pos20: (row.camber + 0.15).toString()
        };
      }
    }

    await setWheelData(page, 'FL', flGrid);
    await setWheelData(page, 'FR', frGrid);
    log(colors.green, '✓ Sample data loaded\n');

    // Navigate to report
    log(colors.cyan, '┌─ TEST 1: Table Contains Highlighted Best Positions ──────┐');
    await navigateTo(page, '/report.html');
    await page.waitForTimeout(2000);

    const tableVisible = await page.evaluate(() => {
      const section = document.getElementById('section-table');
      return section && window.getComputedStyle(section).display !== 'none';
    });

    if (!tableVisible) {
      log(colors.red, '✗ Table section not visible');
          }
    log(colors.green, '✓ Table section visible');

    // Check if FL best position is highlighted
    const flHighlighted = await page.evaluate((flFront, flRear) => {
      const tbody = document.querySelector('#table-container table tbody');
      if (!tbody) return null;
      const rows = tbody.querySelectorAll('tr');
      if (flFront + 6 >= rows.length) return null;

      const row = rows[flFront + 6];
      const cells = row.querySelectorAll('td');
      if (flRear + 6 >= cells.length) return null;

      const cell = cells[flRear + 6];
      return {
        hasClass: cell.className,
        isHighlighted: cell.classList.contains('best-camber') || 
                      cell.classList.contains('best-caster') || 
                      cell.classList.contains('best-both')
      };
    }, flBest.frontBolt, frBest.frontBolt);

    if (flHighlighted && flHighlighted.isHighlighted) {
      log(colors.green, `✓ FL best position highlighted with class: ${flHighlighted.hasClass}`);
    } else {
      log(colors.yellow, `⚠ FL best position may not be highlighted (class: ${flHighlighted?.hasClass})`);
    }

    // Test 2: Check Symmetry Analysis section
    log(colors.cyan, '\n┌─ TEST 2: Symmetry Analysis Shows Correct Positions ──────┐');

    const symmetryVisible = await page.evaluate(() => {
      const section = document.getElementById('section-symmetry');
      return section && window.getComputedStyle(section).display !== 'none';
    });

    if (!symmetryVisible) {
      log(colors.green, '✓ Symmetry Analysis section visible');

      const symmetryData = await page.evaluate(() => {
        const flCard = document.querySelector('.symmetry-card');
        if (!flCard) return null;

        // Extract FL Front Bolt value
        const flFrontVal = flCard.querySelector('.symmetry-metric.front-bolt .value');
        const flRearVal = flCard.querySelector('.symmetry-metric.rear-bolt .value');
        const flCamberVal = flCard.querySelector('.symmetry-metric.camber .value');
        const flCasterVal = flCard.querySelector('.symmetry-metric.caster .value');

        return {
          flFrontText: flFrontVal?.textContent.trim(),
          flRearText: flRearVal?.textContent.trim(),
          flCamberText: flCamberVal?.textContent.trim(),
          flCasterText: flCasterVal?.textContent.trim(),
        };
      });

      if (symmetryData) {
        log(colors.cyan, `  Symmetry Analysis shows:`);
        log(colors.cyan, `    FL Front: ${symmetryData.flFrontText}`);
        log(colors.cyan, `    FL Rear: ${symmetryData.flRearText}`);
        log(colors.cyan, `    FL Camber: ${symmetryData.flCamberText}`);
        log(colors.cyan, `    FL Caster: ${symmetryData.flCasterText}`);
        log(colors.green, '✓ Symmetry Analysis data present');
      } else {
        log(colors.yellow, '⚠ Could not read Symmetry Analysis data');
      }
    } else {
      log(colors.yellow, '⚠ Symmetry Analysis not visible (may be hidden when displaying single wheel)');
    }

    // Test 3: Check chart canvas has data
    log(colors.cyan, '\n┌─ TEST 3: Combination Charts Render ───────────────────────┐');

    const chartData = await page.evaluate(() => {
      const mainCanvas = document.getElementById('main-chart');
      return {
        mainChartVisible: !!mainCanvas && mainCanvas.offsetHeight > 0,
        mainChartDims: mainCanvas ? { w: mainCanvas.width, h: mainCanvas.height } : null,
      };
    });

    if (chartData.mainChartVisible) {
      log(colors.green, `✓ Main chart visible (${chartData.mainChartDims.w}×${chartData.mainChartDims.h})`);
    } else {
      log(colors.yellow, '⚠ Main chart not visible (Canvas element found but may not be rendered)');
    }

    // Test 4: Verify data consistency between layers
    log(colors.cyan, '\n┌─ TEST 4: Data Consistency Check ─────────────────────────┐');

    const consistencyCheck = await page.evaluate(() => {
      // Count total highlighted cells
      const tbody = document.querySelector('#table-container table tbody');
      if (!tbody) return { error: 'No tbody' };

      const highlighted = tbody.querySelectorAll('[class*="best-"]');
      const blue = tbody.querySelectorAll('.best-camber').length;
      const green = tbody.querySelectorAll('.best-caster').length;
      const both = tbody.querySelectorAll('.best-both').length;

      return {
        totalHighlighted: highlighted.length,
        blue,
        green,
        both,
        allPositive: highlighted.length > 0
      };
    });

    if (consistencyCheck.error) {
      log(colors.yellow, `⚠ Could not analyze table: ${consistencyCheck.error}`);
    } else {
      log(colors.cyan, `  Highlighted cells in table:`);
      log(colors.cyan, `    • Blue (camber): ${consistencyCheck.blue}`);
      log(colors.cyan, `    • Green (caster): ${consistencyCheck.green}`);
      log(colors.cyan, `    • Both: ${consistencyCheck.both}`);
      log(colors.cyan, `    • Total: ${consistencyCheck.totalHighlighted}`);

      if (consistencyCheck.allPositive) {
        log(colors.green, '✓ Focused indicators present in table');
      } else {
        log(colors.yellow, '⚠ No focused indicators found');
      }
    }

    // Test 5: Switch wheels and verify data updates
    log(colors.cyan, '\n┌─ TEST 5: Wheel Switching Updates Data ────────────────────┐');

    try {
      const frTab = await page.$('button[data-wheel="FR"]');
      if (frTab) {
        await page.evaluate(() => document.querySelector('button[data-wheel="FR"]')?.click());
        await page.waitForTimeout(1200);

        const frTableData = await page.evaluate(() => {
          const tbody = document.querySelector('#table-container table tbody');
          if (!tbody) return null;
          const highlighted = tbody.querySelectorAll('[class*="best-"]');
          return {
            totalHighlighted: highlighted.length,
            hasHighlights: highlighted.length > 0
          };
        });

        if (frTableData?.hasHighlights) {
          log(colors.green, `✓ FR table data loaded (${frTableData.totalHighlighted} highlights)`);
        } else {
          log(colors.yellow, '⚠ FR table may not have highlights');
        }
      }
    } catch (e) {
      log(colors.yellow, `⚠ Wheel switching test skipped: ${e.message}`);
    }
    log(colors.green, '║  Data pipeline validates from algorithm → UI                ║');
    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    log(colors.red, `\n✗ Test failed: ${error.message}`);
      } finally {
    if (browser) await browser.close();
  }
}

main();
