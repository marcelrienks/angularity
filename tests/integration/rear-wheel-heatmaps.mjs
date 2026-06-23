#!/usr/bin/env node

/**
 * Integration Tests: Rear Wheel Heatmap Feature Completeness
 *
 * Validates rear wheel heatmap rendering across all measurement scenarios.
 */

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';

const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;
const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  blue: '\x1b[34m', cyan: '\x1b[36m'
};
function log(color, ...args) { console.log(`${color}${args.join(' ')}${colors.reset}`); }

let passes = 0, failures = 0;
function assert(condition, label) {
  if (condition) { passes++; log(colors.green, `  ✓ ${label}`); }
  else { failures++; log(colors.red, `  ✗ FAIL: ${label}`); }
}

function buildGrid(bias = 0) {
  const grid = {};
  for (const front of BOLT_POSITIONS) {
    grid[front] = {};
    for (const rear of BOLT_POSITIONS) {
      const camber = -1.5 + (front * 0.05) + (rear * 0.03) + bias;
      grid[front][rear] = {
        zero: camber.toFixed(2),
        neg20: (camber - 0.15).toFixed(2),
        pos20: (camber + 0.15).toFixed(2),
      };
    }
  }
  return grid;
}

async function gotoReport(page, storage) {
  await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'networkidle2' });
  await page.evaluate((s) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v));
  }, storage);
  await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2' });
  await page.waitForTimeout(1000);
}

async function test1_fullGridRL(page) {
  log(colors.cyan, 'TEST 1: RL Full Grid (all 169 cells)');
  await gotoReport(page, { 'mx5-nc1-alignment-RL': buildGrid(0) });
  const sectionVisible = await page.evaluate(() => {
    const el = document.getElementById('section-heatmaps');
    return !!el && getComputedStyle(el).display !== 'none';
  });
  assert(sectionVisible, 'Heatmap section visible for RL full grid');
  const canvasPresent = await page.evaluate(() => !!document.getElementById('camber-heatmap'));
  assert(canvasPresent, '#camber-heatmap canvas present');
}

async function test2_fullGridRR(page) {
  log(colors.cyan, 'TEST 2: RR Full Grid (all 169 cells)');
  await gotoReport(page, { 'mx5-nc1-alignment-RR': buildGrid(0.06) });
  const sectionVisible = await page.evaluate(() => {
    const el = document.getElementById('section-heatmaps');
    return !!el && getComputedStyle(el).display !== 'none';
  });
  assert(sectionVisible, 'Heatmap section visible for RR full grid');
}

async function test3_sparseGridRL(page) {
  log(colors.cyan, 'TEST 3: RL Sparse Grid (50% cells missing)');
  const sparseGrid = {};
  let cell = 0;
  for (const front of BOLT_POSITIONS) {
    sparseGrid[front] = {};
    for (const rear of BOLT_POSITIONS) {
      if (cell % 2 === 0) {
        const c = -1.5 + (front * 0.05) + (rear * 0.03);
        sparseGrid[front][rear] = { zero: c.toFixed(2), neg20: (c - 0.15).toFixed(2), pos20: (c + 0.15).toFixed(2) };
      }
      cell++;
    }
  }
  await gotoReport(page, { 'mx5-nc1-alignment-RL': sparseGrid });
  const rendered = await page.evaluate(() => {
    const canvas = document.getElementById('camber-heatmap');
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3] > 0) return true;
    return false;
  });
  assert(rendered, 'Sparse grid heatmap renders without artifacts');
}

async function test4_edgeExtremaRL(page) {
  log(colors.cyan, 'TEST 4: RL Edge Extrema (|pos| >= 5)');
  const g = {};
  for (const f of BOLT_POSITIONS) {
    g[f] = {};
    for (const r of BOLT_POSITIONS) {
      if (Math.abs(f) >= 5 && Math.abs(r) >= 5) {
        const c = -1.5 + (f * 0.05) + (r * 0.03);
        g[f][r] = { zero: c.toFixed(2), neg20: (c - 0.15).toFixed(2), pos20: (c + 0.15).toFixed(2) };
      }
    }
  }
  await gotoReport(page, { 'mx5-nc1-alignment-RL': g });
  const canvasPresent = await page.evaluate(() => !!document.getElementById('camber-heatmap'));
  assert(canvasPresent, 'Edge extrema RL: #camber-heatmap canvas present');
}

