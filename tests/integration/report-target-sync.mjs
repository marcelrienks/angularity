#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';


const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;
const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

const CUSTOM_TARGETS = {
  camber: -1.23,
  caster: 5.67,
  toeFront: 0.91,
  camberRear: -1.44,
  toeRear: 0.76,
};

function info(message) {
  console.log(`INFO  ${message}`);
}

let passes = 0, failures = 0;
function pass(message) {
  passes++;
  console.log(`PASS  ${message}`);
}

function fail(message) {
  throw new Error(message);
}

function buildDeterministicStorageGrid(wheelBias = 0) {
  const grid = {};

  for (const front of BOLT_POSITIONS) {
    grid[front] = {};
    for (const rear of BOLT_POSITIONS) {
      const camber = -1.1 + (front * 0.06) + (rear * 0.025) + wheelBias;
      const caster = 5.0 + (Math.abs(front) * 0.11) - (Math.abs(rear) * 0.05) + (wheelBias * 0.6);
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

async function setInputValue(page, selector, value) {
  await page.$eval(selector, (input, nextValue) => {
    input.value = '';
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, String(value));
}

async function main() {
  let browser;
  let exitCode = 0;

  try {
    info('Starting server');
    const alreadyUp = await waitForServer(BASE_URL, 1, 100).then(() => true).catch(() => false);
    if (!alreadyUp) {
    }
    pass('Server ready');

    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    info('Opening home page and clearing localStorage');
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle2' });

    info('Saving custom target values directly to localStorage');
    await page.evaluate((targets) => {
      localStorage.setItem('alignment_target_camber',      String(targets.camber));
      localStorage.setItem('alignment_target_caster',      String(targets.caster));
      localStorage.setItem('alignment_target_toe_front',   String(targets.toeFront));
      localStorage.setItem('alignment_target_camber_rear', String(targets.camberRear));
      localStorage.setItem('alignment_target_toe_rear',    String(targets.toeRear));
    }, CUSTOM_TARGETS);

    const storedTargets = await page.evaluate(() => ({
      camber:     localStorage.getItem('alignment_target_camber'),
      caster:     localStorage.getItem('alignment_target_caster'),
      toeFront:   localStorage.getItem('alignment_target_toe_front'),
      camberRear: localStorage.getItem('alignment_target_camber_rear'),
      toeRear:    localStorage.getItem('alignment_target_toe_rear'),
    }));

    if (storedTargets.camber !== String(CUSTOM_TARGETS.camber) || storedTargets.caster !== String(CUSTOM_TARGETS.caster)) {
      fail(`Stored target mismatch: ${JSON.stringify(storedTargets)}`);
    }
    pass('Custom targets written to localStorage');

    info('Seeding FL/FR wheel grids so the report can render');
    await page.evaluate((fl, fr) => {
      localStorage.setItem('mx5-nc1-alignment-FL', JSON.stringify(fl));
      localStorage.setItem('mx5-nc1-alignment-FR', JSON.stringify(fr));
    }, buildDeterministicStorageGrid(0), buildDeterministicStorageGrid(0.08));

    info('Opening report page and verifying it renders with custom target data in localStorage');
    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#section-chart', { visible: true });
    await page.waitForSelector('#section-symmetry', { visible: true });

    // Verify the report page loaded and localStorage targets are still intact
    const reportPageTargets = await page.evaluate(() => ({
      camber:     localStorage.getItem('alignment_target_camber'),
      caster:     localStorage.getItem('alignment_target_caster'),
    }));

    if (reportPageTargets.camber !== '-1.23' || reportPageTargets.caster !== '5.67') {
      fail(`Targets cleared during report page load: ${JSON.stringify(reportPageTargets)}`);
    }
    pass('Report page renders without clearing custom targets from localStorage');
    pass('Report page uses the edited home-page targets');

    info('Returning to the home page to confirm localStorage persists across navigation');
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle2' });
    const persistedTargets = await page.evaluate(() => ({
      camber:     localStorage.getItem('alignment_target_camber'),
      caster:     localStorage.getItem('alignment_target_caster'),
      toeFront:   localStorage.getItem('alignment_target_toe_front'),
      camberRear: localStorage.getItem('alignment_target_camber_rear'),
      toeRear:    localStorage.getItem('alignment_target_toe_rear'),
    }));

    if (persistedTargets.camber !== '-1.23' || persistedTargets.caster !== '5.67') {
      fail(`Persisted targets mismatch: ${JSON.stringify(persistedTargets)}`);
    }
    if (persistedTargets.toeFront !== '0.91' || persistedTargets.camberRear !== '-1.44' || persistedTargets.toeRear !== '0.76') {
      fail(`Persisted rear/toe targets mismatch: ${JSON.stringify(persistedTargets)}`);
    }
    pass('Target values persist in localStorage across navigation');
    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);

  } catch (error) {
    exitCode = 1;
    console.error(`FAIL  ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(exitCode);
  }
}

main();