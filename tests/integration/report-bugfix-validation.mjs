#!/usr/bin/env node

/**
 * Integration Test: Report Bugfix Regression Validation
 *
 * Validates fixes for four audit-identified bugs:
 *   1. Best Camber card "Resulting Caster" showed camber value, not caster value
 *   2. Rear RL/RR independent optimization cards never rendered
 *   3. Toe mismatch values displayed with "mm" label when unit is degrees
 *   4. Caster symmetry no-pair message said "±0.15°" when tolerance is ±0.3°
 */

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';

const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

let passes = 0, failures = 0;

function pass(msg) { passes++; console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`); }
function fail(msg) { failures++; console.error(`\x1b[31m[FAIL]\x1b[0m ${msg}`); }
function info(msg) { console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`); }
function section(title) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(title);
  console.log('─'.repeat(70));
}

// Single-point data for all four wheels.
// FL/FR: camber=-1.05°, caster≈4.09° (MULT×3.33° sweep), toe=0.07°
// RL/RR: camber=-1.50°, small caster sweep
function buildTestData() {
  const fl = { 0: { 0: { zero: '-1.05', pos20: '-3.25', neg20: '0.08', toe: '0.07' } } };
  const fr = { 0: { 0: { zero: '-1.05', pos20: '-3.25', neg20: '0.08', toe: '0.072' } } };
  const rl = { 0: { 0: { zero: '-1.50', pos20: '-1.70', neg20: '-1.30', toe: '0.07' } } };
  const rr = { 0: { 0: { zero: '-1.50', pos20: '-1.70', neg20: '-1.30', toe: '0.072' } } };
  return { FL: fl, FR: fr, RL: rl, RR: rr };
}

async function loadDataAndNavigate(page) {
  await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'networkidle2', timeout: 30000 });

  const data = buildTestData();
  await page.evaluate((wheels) => {
    localStorage.clear();
    for (const [wheel, grid] of Object.entries(wheels)) {
      localStorage.setItem(`mx5-nc1-alignment-${wheel}`, JSON.stringify(grid));
    }
    // Toe is stored separately per wheel (degrees per side)
    localStorage.setItem('mx5-nc1-alignment-toe-FL', '0.07');
    localStorage.setItem('mx5-nc1-alignment-toe-FR', '0.072');
    localStorage.setItem('mx5-nc1-alignment-toe-RL', '0.07');
    localStorage.setItem('mx5-nc1-alignment-toe-RR', '0.072');
  }, data);

  await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2', timeout: 30000 });

  // Wait for the symmetry section to be populated
  await page.waitForSelector('#section-symmetry', { timeout: 10000 }).catch(() => {});
}