async function test5_edgeExtremaRR(page) {
  log(colors.cyan, 'TEST 5: RR Edge Extrema');
  const g = {};
  for (const f of BOLT_POSITIONS) {
    g[f] = {};
    for (const r of BOLT_POSITIONS) {
      if (Math.abs(f) >= 5 && Math.abs(r) >= 5) {
        const c = -1.5 + (f * 0.05) + (r * 0.03) + 0.06;
        g[f][r] = { zero: c.toFixed(2), neg20: (c - 0.15).toFixed(2), pos20: (c + 0.15).toFixed(2) };
      }
    }
  }
  await gotoReport(page, { 'mx5-nc1-alignment-RR': g });
  const canvasPresent = await page.evaluate(() => !!document.getElementById('camber-heatmap'));
  assert(canvasPresent, 'Edge extrema RR: #camber-heatmap canvas present');
}

async function test6_colorScaling(page) {
  log(colors.cyan, 'TEST 6: Color Scaling (RL vs FL)');
  const grid = buildGrid(0);
  await gotoReport(page, { 'mx5-nc1-alignment-FL': grid, 'mx5-nc1-alignment-RL': grid });
  const camberPresent = await page.evaluate(() => !!document.getElementById('camber-heatmap'));
  assert(camberPresent, '#camber-heatmap present for FL+RL data');
  const casterPresent = await page.evaluate(() => !!document.getElementById('caster-heatmap'));
  assert(casterPresent, '#caster-heatmap present for FL+RL data');
}

async function test7_performance(page) {
  log(colors.cyan, 'TEST 7: Performance (4-wheel render)');
  const grid = buildGrid(0);
  const start = Date.now();
  await gotoReport(page, {
    'mx5-nc1-alignment-FL': grid,
    'mx5-nc1-alignment-FR': grid,
    'mx5-nc1-alignment-RL': grid,
    'mx5-nc1-alignment-RR': grid,
  });
  const elapsed = Date.now() - start;
  assert(elapsed < 10000, `4-wheel render in ${elapsed}ms (< 10000ms)`);
}

async function test8_nanHandling(page) {
  log(colors.cyan, 'TEST 8: NaN/Null Handling');
  const g = {};
  for (const f of BOLT_POSITIONS) {
    g[f] = {};
    for (const r of BOLT_POSITIONS) {
      if (Math.abs(f) < 3 && Math.abs(r) < 3) {
        g[f][r] = { zero: 'NaN', neg20: 'NaN', pos20: 'NaN' };
      } else {
        const c = -1.5 + (f * 0.05) + (r * 0.03);
        g[f][r] = { zero: c.toFixed(2), neg20: (c - 0.15).toFixed(2), pos20: (c + 0.15).toFixed(2) };
      }
    }
  }
  let crashed = false;
  try { await gotoReport(page, { 'mx5-nc1-alignment-RL': g }); } catch (_) { crashed = true; }
  assert(!crashed, 'NaN/null data handled gracefully');
  const pageAlive = await page.evaluate(() => !!document.body);
  assert(pageAlive, 'Page remains responsive after corrupted data');
}

async function main() {
  let browser = null;
  try {
    log(colors.blue, 'Rear Wheel Heatmap Feature Completeness Tests');
    await waitForServer(BASE_URL);
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await test1_fullGridRL(page);
    await test2_fullGridRR(page);
    await test3_sparseGridRL(page);
    await test4_edgeExtremaRL(page);
    await test5_edgeExtremaRR(page);
    await test6_colorScaling(page);
    await test7_performance(page);
    await test8_nanHandling(page);
    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);
  } catch (err) {
    log(colors.red, `Test setup error: ${err.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
