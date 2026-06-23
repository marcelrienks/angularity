/**
 * e2e-data-integrity.mjs — Full end-to-end data integrity integration test.
 *
 * Scenario: home → input → report (sections A–E)
 *   Section A: Setup — inject fixture data into localStorage
 *   Section B: Home page — title, nav links, target values present (US1)
 *   Section C: Input page — grid DOM reflects injected fixture values (US2)
 *   Section D: Report raw data table — all 169 cells match fixture exactly (US3)
 *   Section E: Report chart — boundary/midpoint values, targets, cross-wheel uniqueness (US4)
 *   Section F: Report washer diagrams — position texts match optimal bolt settings (US5)
 *
 * Success criteria: SC-001 through SC-005, SC-007, SC-008 (spec.md)
 * Expected assertions: ~6 (home) + 48 (input) + 676 (table) + 48 (chart) + 8 (washer) ≈ 786
 */

import puppeteer from 'puppeteer';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';

// ── Constants ────────────────────────────────────────────────────────────

const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const CASTER_MULTIPLIER = 1.462;
const WHEELS = ['FL', 'FR', 'RL', 'RR'];
const TOLERANCE_RAW   = 0;      // exact string match at 2 d.p.
const TOLERANCE_CHART = 0.05;   // ±0.05° for chart aggregation spread

const PORT = await getServerPort();
const BASE_URL = `http://localhost:${PORT}`;

// ── Pass/fail tracking ───────────────────────────────────────────────────

let passes   = 0;
let failures = 0;

