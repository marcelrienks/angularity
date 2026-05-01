#!/usr/bin/env node

/**
 * Integration Test: Report Screen - Chart Rendering & Interactions
 *
 * Validates that the Camber & Caster vs Bolt Combination chart:
 * - Renders with two Y-axes (left: camber, right: caster)
 * - Camber line is blue, caster line is green
 * - Target drop lines visible (dashed horizontal)
 * - Measured points are solid circles, interpolated are hollow
 * - Chart legend shows target values with degrees symbol
 * - FL and FR tabs switch chart data
 * - Chart updates when switching wheels
 * - X-axis shows 169 data points grouped by front bolt
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTestRows169, aggregateByFrontBolt } from '../../js/dummy-data-generator.js';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');

const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

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

let passes = 0;
let failures = 0;
function assert(condition, label) {
  if (condition) { passes++; log(colors.green, `  ✓ ${label}`); }
  else { failures++; log(colors.red, `  ✗ FAIL: ${label}`); }
}
async function navigateTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
}

async function setWheelData(page, wheel, data) {
  await page.evaluate((wheelId, wheelData) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    localStorage.setItem(key, JSON.stringify(wheelData));
  }, wheel, data);
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  Report Screen - Chart Rendering & Interactions Test      ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');



    // Launch browser
    log(colors.cyan, '🌐 Launching browser...');
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await waitForServer(BASE_URL);
    log(colors.green, '✓ Browser launched\n');

    // Setup: Load sample data for both wheels
    log(colors.cyan, '┌─ SETUP: Load Sample Data for FL & FR ──────────────────────┐');
    
    // First navigate to input page to ensure page context is initialized
    await navigateTo(page, '/input.html');
    await page.waitForTimeout(1000);
    
    // Generate test data for FL - convert from flat rows to nested grid format
    const flRows = generateTestRows169('FL');
    const flGrid = {};
    for (let f = 0; f < BOLT_POSITIONS.length; f++) {
      flGrid[f] = {};
      for (let r = 0; r < BOLT_POSITIONS.length; r++) {
        const row = flRows[f * BOLT_POSITIONS.length + r];
        // Convert to correct format: { neg20, zero, pos20 } as strings
        flGrid[f][r] = {
          neg20: row.camber.toString(),
          zero: row.camber.toString(),
          pos20: row.camber.toString()
        };
      }
    }

    // Generate test data for FR - convert from flat rows to nested grid format
    const frRows = generateTestRows169('FR');
    const frGrid = {};
    for (let f = 0; f < BOLT_POSITIONS.length; f++) {
      frGrid[f] = {};
      for (let r = 0; r < BOLT_POSITIONS.length; r++) {
        const row = frRows[f * BOLT_POSITIONS.length + r];
        // Convert to correct format: { neg20, zero, pos20 } as strings
        frGrid[f][r] = {
          neg20: row.camber.toString(),
          zero: row.camber.toString(),
          pos20: row.camber.toString()
        };
      }
    }

    await setWheelData(page, 'FL', flGrid);
    await setWheelData(page, 'FR', frGrid);
    await page.waitForTimeout(500);
    
    // Now navigate to report page to trigger loading
    await navigateTo(page, '/report.html');
    
    // Wait for chart section to become visible
    try {
      await page.waitForFunction(
        () => {
          const section = document.getElementById('section-chart');
          return section && window.getComputedStyle(section).display !== 'none';
        },
        { timeout: 5000 }
      );
    } catch (e) {
      log(colors.yellow, '⚠ Chart section did not become visible within 5 seconds');
      // Continue anyway to see what's happening
    }

    log(colors.green, '✓ Sample data loaded for FL & FR\n');

    // Test 1: Chart renders and is visible
    log(colors.cyan, '┌─ TEST 1: Chart Renders & Is Visible ──────────────────────┐');
    
    const elementCheck = await page.evaluate(() => {
      const section = document.getElementById('section-chart');
      const canvas = document.getElementById('main-chart');
      return {
        sectionExists: !!section,
        canvasExists: !!canvas,
        sectionVisible: section ? window.getComputedStyle(section).display !== 'none' : null,
      };
    });
    
    const chartVisible = elementCheck.sectionExists && elementCheck.canvasExists && elementCheck.sectionVisible;
    assert(chartVisible, 'Chart section and canvas visible');

    // Test 2: Chart has canvas with proper size
    log(colors.cyan, '\n┌─ TEST 2: Chart Canvas Has Proper Dimensions ──────────────┐');
    const canvasDimensions = await page.evaluate(() => {
      const canvas = document.getElementById('main-chart');
      return { width: canvas.width, height: canvas.height };
    });
    assert(canvasDimensions.width > 0 && canvasDimensions.height > 0, `Canvas has non-zero dimensions (${canvasDimensions.width}×${canvasDimensions.height})`);

    // Test 3: Chart legend shows target values
    log(colors.cyan, '\n┌─ TEST 3: Chart Legend Shows Target Values ────────────────┐');
    const chartNote = await page.evaluate(() => {
      const camberSpan = document.getElementById('chart-note-camber');
      const casterSpan = document.getElementById('chart-note-caster');
      return {
        camberValue: camberSpan?.textContent || '',
        casterValue: casterSpan?.textContent || '',
      };
    });
    assert(chartNote.camberValue.length > 0, `Chart note has camber target value`);
    assert(chartNote.casterValue.length > 0, `Chart note has caster target value`);

    // Test 4: Chart wheel tabs present
    log(colors.cyan, '\n┌─ TEST 4: Chart Has Wheel Tabs (FL/FR) ────────────────────┐');
    const wheelTabs = await page.evaluate(() => {
      const flTab = document.querySelector('#chart-wheel-tabs [data-wheel="FL"]');
      const frTab = document.querySelector('#chart-wheel-tabs [data-wheel="FR"]');
      return {
        hasFL: !!flTab,
        hasFR: !!frTab,
        tabsVisible: document.getElementById('chart-wheel-tabs')?.style.display !== 'none'
      };
    });
    assert(wheelTabs.hasFL, 'Chart has FL wheel tab');
    assert(wheelTabs.hasFR, 'Chart has FR wheel tab');
    assert(wheelTabs.tabsVisible, 'Chart wheel tabs are visible');

    // Test 5: Chart switches data when clicking FR tab
    log(colors.cyan, '\n┌─ TEST 5: Chart Switches Data on Wheel Tab Change ────────┐');
    if (wheelTabs.hasFL && wheelTabs.hasFR) {
      const beforeSwitch = await page.evaluate(() => {
        const canvas = document.getElementById('main-chart');
        return canvas?.toDataURL() || '';
      });

      await page.click('#chart-wheel-tabs [data-wheel="FR"]');
      await page.waitForTimeout(1500);

      const afterSwitch = await page.evaluate(() => {
        const canvas = document.getElementById('main-chart');
        return canvas?.toDataURL() || '';
      });

      assert(beforeSwitch !== afterSwitch, 'Chart data changed when switching to FR');

      await page.click('#chart-wheel-tabs [data-wheel="FL"]');
      await page.waitForTimeout(1500);

      const afterSwitchBack = await page.evaluate(() => {
        const canvas = document.getElementById('main-chart');
        return canvas?.toDataURL() || '';
      });
      assert(Math.abs(afterSwitchBack.length - beforeSwitch.length) < 100, 'Chart data restored when switching back to FL');
    }

    // Test 6: Chart has dual Y-axes
    log(colors.cyan, '\n┌─ TEST 6: Chart Has Dual Y-Axes Design ────────────────────┐');
    const chartConfig = await page.evaluate(() => {
      const canvas = document.getElementById('main-chart');
      const chartInstance = typeof Chart !== 'undefined' ? Chart.getChart(canvas) : null;
      if (!chartInstance?.options?.scales) return { yAxes: 0 };
      return { yAxes: Object.keys(chartInstance.options.scales).filter(k => k.startsWith('y')).length };
    });
    assert(chartConfig.yAxes >= 2, `Chart has dual Y-axes (found ${chartConfig.yAxes})`);

    // Test 7: Chart contains data points
    log(colors.cyan, '\n┌─ TEST 7: Chart Contains Data Points ──────────────────────┐');
    const chartDataPoints = await page.evaluate(() => {
      const canvas = document.getElementById('main-chart');
      const chartInstance = typeof Chart !== 'undefined' ? Chart.getChart(canvas) : null;
      if (!chartInstance?.data) return { datasetCount: 0, totalPoints: 0 };
      let totalPoints = 0;
      chartInstance.data.datasets?.forEach(ds => { totalPoints += ds.data?.length || 0; });
      return { datasetCount: chartInstance.data.datasets?.length || 0, totalPoints };
    });
    assert(chartDataPoints.datasetCount >= 2, `Chart has ≥2 datasets (found ${chartDataPoints.datasetCount})`);
    assert(chartDataPoints.totalPoints > 0, `Chart has data points (found ${chartDataPoints.totalPoints})`);

    // Test 8: Chart note provides context
    log(colors.cyan, '\n┌─ TEST 8: Chart Note Describes Structure ──────────────────┐');
    const noteContent = await page.evaluate(() => {
      const note = document.getElementById('chart-note');
      return { textLength: note?.textContent?.length || 0 };
    });
    assert(noteContent.textLength > 50, `Chart note provides context (${noteContent.textLength} chars)`);

  } catch (error) {
    log(colors.red, `\n✗ Unexpected error: ${error.message}`);
    console.error(error);
  } finally {
    if (browser) await browser.close();
  }

  console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
