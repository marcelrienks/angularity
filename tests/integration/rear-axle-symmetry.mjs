#!/usr/bin/env node

/**
 * Integration Test: Rear Axle Symmetry (merged: rear-axle-symmetry, report-rear-axle-validation)
 *
 * Validates rear wheel (RL/RR) symmetry analysis and rear-only report mode.
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

function buildRearStorageGrid(wheelBias = 0) {
  const grid = {};
  for (const front of BOLT_POSITIONS) {
    grid[front] = {};
    for (const rear of BOLT_POSITIONS) {
      const camber = -1.5 + (front * 0.05) + (rear * 0.03) + wheelBias;
      const caster = 4.25 + (Math.abs(front) * 0.08) - (Math.abs(rear) * 0.03) + (wheelBias * 0.3);
      const sweepDelta = Math.max(0.1, caster / 1.462);
      const neg20 = camber - (sweepDelta / 2);
      const pos20 = camber + (sweepDelta / 2);
      grid[front][rear] = {
        zero: camber.toString(),
        neg20: neg20.toString(),
        pos20: pos20.toString(),
      };
    }
  }
  return grid;
}

async function setWheelGridData(page, wheel, gridData) {
  await page.evaluate((wheelId, grid) => {
    const key = `mx5-nc1-alignment-${wheelId}`;
    localStorage.setItem(key, JSON.stringify(grid));
  }, wheel, gridData);
}

async function setWheelToeData(page, wheel, toeValue) {
  await page.evaluate((wheelId, toe) => {
    const key = `mx5-nc1-alignment-toe-${wheelId}`;
    localStorage.setItem(key, JSON.stringify(toe));
  }, wheel, toeValue);
}

async function navigateTo(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  Rear Axle Symmetry & Rear-Only Report Tests               ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await waitForServer(BASE_URL);
    await page.setDefaultTimeout(10000);

    // Grid data: All 4 wheels with minimal grid entries (1 bolt position each)
    const gridData = {
      FL: { '0': { '0': { neg20: '0.08', zero: '-1.05', pos20: '-3.25' } } },
      FR: { '0': { '0': { neg20: '0.12', zero: '-1.10', pos20: '-3.18' } } },
      RL: { '0': { '0': { neg20: '0.05', zero: '-1.05', pos20: '-3.20' } } },
      RR: { '0': { '0': { neg20: '0.08', zero: '-1.08', pos20: '-3.22' } } }
    };

    // Toe data: Rear wheels with matching toe (within ±0.10 mm tolerance)
    const toeData = {
      FL: 0.55,
      FR: 0.56,
      RL: 0.60,
      RR: 0.61
    };

    log(colors.yellow, '📊 Loading wheel grid data...\n');

    await navigateTo(page, '/input.html');
    log(colors.green, '✓ Input page loaded');

    for (const [wheel, grid] of Object.entries(gridData)) {
      await setWheelGridData(page, wheel, grid);
      log(colors.green, `✓ Set ${wheel} grid data`);
    }

    for (const [wheel, toe] of Object.entries(toeData)) {
      await setWheelToeData(page, wheel, toe);
      log(colors.green, `✓ Set ${wheel} toe data (${toe} mm)`);
    }

    await navigateTo(page, '/input.html');
    log(colors.green, '✓ Data persisted\n');

    // TEST 1: Rear symmetry section exists
    log(colors.cyan, '┌─ TEST 1: Rear symmetry section exists ─────────────────┐');
    await navigateTo(page, '/report.html');

    const hasRearHeading = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h3')).some(h => h.textContent.includes('Rear'));
    });
    assert(hasRearHeading, 'Rear Axle heading found');

    // TEST 2: Symmetry consolidation tables exist (2 total: front + rear)
    log(colors.cyan, '┌─ TEST 2: Both front and rear tables present ─────────────┐');
    const tableCount = await page.evaluate(() => {
      return document.querySelectorAll('.symmetry-consolidation-table').length;
    });
    assert(tableCount >= 2, `Found ≥2 consolidation tables (found ${tableCount})`);

    // TEST 3: Rear table has RL/RR bolt columns
    log(colors.cyan, '┌─ TEST 3: Rear table has RL/RR columns ────────────────────┐');
    const rearTableStructure = await page.evaluate(() => {
      const tables = document.querySelectorAll('.symmetry-consolidation-table');
      if (tables.length < 2) return null;
      const rearTable = tables[1];
      const headers = Array.from(rearTable.querySelectorAll('thead th')).map(th => th.textContent.trim());
      return {
        hasRL: headers.some(h => h.includes('RL')),
        hasRR: headers.some(h => h.includes('RR')),
      };
    });
    assert(rearTableStructure?.hasRL, 'Rear table has RL column');
    assert(rearTableStructure?.hasRR, 'Rear table has RR column');

    // TEST 4: Rear status indicator shows result
    log(colors.cyan, '┌─ TEST 4: Rear camber status indicator present ──────────┐');
    const rearStatus = await page.evaluate(() => {
      const divs = document.querySelectorAll('div');
      for (const div of divs) {
        const text = div.textContent;
        if (text.includes('Rear') && (text.includes('Match') || text.includes('Approximation'))) {
          return true;
        }
      }
      return false;
    });
    assert(rearStatus, 'Rear status indicator found');

    // TEST 5: Bolt positions displayed
    log(colors.cyan, '┌─ TEST 5: Rear bolt positions displayed ──────────────────┐');
    const hasBoltPositions = await page.evaluate(() => {
      const tables = document.querySelectorAll('.symmetry-consolidation-table');
      if (tables.length < 2) return false;
      const rearTable = tables[1];
      const text = rearTable.textContent;
      return text.includes('F:') && text.includes('R:');
    });
    assert(hasBoltPositions, 'Rear bolt positions (F:/R: format) displayed');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION: Rear-only report (from report-rear-axle-validation.mjs)
    // ═══════════════════════════════════════════════════════════════════════
    log(colors.cyan, '\n┌─ SECTION: Rear-Only Report ────────────────────────────────┐');

    const rlGrid = buildRearStorageGrid(0);
    const rrGrid = buildRearStorageGrid(0.06);

    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'networkidle2' });
    await page.evaluate((rl, rr) => {
      localStorage.clear();
      localStorage.setItem('mx5-nc1-alignment-RL', JSON.stringify(rl));
      localStorage.setItem('mx5-nc1-alignment-RR', JSON.stringify(rr));
    }, rlGrid, rrGrid);

    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#section-table', { visible: true });

    const visibleTableTabs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#table-wheel-tabs button'))
        .filter(btn => getComputedStyle(btn).display !== 'none')
        .map(btn => btn.dataset.wheel)
    );
    assert(JSON.stringify(visibleTableTabs) === JSON.stringify(['RL', 'RR']), `Rear-only: visible tabs are RL,RR (got ${visibleTableTabs.join(',')})`);

    await page.click('#tab-chart-rl');
    await page.waitForTimeout(300);

    const chartState = await page.evaluate(() => {
      const debug = window.__alignmentChartDebug;
      return {
        wheel: debug?.wheel,
        targetCamber: debug?.targetCamber,
        targetCaster: debug?.targetCaster,
        chartNoteCamber: document.getElementById('chart-note-camber')?.textContent?.trim(),
        chartNoteCaster: document.getElementById('chart-note-caster')?.textContent?.trim(),
      };
    });
    assert(chartState.wheel === 'RL', `Rear-only: RL chart active (got ${chartState.wheel})`);
    assert(chartState.targetCamber === -1.5, `Rear-only: targetCamber = -1.5 (got ${chartState.targetCamber})`);
    assert(chartState.targetCaster === null, `Rear-only: no caster target (got ${chartState.targetCaster})`);
    assert(chartState.chartNoteCamber === 'Camber -1.5°', `Rear-only: camber note correct (got ${chartState.chartNoteCamber})`);
    assert(chartState.chartNoteCaster?.startsWith('Toe '), `Rear-only: caster note starts with Toe (got ${chartState.chartNoteCaster})`);

    const rearSymmetry = await page.evaluate(() => {
      const text = document.getElementById('symmetry-container')?.textContent ?? '';
      return {
        hasRearHeading: text.includes('Rear Axle (RL ↔ RR)'),
        hasRL: text.includes('RL'),
        hasRR: text.includes('RR'),
      };
    });
    assert(rearSymmetry.hasRearHeading, 'Rear-only: symmetry panel shows Rear Axle (RL ↔ RR)');
    assert(rearSymmetry.hasRL && rearSymmetry.hasRR, 'Rear-only: symmetry panel shows RL and RR');

    const rearWasherState = await page.evaluate(() => {
      const sectionTitles = Array.from(document.querySelectorAll('.washer-section-title')).map(el => el.textContent.trim());
      return { sectionTitles };
    });
    assert(rearWasherState.sectionTitles.includes('Rear Wheels (RL / RR)'), 'Rear-only: washer section title present');

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
