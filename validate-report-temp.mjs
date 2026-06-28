#!/usr/bin/env node
/**
 * Full report validation: loads sample data, screenshots, validates all values.
 */

import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = '/Users/marcel.rienks/Workspaces/personal/angularity';
const SCREENSHOT_DIR = __dirname;

// ── Colours ────────────────────────────────────────────────────────────────
const G = s => `\x1b[32m${s}\x1b[0m`;
const R = s => `\x1b[31m${s}\x1b[0m`;
const Y = s => `\x1b[33m${s}\x1b[0m`;
const C = s => `\x1b[36m${s}\x1b[0m`;
const B = s => `\x1b[1m${s}\x1b[0m`;

let passes = 0, failures = 0, warnings = 0;
const issues = [];

function pass(msg) { passes++; console.log(G(`  ✓ ${msg}`)); }
function fail(msg) { failures++; issues.push(msg); console.log(R(`  ✗ FAIL: ${msg}`)); }
function warn(msg) { warnings++; console.log(Y(`  ⚠ WARN: ${msg}`)); }
function info(msg) { console.log(C(`  → ${msg}`)); }
function section(t) { console.log(`\n${B('═'.repeat(70))}\n${B(t)}\n${'═'.repeat(70)}`); }

function approx(a, b, tol = 0.02) { return Math.abs(a - b) <= tol; }

// ── Minimal static server ───────────────────────────────────────────────────
function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = path.join(SITE_DIR, req.url === '/' ? '/site/input.html' : req.url);
      // strip query strings
      filePath = filePath.split('?')[0];
      if (!existsSync(filePath)) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(filePath);
      const types = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
      res.end(readFileSync(filePath));
    });
    server.listen(0, () => {
      const port = server.address().port;
      console.log(C(`  → Dev server on port ${port}`));
      resolve({ server, port });
    });
  });
}

