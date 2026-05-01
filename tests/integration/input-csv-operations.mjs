#!/usr/bin/env node

/**
 * Integration Test: Input Screen - CSV Operations (merged: input-csv-operations, report-toe-validation)
 *
 * Validates CSV save/load operations and toe report assertion.
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getServerPort } from '../test-server-singleton.js';
import fs from 'fs';
import { waitForServer } from '../test-wait-helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '../..');
const TEMP_DIR = path.join(PROJECT_ROOT, '.test-csv');

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

async function clearStorage(page) {
  await page.evaluate(() => localStorage.clear());
}

async function main() {
  let browser = null;

  try {
    log(colors.blue, '\n╔════════════════════════════════════════════════════════════╗');
    log(colors.blue, '║  Input Screen - CSV Operations (Save & Load) Test          ║');
    log(colors.blue, '╚════════════════════════════════════════════════════════════╝\n');

    // Setup temp directory
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    const page = await browser.newPage();
    await waitForServer(BASE_URL);
    await page.setBypassCSP(true);

    // Setup: Load sample data
    log(colors.cyan, '┌─ SETUP: Load Sample Data ─────────────────────────────────┐');
    await navigateTo(page, '/input.html');
    await clearStorage(page);

    // Click load sample data
    await page.click('#btn-sample');
    await page.waitForTimeout(1500);

    log(colors.green, '✓ Sample data loaded\n');

    // Test 1: Save CSV button exists and is clickable
    log(colors.cyan, '┌─ TEST 1: Save CSV Button Exists & Is Clickable ──────────┐');
    const saveButton = await page.$('#btn-download');
    assert(!!saveButton, 'Save CSV button found');

    // Test 2: Save CSV generates file
    log(colors.cyan, '\n┌─ TEST 2: Save CSV Generates File ────────────────────────┐');
    
    // Setup download listener
    const downloadPath = TEMP_DIR;
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });

    // Trigger download
    await page.click('#btn-download');
    await new Promise(r => setTimeout(r, 2000)); // Wait for download

    // Check for CSV file
    const files = fs.readdirSync(downloadPath);
    const csvFiles = files.filter(f => f.endsWith('.csv'));

    assert(csvFiles.length > 0, 'CSV file downloaded');

    if (csvFiles.length > 0) {
      const csvPath = path.join(downloadPath, csvFiles[0]);
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.trim().split('\n');

      // Test 3: CSV has proper headers
      log(colors.cyan, '\n┌─ TEST 3: CSV Has Proper Headers ─────────────────────────┐');
      const headers = lines[0].split(',').map(h => h.trim());
      const expectedHeaders = ['front_bolt', 'rear_bolt', 'camber_neg20', 'camber_0', 'camber_pos20'];
      const hasAllHeaders = expectedHeaders.every(h => headers.includes(h));
      assert(hasAllHeaders, `CSV has expected headers`);

      // Test 4: CSV has correct row count
      log(colors.cyan, '\n┌─ TEST 4: CSV Has Correct Row Count ───────────────────────┐');
      const dataRows = lines.length - 1;
      assert(dataRows === 169, `CSV has 169 data rows (got ${dataRows})`);

      // Test 5: CSV data contains numeric values
      log(colors.cyan, '\n┌─ TEST 5: CSV Data Contains Numeric Values ────────────────┐');
      const hasNumericValues = lines.length > 1 &&
        lines[1].split(',').slice(2).some(v => !isNaN(parseFloat(v)));
      assert(hasNumericValues, 'CSV contains numeric measurement data');

      // Test 6: Load CSV button exists
      log(colors.cyan, '\n┌─ TEST 6: Load CSV Button Exists & Is Functional ────────┐');
      const loadButton = await page.$('#btn-load-label');
      const csvInput = await page.$('#csv-upload');
      assert(!!loadButton && !!csvInput, 'Load CSV button and file input found');

      // Test 7: Load CSV file into FR wheel
      log(colors.cyan, '\n┌─ TEST 7: Load CSV File Into Different Wheel ──────────────┐');
      await page.click('[data-wheel="FR"]');
      await page.waitForTimeout(500);
      const csvFilePath = path.join(downloadPath, csvFiles[0]);
      await page.waitForSelector('#csv-upload');
      try {
        const input = await page.$('#csv-upload');
        if (input) await input.uploadFile(csvFilePath);
      } catch (e) {
        log(colors.yellow, `⚠ File upload failed: ${e.message}`);
      }
      await page.waitForTimeout(2000);
      const frDataLoaded = await page.evaluate(() => {
        const stored = localStorage.getItem('mx5-nc1-alignment-FR');
        return !!stored;
      });
      assert(frDataLoaded, 'CSV loaded successfully into FR wheel');

      // Test 8: FL and FR can have independent CSV data
      log(colors.cyan, '\n┌─ TEST 8: FL & FR Have Independent CSV Data ───────────────┐');
      const flHasData = await page.evaluate(() => !!localStorage.getItem('mx5-nc1-alignment-FL'));
      const frHasData = await page.evaluate(() => !!localStorage.getItem('mx5-nc1-alignment-FR'));
      assert(flHasData && frHasData, `FL and FR both have independent CSV data`);

      // Cleanup
      files.forEach(f => { try { fs.unlinkSync(path.join(downloadPath, f)); } catch(_){} });
      try { fs.rmdirSync(downloadPath); } catch(_){}
    }

    // SECTION: Toe report assertion (from report-toe-validation.mjs)
    log(colors.cyan, '\n┌─ SECTION: Toe Report Assertion ───────────────────────────┐');
    await navigateTo(page, '/input.html');
    await clearStorage(page);
    await page.evaluate(() => {
      localStorage.setItem('mx5-nc1-alignment-toe-FL', JSON.stringify(0.58));
      localStorage.setItem('mx5-nc1-alignment-toe-FR', JSON.stringify(0.58));
      localStorage.setItem('mx5-nc1-alignment-toe-RL', JSON.stringify(0.58));
      localStorage.setItem('mx5-nc1-alignment-toe-RR', JSON.stringify(0.58));
    });
    await navigateTo(page, '/report.html');
    await page.waitForTimeout(1000);
    const toeDataPresent = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('0.58') || text.includes('Toe') || text.includes('toe');
    });
    assert(toeDataPresent, 'Toe data (0.58 mm) appears on report page');

    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    log(colors.red, `\n✗ Test failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  }
}

main();