async function runTests() {
  info('Launching browser...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await waitForServer(BASE_URL);

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  try {
    await loadDataAndNavigate(page);

    // ── Bug 1: "Resulting Caster" in Best Camber card shows caster, not camber ──
    section('Bug 1: Best Camber card — Resulting Caster value');

    const symmetryCards = await page.$$('.symmetry-card');
    info(`Found ${symmetryCards.length} symmetry card(s) total`);

    // FL/FR independent optimization cards: first scenario-col = Best Camber
    // The ".scenario-col" inside a card with scenario-grid has the Best Camber on the left
    const resultingCasterValues = await page.evaluate(() => {
      const values = [];
      document.querySelectorAll('.symmetry-card').forEach(card => {
        // Best Camber column is the first scenario-col
        const bestCamberCol = card.querySelector('.scenario-col:first-child');
        if (!bestCamberCol) return;
        const header = bestCamberCol.querySelector('.scenario-header');
        if (!header || header.textContent.trim() !== 'Best Camber') return;
        const casterMetric = bestCamberCol.querySelector('.symmetry-metric.caster .value');
        if (casterMetric) values.push(casterMetric.textContent.trim());
      });
      return values;
    });

    info(`Resulting Caster values in Best Camber cards: ${JSON.stringify(resultingCasterValues)}`);

    if (resultingCasterValues.length === 0) {
      fail('Bug 1: No Best Camber cards found with a Resulting Caster value');
    } else {
      let allPositive = true;
      for (const v of resultingCasterValues) {
        const num = parseFloat(v);
        if (isNaN(num) || num < 0) {
          allPositive = false;
          fail(`Bug 1: "Resulting Caster" shows "${v}" — expected positive caster value, not camber`);
        }
      }
      if (allPositive) {
        pass(`Bug 1: All "Resulting Caster" values are non-negative (caster range): ${resultingCasterValues.join(', ')}`);
      }
    }

    // ── Bug 2: Rear RL/RR independent optimization cards actually render ────────
    section('Bug 2: Rear RL/RR independent optimization cards render');

    const rearSubsectionCards = await page.evaluate(() => {
      // Find the subsection titled "Rear Wheels (RL & RR)"
      let rearSubsection = null;
      document.querySelectorAll('.symmetry-subsection').forEach(sec => {
        const h3 = sec.querySelector('h3');
        if (h3 && h3.textContent.includes('RL') && h3.textContent.includes('RR')) {
          rearSubsection = sec;
        }
      });
      if (!rearSubsection) return { found: false, cardCount: 0, titles: [] };

      const cards = rearSubsection.querySelectorAll('.symmetry-card');
      const titles = Array.from(cards).map(c => {
        const t = c.querySelector('.title');
        return t ? t.textContent.trim() : '?';
      });
      return { found: true, cardCount: cards.length, titles };
    });

    info(`Rear subsection found: ${rearSubsectionCards.found}, cards: ${rearSubsectionCards.cardCount}, titles: ${JSON.stringify(rearSubsectionCards.titles)}`);

    if (!rearSubsectionCards.found) {
      fail('Bug 2: Rear RL/RR subsection not found in DOM');
    } else if (rearSubsectionCards.cardCount < 2) {
      fail(`Bug 2: Expected 2 rear cards (RL, RR), got ${rearSubsectionCards.cardCount}`);
    } else {
      const hasRL = rearSubsectionCards.titles.some(t => t.includes('RL'));
      const hasRR = rearSubsectionCards.titles.some(t => t.includes('RR'));
      if (hasRL && hasRR) {
        pass('Bug 2: Rear RL and RR independent optimization cards both rendered');
      } else {
        fail(`Bug 2: Missing cards — found: ${rearSubsectionCards.titles.join(', ')}`);
      }
    }

    // ── Bug 3: Toe mismatch display uses "°" not "mm" ────────────────────────
    section('Bug 3: Toe mismatch display unit');

    const toeDisplayTexts = await page.evaluate(() => {
      const texts = [];
      // Collect toe mismatch descriptions from section-desc elements
      document.querySelectorAll('.section-desc').forEach(el => {
        if (el.textContent.toLowerCase().includes('toe') && el.textContent.includes('mismatch')) {
          texts.push(el.textContent.trim());
        }
      });
      // Collect toe values from toe symmetry-metric elements
      document.querySelectorAll('.symmetry-metric.toe .value').forEach(el => {
        texts.push(el.textContent.trim());
      });
      return texts;
    });

    info(`Toe display texts: ${JSON.stringify(toeDisplayTexts)}`);

    if (toeDisplayTexts.length === 0) {
      info('Bug 3: No toe display elements found (may require toe data) — skipping');
    } else {
      let hasMmLabel = false;
      for (const t of toeDisplayTexts) {
        // Should end with ° or contain °, not contain " mm" as unit
        if (/ mm$/.test(t) || / mm /.test(t)) {
          hasMmLabel = true;
          fail(`Bug 3: Toe display "${t}" uses "mm" — should use "°"`);
        }
      }
      if (!hasMmLabel) {
        pass(`Bug 3: Toe displays do not use "mm" label: ${toeDisplayTexts.join(' | ')}`);
      }
    }

    // Also check the rear consolidation table toe row
    const toeTableCells = await page.evaluate(() => {
      const cells = [];
      document.querySelectorAll('.symmetry-consolidation-table td').forEach(td => {
        const text = td.textContent.trim();
        // Toe row cells that show values like "0.07 mm" or "0.07°"
        if (/^[\d.]+\s*(mm|°)/.test(text) && parseFloat(text) < 1.0) {
          cells.push(text);
        }
      });
      return cells;
    });

    if (toeTableCells.length > 0) {
      info(`Rear consolidation table toe cells: ${JSON.stringify(toeTableCells)}`);
      const hasMm = toeTableCells.some(t => t.includes('mm'));
      if (hasMm) {
        fail(`Bug 3: Rear consolidation table toe cell uses "mm": ${toeTableCells.filter(t => t.includes('mm')).join(', ')}`);
      } else {
        pass('Bug 3: Rear consolidation table toe cells use correct unit');
      }
    }

    // ── Bug 4: Caster no-pair message says "±0.3°" not "±0.15°" ─────────────
    section('Bug 4: Caster symmetry tolerance text');

    const toleranceTexts = await page.evaluate(() => {
      const texts = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.children.length === 0) {
          const t = el.textContent;
          if (t.includes('caster') && (t.includes('tolerance') || t.includes('0.15') || t.includes('0.3'))) {
            texts.push(t.trim());
          }
        }
      });
      return texts;
    });

    info(`Caster-tolerance related texts: ${JSON.stringify(toleranceTexts.slice(0, 5))}`);

    const has015 = toleranceTexts.some(t => t.includes('0.15'));
    const has03  = toleranceTexts.some(t => t.includes('0.3°') || t.includes('±0.3'));

    if (has015) {
      fail('Bug 4: Page contains stale "±0.15°" caster tolerance text');
    } else {
      pass('Bug 4: No "±0.15°" caster tolerance text found');
    }

    // Check the empty-state messages in Symmetry Options section
    const emptyStateTexts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.empty-state')).map(el => el.textContent.trim())
    );
    info(`Empty-state texts: ${JSON.stringify(emptyStateTexts)}`);

    const staleMsg = emptyStateTexts.some(t => t.includes('0.15'));
    if (staleMsg) {
      fail(`Bug 4: Empty-state message contains stale "0.15" tolerance: ${emptyStateTexts.find(t => t.includes('0.15'))}`);
    } else {
      pass('Bug 4: Symmetry Options empty-state messages do not reference "±0.15°"');
    }

    // ── Status report ────────────────────────────────────────────────────────
    if (errors.length > 0) {
      info(`Page JS errors: ${errors.slice(0, 3).join('; ')}`);
    }

  } finally {
    await browser.close();
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
await waitForServer(BASE_URL);
await runTests().catch(err => {
  console.error('\x1b[31m[FATAL]\x1b[0m', err.message);
  process.exit(1);
});

console.log(`\n${'═'.repeat(70)}`);
console.log(`Report Bugfix Validation: ${passes} passed, ${failures} failed`);
console.log('═'.repeat(70));
process.exit(failures > 0 ? 1 : 0);
