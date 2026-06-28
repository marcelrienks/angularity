#!/usr/bin/env node

/**
 * Integration Test: Report Screen - Scatter & Sensitivity Charts
 *
 * Validates parametric scatter plot and bolt sensitivity features:
 * - S1: Scatter chart renders with correct type ('scatter')
 * - S2: Wheel tab switch works without errors
 * - S3: Rear wheel Y-axis shows 'Toe'
 * - S4: Sensitivity section renders when data loaded
 * - S5: Camber/Caster mode toggle switches all charts
 * - S6: Placeholder shown for unloaded wheels
 * - S7: All four wheels load and display correctly
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTestRows169 } from '../../js/dummy-data-generator.js';
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
    log(colors.blue, '║  Report Screen - Scatter & Sensitivity Charts Test        ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    log(colors.cyan, '🌐 Launching browser...');
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await waitForServer(BASE_URL);
    log(colors.green, '✓ Browser launched\n');

    // Initialize localStorage via input page
    await navigateTo(page, '/input.html');
    await page.waitForTimeout(1000);

    // Generate test data for all wheels
    const wheelsData = {};
    const WHEELS = ['FL', 'FR', 'RL', 'RR'];
    for (const wheel of WHEELS) {
      const rows = generateTestRows169(wheel);
      const grid = {};
      for (let f = 0; f < BOLT_POSITIONS.length; f++) {
        grid[f] = {};
        for (let r = 0; r < BOLT_POSITIONS.length; r++) {
          const row = rows[f * BOLT_POSITIONS.length + r];
          grid[f][r] = {
            neg20: row.camber.toString(),
            zero: row.camber.toString(),
            pos20: row.camber.toString()
          };
        }
      }
      wheelsData[wheel] = { gridState: { [wheel]: grid }, camberTarget: -1.1, casterTarget: 5 };
    }

    // S1: Scatter chart renders with correct type
    log(colors.cyan, '┌─ S1: Scatter Chart Renders ───────────────────────────────────┐');
    await setWheelData(page, 'FR', wheelsData.FR);
    await navigateTo(page, '/report.html');

    const chartType = await page.evaluate(() => {
      const chart = Chart.getChart('main-chart');
      return chart ? chart.config.type : null;
    });
    assert(chartType === 'scatter', 'Main chart type is scatter');

    const datasetCount = await page.evaluate(() => {
      const chart = Chart.getChart('main-chart');
      return chart ? chart.data.datasets.length : 0;
    });
    assert(datasetCount >= 1, `Scatter has ≥1 dataset (found ${datasetCount})`);
    log(colors.yellow, '');

    // S2: Wheel tab switch works
    log(colors.cyan, '┌─ S2: Wheel Tab Switch ────────────────────────────────────────┐');
    await setWheelData(page, 'FL', wheelsData.FL);
    await navigateTo(page, '/report.html');

    // Click FR tab
    await page.click('#tab-chart-fr');
    await page.waitForTimeout(500);
    let consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    assert(consoleErrors.length === 0, 'No console errors on tab switch');

    const frChartExists = await page.evaluate(() => {
      const chart = Chart.getChart('main-chart');
      return chart !== null && chart !== undefined;
    });
    assert(frChartExists, 'FR chart renders after tab click');

    // Click FL tab back
    await page.click('#tab-chart-fl');
    await page.waitForTimeout(500);
    const flChartExists = await page.evaluate(() => {
      const chart = Chart.getChart('main-chart');
      return chart !== null && chart !== undefined;
    });
    assert(flChartExists, 'FL chart renders after tab click');
    log(colors.yellow, '');

    // S3: Rear wheel label shows 'Toe'
    log(colors.cyan, '┌─ S3: Rear Wheel Label ────────────────────────────────────────┐');
    // Load RL data only
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded' });
    await setWheelData(page, 'RL', wheelsData.RL);
    await navigateTo(page, '/report.html');

    const yAxisLabel = await page.evaluate(() => {
      const chart = Chart.getChart('main-chart');
      if (!chart) return null;
      const yScale = chart.scales.y;
      return yScale ? yScale.options.title.text : null;
    });
    assert(yAxisLabel && yAxisLabel.includes('Toe'), `Y-axis label contains 'Toe' (found: ${yAxisLabel})`);
    log(colors.yellow, '');

    // S4: Sensitivity section renders
    log(colors.cyan, '┌─ S4: Sensitivity Section Renders ─────────────────────────────┐');
    await setWheelData(page, 'FR', wheelsData.FR);
    await navigateTo(page, '/report.html');

    const sensitivitySectionVisible = await page.evaluate(() => {
      const section = document.getElementById('section-sensitivity');
      return section && section.style.display !== 'none';
    });
    assert(sensitivitySectionVisible, 'Sensitivity section is visible');

    const frSensChartVisible = await page.evaluate(() => {
      const canvas = document.getElementById('sens-chart-FR');
      const placeholder = document.getElementById('sens-placeholder-FR');
      return canvas && canvas.offsetHeight > 0 && placeholder.style.display === 'none';
    });
    assert(frSensChartVisible, 'FR sensitivity chart canvas is visible');
    log(colors.yellow, '');

    // S5: Mode toggle works
    log(colors.cyan, '┌─ S5: Mode Toggle Works ───────────────────────────────────────┐');
    const casterButtonInitial = await page.$('#btn-sens-caster');
    assert(casterButtonInitial !== null, 'Caster button exists');

    await page.click('#btn-sens-caster');
    await page.waitForTimeout(300);

    const casterButtonActive = await page.evaluate(() => {
      return document.getElementById('btn-sens-caster').classList.contains('active');
    });
    assert(casterButtonActive, 'Caster button shows active after click');

    await page.click('#btn-sens-camber');
    await page.waitForTimeout(300);

    const camberButtonActive = await page.evaluate(() => {
      return document.getElementById('btn-sens-camber').classList.contains('active');
    });
    assert(camberButtonActive, 'Camber button shows active after click');
    log(colors.yellow, '');

    // S6: Placeholder for missing wheel
    log(colors.cyan, '┌─ S6: Placeholder for Unloaded Wheel ──────────────────────────┐');
    // Keep only FR loaded, others should show placeholder
    await navigateTo(page, '/report.html');

    const flPlaceholderShown = await page.evaluate(() => {
      const placeholder = document.getElementById('sens-placeholder-FL');
      return placeholder && placeholder.style.display !== 'none';
    });
    assert(flPlaceholderShown, 'FL placeholder shown when wheel not loaded');

    const frPlaceholderHidden = await page.evaluate(() => {
      const placeholder = document.getElementById('sens-placeholder-FR');
      return placeholder && placeholder.style.display === 'none';
    });
    assert(frPlaceholderHidden, 'FR placeholder hidden when wheel loaded');
    log(colors.yellow, '');

    // S7: All four wheels
    log(colors.cyan, '┌─ S7: All Four Wheels ─────────────────────────────────────────┐');
    // Load all wheels
    for (const wheel of WHEELS) {
      await setWheelData(page, wheel, wheelsData[wheel]);
    }
    await navigateTo(page, '/report.html');

    const allChartsVisible = await page.evaluate(() => {
      const visible = [];
      for (const wheel of ['FL', 'FR', 'RL', 'RR']) {
        const canvas = document.getElementById(`sens-chart-${wheel}`);
        const placeholder = document.getElementById(`sens-placeholder-${wheel}`);
        visible.push(
          canvas && canvas.offsetHeight > 0 && placeholder.style.display === 'none'
        );
      }
      return visible.every(v => v);
    });
    assert(allChartsVisible, 'All four wheel charts visible');

    const allPlaceholdersHidden = await page.evaluate(() => {
      const hidden = [];
      for (const wheel of ['FL', 'FR', 'RL', 'RR']) {
        const placeholder = document.getElementById(`sens-placeholder-${wheel}`);
        hidden.push(placeholder && placeholder.style.display === 'none');
      }
      return hidden.every(v => v);
    });
    assert(allPlaceholdersHidden, 'All placeholders hidden when wheels loaded');
    log(colors.yellow, '');

    log(colors.green, `\n✅ Tests Complete: ${passes} passed, ${failures} failed\n`);

    await browser.close();
    process.exit(failures > 0 ? 1 : 0);

  } catch (err) {
    log(colors.red, `\n❌ Test Error: ${err.message}`);
    console.error(err);
    if (browser) await browser.close();
    process.exit(1);
  }
}

main();