function assert(condition, label) {
  if (condition) {
    passes++;
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function approxEqual(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

// ── Wheel parameter formula (mirrors compute-e2e-optima.mjs) ────────────

const WHEEL_PARAMS = {
  FL: {
    camberCorners:   { LL: -0.70, LR: -0.85, HL: -1.35, HR: -1.50 },
    camberBulgeSign: +1, camberCurvature: 0.60,
    spreadCorners:   { LL: 3.15, LR: 3.69, HL: 3.15, HR: 3.15 },
    spreadBulgeSign: -1, spreadCurvature: 0.30,
  },
  FR: {
    camberCorners:   { LL: -0.60, LR: -0.75, HL: -1.25, HR: -1.40 },
    camberBulgeSign: -1, camberCurvature: 0.60,
    spreadCorners:   { LL: 3.22, LR: 3.63, HL: 3.22, HR: 3.22 },
    spreadBulgeSign: +1, spreadCurvature: 0.30,
  },
  RL: {
    camberCorners:   { LL: -1.40, LR: -1.56, HL: -2.04, HR: -2.20 },
    camberBulgeSign: +1, camberCurvature: 0.60,
    spreadCorners:   { LL: 0, LR: 0, HL: 0, HR: 0 },
    spreadBulgeSign:  0, spreadCurvature: 0,
  },
  RR: {
    camberCorners:   { LL: -1.30, LR: -1.46, HL: -1.94, HR: -2.10 },
    camberBulgeSign: -1, camberCurvature: 0.60,
    spreadCorners:   { LL: 0, LR: 0, HL: 0, HR: 0 },
    spreadBulgeSign:  0, spreadCurvature: 0,
  },
};

function generateCell(wheel, frontBolt, rearBolt) {
  const nf = (frontBolt + 6) / 12;
  const nr = (rearBolt  + 6) / 12;
  const { camberCorners, camberBulgeSign, camberCurvature,
          spreadCorners, spreadBulgeSign, spreadCurvature } = WHEEL_PARAMS[wheel];

  function bilinear(corners) {
    return corners.LL * (1 - nf) * (1 - nr)
         + corners.LR * (1 - nf) * nr
         + corners.HL * nf       * (1 - nr)
         + corners.HR * nf       * nr;
  }
  function crossTerm(curvature, bulgeSign) {
    return bulgeSign * curvature * nf * (1 - nf) * nr * (1 - nr) * 4;
  }

  const camberBase = bilinear(camberCorners) + crossTerm(camberCurvature, camberBulgeSign);
  const spreadBase = bilinear(spreadCorners) + crossTerm(spreadCurvature, spreadBulgeSign);
  const isRear = wheel === 'RL' || wheel === 'RR';
  const spread = isRear ? 0 : spreadBase;

  return {
    neg20: (camberBase - spread / 2).toFixed(2),
    zero:   camberBase.toFixed(2),
    pos20: (camberBase + spread / 2).toFixed(2),
  };
}

function buildGridData(wheel) {
  const gridData = {};
  for (const f of BOLT_POSITIONS) {
    gridData[String(f)] = {};
    for (const r of BOLT_POSITIONS) {
      gridData[String(f)][String(r)] = generateCell(wheel, f, r);
    }
  }
  return gridData;
}

// Pre-build gridData for all wheels at module load time (deterministic)
const GRID_DATA = Object.fromEntries(WHEELS.map(w => [w, buildGridData(w)]));

// ── FIXTURE ──────────────────────────────────────────────────────────────
// Pre-computed expected values (derived from compute-e2e-optima.mjs output, T004).
// Chart boundary values use rearBolt=0 row per frontBolt (_aggregateByFrontBolt pattern).

const FIXTURE = {
  FL: {
    wheel: 'FL', axle: 'front',
    gridData: GRID_DATA.FL,
    toe: null,
    expectedChart: {
      camber: { first: -0.77, mid: -0.95, last: -1.43 },
      caster: { first: 5, mid: 4.693, last: 4.605 },
      targetCamber: -1.1,
      targetCaster: 5,
    },
    expectedOptima: {
      bestCell: { frontBolt: -1, rearBolt: 5 },
      washerPositionTexts: { frontBolt: 'Position: -6', rearBolt: 'Position: +0' },
      rotationAngles: { frontBolt: -90, rearBolt: 0 },
    },
  },
  FR: {
    wheel: 'FR', axle: 'front',
    gridData: GRID_DATA.FR,
    toe: null,
    expectedChart: {
      camber: { first: -0.68, mid: -1.15, last: -1.32 },
      caster: { first: 5.015, mid: 4.971, last: 4.722 },
      targetCamber: -1.1,
      targetCaster: 5,
    },
    expectedOptima: {
      bestCell: { frontBolt: -1, rearBolt: 1 },
      washerPositionTexts: { frontBolt: 'Position: +0', rearBolt: 'Position: +2' },
      rotationAngles: { frontBolt: 0, rearBolt: 30 },
    },
  },
  RL: {
    wheel: 'RL', axle: 'rear',
    gridData: GRID_DATA.RL,
    toe: 0.12,
    expectedChart: {
      camber: { first: -1.48, mid: -1.65, last: -2.12 },
      caster: null,
      targetCamber: -1.5,
      targetCaster: null,
    },
    expectedOptima: {
      bestCell: { frontBolt: -5, rearBolt: 1 },
      washerPositionTexts: { frontBolt: 'Position: -5', rearBolt: 'Position: +1' },
      rotationAngles: { frontBolt: -75, rearBolt: 15 },
    },
  },
  RR: {
    wheel: 'RR', axle: 'rear',
    gridData: GRID_DATA.RR,
    toe: 0.14,
    expectedChart: {
      camber: { first: -1.38, mid: -1.85, last: -2.02 },
      caster: null,
      targetCamber: -1.5,
      targetCaster: null,
    },
    expectedOptima: {
      bestCell: { frontBolt: -5, rearBolt: 2 },
      washerPositionTexts: { frontBolt: 'Position: -5', rearBolt: 'Position: +2' },
      rotationAngles: { frontBolt: -75, rearBolt: 30 },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────

async function setWheelData(page, wheel, gridData) {
  await page.evaluate((wheelId, wheelData) => {
    localStorage.setItem(`mx5-nc1-alignment-${wheelId}`, JSON.stringify(wheelData));
  }, wheel, gridData);
}

async function setToeData(page, wheel, toe) {
  await page.evaluate((wheelId, toeVal) => {
    localStorage.setItem(`mx5-nc1-alignment-toe-${wheelId}`, String(toeVal));
  }, wheel, toe);
}

// ── Main test runner ─────────────────────────────────────────────────────

async function main() {
  let browser;

  try {
    // ── Section A: Setup ───────────────────────────────────────────────
    console.log('\n=== Section A: Setup ===');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);

    await waitForServer(BASE_URL);

    // Navigate and clear any prior state
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());

    // Inject fixture data for all wheels
    for (const wheel of WHEELS) {
      await setWheelData(page, wheel, FIXTURE[wheel].gridData);
      if (FIXTURE[wheel].toe != null) {
        await setToeData(page, wheel, FIXTURE[wheel].toe);
      }
    }
    console.log('  Setup complete — fixture data injected for all 4 wheels');

    // ── Section B: Home Page (US1) ─────────────────────────────────────
    console.log('\n=== Section B: Home Page (US1) ===');

    const title = await page.title();
    assert(title.includes('MX5') || title.includes('Alignment'), `Page title contains 'MX5' or 'Alignment': "${title}"`);

    const inputLink = await page.$('a[href*="input"]');
    assert(inputLink !== null, 'Nav link to input.html exists');

    const reportLink = await page.$('a[href*="report"]');
    assert(reportLink !== null, 'Nav link to report.html exists');

    // Target value fields should be visible
    const camberDisplay = await page.$('#camber-display');
    assert(camberDisplay !== null, 'Camber target display element exists');

    const casterDisplay = await page.$('#caster-display');
    assert(casterDisplay !== null, 'Caster target display element exists');

    // ── Section C: Input Page (US2) ─────────────────────────────────────
    console.log('\n=== Section C: Input Page (US2) ===');

    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#wheel-selector', { visible: true });

    const probePositions = [[-6, -6], [0, 0], [6, 6]];

    for (const wheel of WHEELS) {
      await page.click(`#wheel-selector button[data-wheel="${wheel}"]`);
      await page.waitForTimeout(500);

      for (const [f, r] of probePositions) {
        const selector = `input.cell-input[data-front="${f}"][data-rear="${r}"][data-key="zero"]`;
        const value = await page.$eval(selector, el => el.value).catch(() => null);
        const expected = FIXTURE[wheel].gridData[String(f)][String(r)].zero;
        assert(
          value === expected,
          `${wheel} cell (${f},${r}) zero = "${expected}" (got "${value}")`,
        );
      }
    }

    // ── Section D: Report Page — Raw Data Table (US3) ───────────────────
    console.log('\n=== Section D: Report Raw Data Table (US3) ===');

    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#table-container', { visible: true });

    for (const wheel of WHEELS) {
      const isRear = wheel === 'RL' || wheel === 'RR';
      const tabId = `tab-table-${wheel.toLowerCase()}`;
      await page.click(`#${tabId}`);
      await page.waitForTimeout(800);

      // Metrics: camber for all; caster (front) or toe (rear) as second metric
      const metrics = isRear ? ['camber', 'toe'] : ['camber', 'caster'];

      for (const metric of metrics) {
        await page.click(`#btn-metric-${metric}`);
        await page.waitForTimeout(300);

        for (let fi = 0; fi < BOLT_POSITIONS.length; fi++) {
          for (let ri = 0; ri < BOLT_POSITIONS.length; ri++) {
            const f = BOLT_POSITIONS[fi];
            const r = BOLT_POSITIONS[ri];
            const cell = FIXTURE[wheel].gridData[String(f)][String(r)];

            let expected;
            if (metric === 'camber') {
              const camberNum = parseFloat(cell.zero);
              expected = (camberNum > 0 ? '+' : '') + camberNum.toFixed(2) + '°';
            } else if (metric === 'caster') {
              expected = (CASTER_MULTIPLIER * Math.abs(parseFloat(cell.pos20) - parseFloat(cell.neg20))).toFixed(2) + '°';
            } else {
              // toe: scalar per wheel — same display value for all 169 cells
              const toe = FIXTURE[wheel].toe;
              expected = (toe >= 0 ? '+' : '') + toe.toFixed(2) + ' mm';
            }

            // Positional selector: tbody row fi (0-indexed), cell ri+1
            const displayed = await page.evaluate((fIdx, rIdx) => {
              const tbody = document.querySelector('#table-container tbody');
              if (!tbody) return null;
              const row = tbody.rows[fIdx];
              if (!row) return null;
              const cell = row.cells[rIdx + 1];
              if (!cell) return null;
              const div = cell.querySelector('.cell-value');
              return div ? div.textContent.trim() : null;
            }, fi, ri);

            assert(
              displayed === expected,
              `${wheel} ${metric} table (front=${f}, rear=${r}) expected ${expected}, got ${displayed}`,
            );
          }
        }
      }
    }

    // ── Section E: Report Page — Chart (US4) ─────────────────────────────
    console.log('\n=== Section E: Report Chart (US4) ===');

    // Already on report page — click chart tabs
    const camberFirstValues = {};

    for (const wheel of WHEELS) {
      const isRear = wheel === 'RL' || wheel === 'RR';
      const tabId = `tab-chart-${wheel.toLowerCase()}`;
      await page.click(`#${tabId}`);
      await page.waitForTimeout(1000);

      const debugJson = await page.$eval('#main-chart', el => el.dataset.chartDebug).catch(() => null);
      assert(debugJson != null, `${wheel} chart has data-chart-debug attribute`);
      if (!debugJson) continue;

      const debug = JSON.parse(debugJson);

      assert(debug.wheel === wheel, `${wheel} chart debug.wheel === "${wheel}"`);
      assert(Array.isArray(debug.frontBolts) && debug.frontBolts.length === 13,
        `${wheel} chart frontBolts.length === 13`);

      const expChart = FIXTURE[wheel].expectedChart;

      // Camber boundary/midpoint assertions
      assert(approxEqual(debug.cambers[0],  expChart.camber.first, TOLERANCE_CHART),
        `${wheel} cambers[0] ≈ ${expChart.camber.first} (got ${debug.cambers[0]})`);
      assert(approxEqual(debug.cambers[6],  expChart.camber.mid,   TOLERANCE_CHART),
        `${wheel} cambers[6] ≈ ${expChart.camber.mid} (got ${debug.cambers[6]})`);
      assert(approxEqual(debug.cambers[12], expChart.camber.last,  TOLERANCE_CHART),
        `${wheel} cambers[12] ≈ ${expChart.camber.last} (got ${debug.cambers[12]})`);

      // Target lines
      assert(approxEqual(debug.targetCamber, expChart.targetCamber, 0.001),
        `${wheel} targetCamber === ${expChart.targetCamber}`);

      if (!isRear) {
        // Caster boundary/midpoint assertions (front wheels only)
        assert(approxEqual(debug.casters[0],  expChart.caster.first, TOLERANCE_CHART),
          `${wheel} casters[0] ≈ ${expChart.caster.first} (got ${debug.casters[0]})`);
        assert(approxEqual(debug.casters[6],  expChart.caster.mid,   TOLERANCE_CHART),
          `${wheel} casters[6] ≈ ${expChart.caster.mid} (got ${debug.casters[6]})`);
        assert(approxEqual(debug.casters[12], expChart.caster.last,  TOLERANCE_CHART),
          `${wheel} casters[12] ≈ ${expChart.caster.last} (got ${debug.casters[12]})`);
        assert(approxEqual(debug.targetCaster, expChart.targetCaster, 0.001),
          `${wheel} targetCaster === ${expChart.targetCaster}`);
      }

      // Drop-line assertions (FR-012): drop line placed where camber line crosses targetCamber
      assert(typeof debug.camberCrossing === 'number'
        && debug.camberCrossing >= 0 && debug.camberCrossing <= 12,
        `${wheel} camberCrossing is a number 0–12 (got ${debug.camberCrossing})`);
      if (typeof debug.camberCrossing === 'number') {
        const lo = Math.floor(debug.camberCrossing);
        const hi = Math.min(12, Math.ceil(debug.camberCrossing));
        const c0 = debug.cambers[lo];
        const c1 = debug.cambers[hi];
        assert(
          Math.min(c0, c1) <= debug.targetCamber + 0.01 && Math.max(c0, c1) >= debug.targetCamber - 0.01,
          `${wheel} camberCrossing brackets targetCamber (cambers[${lo}]=${c0}, cambers[${hi}]=${c1}, target=${debug.targetCamber})`,
        );
      }

      if (!isRear) {
        assert(typeof debug.casterCrossing === 'number'
          && debug.casterCrossing >= 0 && debug.casterCrossing <= 12,
          `${wheel} casterCrossing is a number 0–12 (got ${debug.casterCrossing})`);
      }

      camberFirstValues[wheel] = debug.cambers[0];
    }

    // Cross-wheel uniqueness: cambers[0] must differ across all 4 wheels
    const firstVals = Object.values(camberFirstValues);
    const uniqueFirstVals = new Set(firstVals.map(v => v.toFixed(3)));
    assert(uniqueFirstVals.size === firstVals.length,
      `cambers[0] values are unique across all wheels: ${firstVals.join(', ')}`);

    // ── Section F: Report Page — Washer Diagrams (US5) ──────────────────
    console.log('\n=== Section F: Washer Diagrams (US5) ===');

    await page.waitForSelector('.washer-bolt-row', { visible: true });

    const allPositions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.washer-position'))
        .map(el => el.textContent.trim())
    );

    // DOM order: [FL_front, FL_rear, FR_front, FR_rear, RL_front, RL_rear, RR_front, RR_rear]
    for (let i = 0; i < WHEELS.length; i++) {
      const wheel = WHEELS[i];
      const frontPos = allPositions[i * 2];
      const rearPos  = allPositions[i * 2 + 1];
      assert(frontPos === FIXTURE[wheel].expectedOptima.washerPositionTexts.frontBolt,
        `${wheel} washer frontBolt position text === "${FIXTURE[wheel].expectedOptima.washerPositionTexts.frontBolt}" (got "${frontPos}")`);
      assert(rearPos  === FIXTURE[wheel].expectedOptima.washerPositionTexts.rearBolt,
        `${wheel} washer rearBolt position text  === "${FIXTURE[wheel].expectedOptima.washerPositionTexts.rearBolt}" (got "${rearPos}")`);
    }

    // Optional: assert SVG rotation transform attributes
    const rotations = await page.evaluate(() =>
      Array.from(document.querySelectorAll('svg.washer-svg > g[transform]'))
        .map(g => g.getAttribute('transform'))
    );

    for (let i = 0; i < WHEELS.length; i++) {
      const wheel = WHEELS[i];
      const expFrontRot = FIXTURE[wheel].expectedOptima.rotationAngles.frontBolt;
      const expRearRot  = FIXTURE[wheel].expectedOptima.rotationAngles.rearBolt;

      const frontRotStr = rotations[i * 2];
      const rearRotStr  = rotations[i * 2 + 1];

      if (frontRotStr != null) {
        const frontMatch = frontRotStr.match(/rotate\(([^,\s)]+)/);
        if (frontMatch) {
          assert(parseFloat(frontMatch[1]) === expFrontRot,
            `${wheel} washer frontBolt SVG rotation === ${expFrontRot}° (got ${frontMatch[1]}°)`);
        }
      }
      if (rearRotStr != null) {
        const rearMatch = rearRotStr.match(/rotate\(([^,\s)]+)/);
        if (rearMatch) {
          assert(parseFloat(rearMatch[1]) === expRearRot,
            `${wheel} washer rearBolt SVG rotation  === ${expRearRot}° (got ${rearMatch[1]}°)`);
        }
      }
    }

  } finally {
    if (browser) await browser.close();
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