// ── Physics: compute camber/caster from bolt positions ──────────────────────
// MX5 NC1 eccentric bolt model (from report-engine.js)
const CASTER_MULTIPLIER = 1.462;
function computeFromBolts(camberBolt, casterBolt) {
  // Simplified linear model used by the engine
  // camber = base + camberBolt * camberSensitivity
  // caster = base + casterBolt * casterSensitivity
  // These are measured values from the grid data, not a formula.
  // We validate by checking the displayed value matches the raw grid cell.
  return { camberBolt, casterBolt };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const { server, port } = await startServer();
  const BASE = `http://localhost:${port}`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });

    // Console passthrough
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(R(`  [console.error] ${msg.text()}`));
    });

    // ── 1. Load sample data for all wheels ───────────────────────────────────
    section('STEP 1: Load Sample Data');
    await page.goto(`${BASE}/site/input.html`, { waitUntil: 'networkidle2', timeout: 30000 });

    for (const wheel of ['FL', 'FR', 'RL', 'RR']) {
      // Select wheel tab
      await page.evaluate((w) => {
        const btn = document.querySelector(`button[data-wheel="${w}"]`);
        if (btn) btn.click();
      }, wheel);
      await page.waitForTimeout(500);

      // Click "Sample Data" button — opens custom modal (not a browser dialog)
      const sampleBtnFound = await page.evaluate(() => {
        const btn = document.getElementById('btn-sample');
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (!sampleBtnFound) { fail(`btn-sample not found for ${wheel}`); continue; }

      // Wait for modal to appear, then click confirm
      try {
        await page.waitForSelector('#sample-data-modal-confirm', { timeout: 3000 });
        await page.click('#sample-data-modal-confirm');
        await page.waitForTimeout(1500);
        pass(`Sample data loaded for ${wheel}`);
      } catch {
        // Modal may not appear if no data exists yet — try anyway
        warn(`Modal confirm not found for ${wheel}, clicking anyway`);
        await page.waitForTimeout(800);
      }
    }

    // ── 2. Extract raw grid data from localStorage ────────────────────────────
    section('STEP 2: Extract Raw Grid Data');
    const rawGrids = await page.evaluate(() => {
      const grids = {};
      for (const wheel of ['FL', 'FR', 'RL', 'RR']) {
        const key = `mx5-nc1-alignment-${wheel}`;
        const raw = localStorage.getItem(key);
        if (raw) grids[wheel] = JSON.parse(raw);
      }
      return grids;
    });

    const BOLT_POSITIONS = [-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6];
    const TARGET_CAMBER = -1.1;
    const TARGET_CASTER = 5.0;

    for (const wheel of ['FL','FR','RL','RR']) {
      if (rawGrids[wheel]) {
        const cellCount = Object.keys(rawGrids[wheel]).reduce((s, f) => s + Object.keys(rawGrids[wheel][f] || {}).length, 0);
        pass(`${wheel}: ${cellCount} grid cells loaded`);
      } else {
        fail(`${wheel}: no grid data in localStorage`);
      }
    }

    // ── 3. Compute expected best values from raw grid data ────────────────────
    section('STEP 3: Compute Expected Best Values');

    function computeExpectedBests(grid, targetCamber, targetCaster) {
      let bestCamberCell = null, bestCamberDelta = Infinity;
      let bestCasterCell = null, bestCasterDelta = Infinity;

      for (const fb of BOLT_POSITIONS) {
        const row = grid[fb] || grid[String(fb)];
        if (!row) continue;
        for (const rb of BOLT_POSITIONS) {
          const cell = row[rb] || row[String(rb)];
          if (!cell) continue;

          // Extract camber and caster
          const zero = cell.zero;
          if (!zero) continue;
          let camber, caster;
          if (typeof zero === 'object') {
            camber = zero.camber ?? zero.camberAngle;
            caster = zero.steering ?? zero.casterAngle;
            // caster computed from steering angles
            if (caster === undefined && cell.neg20 !== undefined && cell.pos20 !== undefined) {
              const neg = typeof cell.neg20 === 'object' ? cell.neg20.camber : cell.neg20;
              const pos = typeof cell.pos20 === 'object' ? cell.pos20.camber : cell.pos20;
              caster = (pos - neg) * CASTER_MULTIPLIER;
            }
          } else {
            // old format: zero is camber string, compute caster from neg20/pos20
            camber = parseFloat(zero);
            const neg = typeof cell.neg20 === 'object' ? cell.neg20 : parseFloat(cell.neg20);
            const pos = typeof cell.pos20 === 'object' ? cell.pos20 : parseFloat(cell.pos20);
            if (!isNaN(neg) && !isNaN(pos)) {
              caster = (pos - neg) * CASTER_MULTIPLIER;
            }
          }

          if (camber === undefined || camber === null || isNaN(Number(camber))) continue;
          if (caster === undefined || caster === null || isNaN(Number(caster))) continue;

          camber = Number(camber);
          caster = Number(caster);

          const camberDelta = Math.abs(camber - targetCamber);
          const casterDelta = Math.abs(caster - targetCaster);

          if (camberDelta < bestCamberDelta) {
            bestCamberDelta = camberDelta;
            bestCamberCell = { camberBolt: Number(fb), casterBolt: Number(rb), camber, caster, delta: camberDelta };
          }
          if (casterDelta < bestCasterDelta) {
            bestCasterDelta = casterDelta;
            bestCasterCell = { camberBolt: Number(fb), casterBolt: Number(rb), camber, caster, delta: casterDelta };
          }
        }
      }
      return { bestCamber: bestCamberCell, bestCaster: bestCasterCell };
    }

    const expected = {};
    for (const wheel of ['FL','FR','RL','RR']) {
      if (!rawGrids[wheel]) continue;
      expected[wheel] = computeExpectedBests(rawGrids[wheel], TARGET_CAMBER, TARGET_CASTER);
      const bc = expected[wheel].bestCamber;
      const bk = expected[wheel].bestCaster;
      if (bc) info(`${wheel} best camber: ${bc.camber.toFixed(2)}° @ (Camber:${bc.camberBolt}, Caster:${bc.casterBolt}), Δ${bc.delta.toFixed(3)}°`);
      if (bk) info(`${wheel} best caster: ${bk.caster.toFixed(2)}° @ (Camber:${bk.camberBolt}, Caster:${bk.casterBolt}), Δ${bk.delta.toFixed(3)}°`);
    }

    // ── 4. Navigate to report ─────────────────────────────────────────────────
    section('STEP 4: Navigate to Report');
    await page.goto(`${BASE}/site/report.html`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(3000);
    pass('Report loaded');

    // ── 5. Full-page screenshots ──────────────────────────────────────────────
    section('STEP 5: Screenshots');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewport({ width: 1400, height: 900 });

    await page.screenshot({ path: `${SCREENSHOT_DIR}/report-full.png`, fullPage: true });
    pass(`Full-page screenshot saved`);

    // Screenshot each named section
    const sectionSelectors = [
      { sel: '.recommended-summary', name: 'recommended-summary' },
      { sel: '.symmetry-analysis-section', name: 'symmetry-analysis' },
      { sel: '.independent-optimizations-section', name: 'independent-opts' },
    ];
    for (const { sel, name } of sectionSelectors) {
      const el = await page.$(sel);
      if (el) {
        await el.screenshot({ path: `${SCREENSHOT_DIR}/shot-${name}.png` });
        pass(`Screenshot: ${name}`);
      } else {
        // fallback: screenshot all h2/section containers
        const allH2s = await page.$$('h2');
        info(`${sel} not found directly, found ${allH2s.length} h2 elements`);
      }
    }

    // Screenshot all top-level report sections by index
    const reportSections = await page.$$('.report-section, section[class]');
    for (let i = 0; i < Math.min(reportSections.length, 10); i++) {
      const cls = await page.evaluate(el => el.className, reportSections[i]);
      await reportSections[i].screenshot({ path: `${SCREENSHOT_DIR}/shot-rsec-${i}.png` }).catch(() => {});
      info(`Section ${i}: ${cls.substring(0, 60)}`);
    }

    // ── 6. Extract displayed values from DOM ──────────────────────────────────
    section('STEP 6: Extract Displayed Values');

    const displayedData = await page.evaluate(() => {
      const result = { independent: {}, symmetry: {} };

      // ── Independent optimization cards ──
      const cards = document.querySelectorAll('.symmetry-card');
      cards.forEach(card => {
        const titleEl = card.querySelector('.title');
        if (!titleEl) return;
        const wheel = titleEl.textContent.trim();

        const scenarios = card.querySelectorAll('.scenario-col');
        const wheelData = {};

        scenarios.forEach(col => {
          const header = col.querySelector('.scenario-header')?.textContent?.trim() || '';
          const rows = col.querySelectorAll('.scenario-table tbody tr');
          const scenario = {};

          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 3) return;
            const metric = cells[0]?.textContent?.trim();
            const bolt = cells[1]?.textContent?.trim();
            const achieved = cells[2]?.textContent?.trim();
            const vsTarget = cells[3]?.textContent?.trim();
            if (metric) scenario[metric] = { bolt, achieved, vsTarget };
          });

          wheelData[header] = scenario;
        });

        result.independent[wheel] = wheelData;
      });

      // ── Recommended Summary ──
      const summaryTables = document.querySelectorAll('.symmetry-consolidation-table');
      summaryTables.forEach((table, i) => {
        const rows = table.querySelectorAll('tbody tr');
        const tableData = {};
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          const metric = cells[0]?.textContent?.trim();
          const compromise = cells[1]?.textContent?.trim();
          const flBolts = cells[2]?.textContent?.trim();
          const frBolts = cells[3]?.textContent?.trim();
          if (metric) tableData[metric] = { compromise, flBolts, frBolts };
        });
        result.symmetry[`table_${i}`] = tableData;
      });

      // ── Status messages ──
      const statusBlocks = document.querySelectorAll('.symmetry-status');
      result.statusMessages = [];
      statusBlocks.forEach(block => {
        const msgs = Array.from(block.querySelectorAll('li, p, .status-message, div'))
          .map(el => el.textContent.trim())
          .filter(t => t.length > 0 && (t.includes('°') || t.includes('match') || t.includes('No ')));
        if (msgs.length) result.statusMessages.push(...msgs);
      });

      return result;
    });

    info('Extracted independent optimization data:');
    for (const [wheel, scenarios] of Object.entries(displayedData.independent)) {
      for (const [scenario, metrics] of Object.entries(scenarios)) {
        for (const [metric, vals] of Object.entries(metrics)) {
          console.log(`    ${wheel} | ${scenario} | ${metric}: bolt=${vals.bolt} achieved=${vals.achieved} vsTarget=${vals.vsTarget}`);
        }
      }
    }

    // ── 7. Validate independent optimization values ───────────────────────────
    section('STEP 7: Validate Independent Optimization Values');

    for (const wheel of ['FL','FR']) {
      if (!expected[wheel]?.bestCamber) continue;
      const exp = expected[wheel];
      const displayed = displayedData.independent[wheel];

      if (!displayed) { fail(`${wheel}: no card found in DOM`); continue; }

      // Find "Optimize Camber" scenario
      const optCamberKey = Object.keys(displayed).find(k => k.toLowerCase().includes('camber'));
      const optCasterKey = Object.keys(displayed).find(k => k.toLowerCase().includes('caster'));

      if (optCamberKey) {
        const sc = displayed[optCamberKey];
        // Check Camber metric in Optimize Camber scenario
        const camberRow = Object.entries(sc).find(([k]) => k.toLowerCase().includes('camber'));
        if (camberRow) {
          const [, vals] = camberRow;
          const displayedBolt = parseInt(vals.bolt?.replace(/[^-\d]/g, ''));
          const displayedAchieved = parseFloat(vals.achieved?.replace('°',''));

          const expBolt = exp.bestCamber.camberBolt;
          const expAchieved = exp.bestCamber.camber;

          if (!isNaN(displayedBolt) && displayedBolt === expBolt) {
            pass(`${wheel} Optimize Camber: camber bolt = ${displayedBolt} ✓`);
          } else {
            fail(`${wheel} Optimize Camber: camber bolt displayed=${displayedBolt} expected=${expBolt}`);
          }

          if (!isNaN(displayedAchieved) && approx(displayedAchieved, expAchieved, 0.05)) {
            pass(`${wheel} Optimize Camber: achieved=${displayedAchieved}° vs expected=${expAchieved.toFixed(2)}° ✓`);
          } else {
            fail(`${wheel} Optimize Camber: achieved=${displayedAchieved}° expected=${expAchieved.toFixed(2)}°`);
          }
        }
      } else {
        warn(`${wheel}: no 'Optimize Camber' scenario found`);
      }

      if (optCasterKey) {
        const sc = displayed[optCasterKey];
        const casterRow = Object.entries(sc).find(([k]) => k.toLowerCase().includes('caster'));
        if (casterRow) {
          const [, vals] = casterRow;
          const displayedAchieved = parseFloat(vals.achieved?.replace('°',''));
          const expAchieved = exp.bestCaster.caster;

          if (!isNaN(displayedAchieved) && approx(displayedAchieved, expAchieved, 0.05)) {
            pass(`${wheel} Optimize Caster: achieved=${displayedAchieved}° vs expected=${expAchieved.toFixed(2)}° ✓`);
          } else {
            fail(`${wheel} Optimize Caster: achieved=${displayedAchieved}° expected=${expAchieved.toFixed(2)}°`);
          }
        }
      }
    }

    // ── 8. Cross-check: FL vs FR data not swapped ─────────────────────────────
    section('STEP 8: Check FL vs FR data not swapped');

    const flCamberDisplay = Object.values(displayedData.independent['FL'] || {})
      .flatMap(s => Object.values(s))
      .find(v => v.achieved?.includes('°'));
    const frCamberDisplay = Object.values(displayedData.independent['FR'] || {})
      .flatMap(s => Object.values(s))
      .find(v => v.achieved?.includes('°'));

    if (flCamberDisplay && frCamberDisplay) {
      // FL and FR should show different data if raw grids differ
      const flExpBestCamber = expected['FL']?.bestCamber?.camber;
      const frExpBestCamber = expected['FR']?.bestCamber?.camber;

      info(`Expected FL best camber: ${flExpBestCamber?.toFixed(2)}°`);
      info(`Expected FR best camber: ${frExpBestCamber?.toFixed(2)}°`);

      // Find first achieved value in each wheel card
      const flDisplayCamberScenario = displayedData.independent['FL'];
      const frDisplayCamberScenario = displayedData.independent['FR'];

      // Check that the camber values in the Optimize Camber scenario match their own expected
      for (const [wheel, expKey] of [['FL', 'FL'], ['FR', 'FR']]) {
        const expVal = expected[expKey]?.bestCamber?.camber;
        const dispScenarios = displayedData.independent[wheel];
        if (!dispScenarios || !expVal) continue;

        for (const [scenName, metrics] of Object.entries(dispScenarios)) {
          if (!scenName.toLowerCase().includes('camber')) continue;
          for (const [mName, mVals] of Object.entries(metrics)) {
            if (!mName.toLowerCase().includes('camber')) continue;
            const dispVal = parseFloat(mVals.achieved?.replace('°',''));
            if (!isNaN(dispVal)) {
              if (approx(dispVal, expVal, 0.05)) {
                pass(`${wheel} Optimize Camber camber value matches own raw data (${dispVal}° ≈ ${expVal.toFixed(2)}°)`);
              } else {
                // Check if it matches the OTHER wheel's data (swap bug)
                const otherWheel = wheel === 'FL' ? 'FR' : 'FL';
                const otherVal = expected[otherWheel]?.bestCamber?.camber;
                if (otherVal && approx(dispVal, otherVal, 0.05)) {
                  fail(`${wheel} card is showing ${otherWheel}'s camber data! (${dispVal}° matches ${otherWheel}'s ${otherVal?.toFixed(2)}° not ${wheel}'s ${expVal.toFixed(2)}°) — DATA SWAP BUG`);
                } else {
                  fail(`${wheel} Optimize Camber: displayed=${dispVal}° expected=${expVal.toFixed(2)}° (neither wheel matches)`);
                }
              }
            }
          }
        }
      }
    }

    // ── 9. Validate Recommended Summary table compromise values ───────────────
    section('STEP 9: Validate Recommended Summary Compromise Values');

    // Compute expected compromise from symmetric pairs
    function findSymmetricPairs(flGrid, frGrid) {
      const TOL = 0.3;
      let bestCamberPair = null, bestCamberScore = Infinity;
      let bestCasterPair = null, bestCasterScore = Infinity;

      for (const fb of BOLT_POSITIONS) {
        const flRow = flGrid[fb] || flGrid[String(fb)];
        if (!flRow) continue;
        for (const rb of BOLT_POSITIONS) {
          const flCell = flRow[rb] || flRow[String(rb)];
          if (!flCell?.zero) continue;
          const flCamber = Number(typeof flCell.zero === 'object' ? flCell.zero.camber : flCell.zero);
          const flCaster = (() => {
            if (typeof flCell.zero === 'object' && flCell.zero.steering !== undefined)
              return Number(flCell.zero.steering);
            const n = typeof flCell.neg20 === 'object' ? flCell.neg20 : parseFloat(flCell.neg20 || 0);
            const p = typeof flCell.pos20 === 'object' ? flCell.pos20 : parseFloat(flCell.pos20 || 0);
            return (Number(p) - Number(n)) * CASTER_MULTIPLIER;
          })();
          if (isNaN(flCamber) || isNaN(flCaster)) continue;

          // Look for matching FR cell
          for (const frb of BOLT_POSITIONS) {
            const frRow = frGrid[frb] || frGrid[String(frb)];
            if (!frRow) continue;
            for (const rrb of BOLT_POSITIONS) {
              const frCell = frRow[rrb] || frRow[String(rrb)];
              if (!frCell?.zero) continue;
              const frCamber = Number(typeof frCell.zero === 'object' ? frCell.zero.camber : frCell.zero);
              const frCaster = (() => {
                if (typeof frCell.zero === 'object' && frCell.zero.steering !== undefined)
                  return Number(frCell.zero.steering);
                const n = typeof frCell.neg20 === 'object' ? frCell.neg20 : parseFloat(frCell.neg20 || 0);
                const p = typeof frCell.pos20 === 'object' ? frCell.pos20 : parseFloat(frCell.pos20 || 0);
                return (Number(p) - Number(n)) * CASTER_MULTIPLIER;
              })();
              if (isNaN(frCamber) || isNaN(frCaster)) continue;

              if (Math.abs(flCamber - frCamber) <= TOL) {
                const score = Math.abs(flCamber - TARGET_CAMBER) + Math.abs(frCamber - TARGET_CAMBER);
                if (score < bestCamberScore) {
                  bestCamberScore = score;
                  bestCamberPair = { flCamber, frCamber, flCaster, frCaster,
                    flBolts: {camber: Number(fb), caster: Number(rb)},
                    frBolts: {camber: Number(frb), caster: Number(rrb)} };
                }
              }
              if (Math.abs(flCaster - frCaster) <= TOL) {
                const score = Math.abs(flCaster - TARGET_CASTER) + Math.abs(frCaster - TARGET_CASTER);
                if (score < bestCasterScore) {
                  bestCasterScore = score;
                  bestCasterPair = { flCamber, frCamber, flCaster, frCaster,
                    flBolts: {camber: Number(fb), caster: Number(rb)},
                    frBolts: {camber: Number(frb), caster: Number(rrb)} };
                }
              }
            }
          }
        }
      }
      return { camberPair: bestCamberPair, casterPair: bestCasterPair };
    }

    if (rawGrids['FL'] && rawGrids['FR']) {
      const { camberPair, casterPair } = findSymmetricPairs(rawGrids['FL'], rawGrids['FR']);

      if (camberPair) {
        const expCamberCompromise = (camberPair.flCamber + camberPair.frCamber) / 2;
        info(`Expected camber compromise: FL=${camberPair.flCamber.toFixed(2)}° FR=${camberPair.frCamber.toFixed(2)}° avg=${expCamberCompromise.toFixed(2)}°`);
        info(`Expected FL camber bolts: Camber=${camberPair.flBolts.camber}, Caster=${camberPair.flBolts.caster}`);
        info(`Expected FR camber bolts: Camber=${camberPair.frBolts.camber}, Caster=${camberPair.frBolts.caster}`);

        // Find in displayed summary tables
        for (const [tableKey, tableData] of Object.entries(displayedData.symmetry)) {
          const camberRow = Object.entries(tableData).find(([k]) => k.toLowerCase().includes('camber'));
          if (!camberRow) continue;
          const [, rowData] = camberRow;
          const displayedCompromise = parseFloat(rowData.compromise?.replace('°',''));
          if (!isNaN(displayedCompromise)) {
            if (approx(displayedCompromise, expCamberCompromise, 0.05)) {
              pass(`Summary table camber compromise: ${displayedCompromise}° ≈ expected ${expCamberCompromise.toFixed(2)}° ✓`);
            } else {
              fail(`Summary table camber compromise: displayed=${displayedCompromise}° expected=${expCamberCompromise.toFixed(2)}°`);
            }
          }
        }
      }

      if (casterPair) {
        const expCasterCompromise = (casterPair.flCaster + casterPair.frCaster) / 2;
        info(`Expected caster compromise: FL=${casterPair.flCaster.toFixed(2)}° FR=${casterPair.frCaster.toFixed(2)}° avg=${expCasterCompromise.toFixed(2)}°`);
      }
    }

    // ── 10. Status message vs table consistency ───────────────────────────────
    section('STEP 10: Status Message vs Table Consistency');

    const statusData = await page.evaluate(() => {
      const results = [];
      const statusBlocks = document.querySelectorAll('.symmetry-status');
      statusBlocks.forEach(block => {
        const lines = Array.from(block.querySelectorAll('li, div, p'))
          .map(el => el.textContent?.trim())
          .filter(t => t && t.includes('°'));
        results.push(...lines);
      });
      return results;
    });

    info(`Status messages found: ${statusData.length}`);
    statusData.forEach(msg => info(`  "${msg}"`));

    // Find summary tables and verify status values match
    const summaryTableValues = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll('.symmetry-consolidation-table tbody tr').forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length >= 2) {
          data.push({
            metric: cells[0]?.textContent?.trim(),
            compromise: cells[1]?.textContent?.trim(),
          });
        }
      });
      return data;
    });

    info('Summary table compromise values:');
    summaryTableValues.forEach(r => info(`  ${r.metric}: ${r.compromise}`));

    // For each status message containing a degree value, verify it matches the table
    for (const msg of statusData) {
      const degMatch = msg.match(/([-+]?\d+\.\d+)°/);
      if (!degMatch) continue;
      const statusVal = parseFloat(degMatch[1]);
      const isMatch = summaryTableValues.some(r => {
        const tableVal = parseFloat(r.compromise?.replace('°',''));
        return approx(statusVal, tableVal, 0.02);
      });
      if (isMatch) {
        pass(`Status value ${statusVal}° matches summary table ✓`);
      } else {
        fail(`Status value ${statusVal}° has NO match in summary table — inconsistency!`);
        info(`  Table values: ${summaryTableValues.map(r => r.compromise).join(', ')}`);
      }
    }

    // ── Final summary ─────────────────────────────────────────────────────────
    section('VALIDATION SUMMARY');
    console.log(`  Passes:   ${G(String(passes))}`);
    console.log(`  Failures: ${failures > 0 ? R(String(failures)) : G('0')}`);
    console.log(`  Warnings: ${warnings > 0 ? Y(String(warnings)) : '0'}`);

    if (issues.length) {
      console.log(`\n${R('Issues found:')}`);
      issues.forEach((iss, i) => console.log(R(`  ${i+1}. ${iss}`)));
    } else {
      console.log(G('\n  All checks passed!'));
    }

    console.log(`\n  Screenshots saved to: ${SCREENSHOT_DIR}/`);

  } finally {
    await browser.close();
    server.close();
    process.exit(failures > 0 ? 1 : 0);
  }
}

main().catch(e => { console.error(R(String(e))); process.exit(1); });
