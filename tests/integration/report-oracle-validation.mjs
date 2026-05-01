#!/usr/bin/env node

/**
 * Integration Test: Report Oracle Validation
 *
 * Goal:
 * Validate each report section against an independent oracle derived from raw data,
 * so one section cannot silently validate another section's mistakes.
 */

import puppeteer from 'puppeteer';
import { getServerPort } from '../test-server-singleton.js';
import { waitForServer } from '../test-wait-helpers.js';


const PORT = getServerPort();
const BASE_URL = `http://localhost:${PORT}`;
const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

function info(msg) {
  console.log(`INFO  ${msg}`);
}

let passes = 0, failures = 0;
function pass(msg) {
  passes++;
  console.log(`PASS  ${msg}`);
}

function fail(msg) {
  throw new Error(msg);
}

function assert(condition, label) {
  if (condition) { passes++; console.log(`  ✓ ${label}`); }
  else { failures++; console.log(`  ✗ FAIL: ${label}`); }
}

function approxEqual(a, b, eps = 0.011) {
  return Math.abs(a - b) <= eps;
}

function buildDeterministicStorageGrid(wheelBias = 0) {
  const grid = {};
  for (let fi = 0; fi < BOLT_POSITIONS.length; fi++) {
    const front = BOLT_POSITIONS[fi];
    grid[front] = {};
    for (let ri = 0; ri < BOLT_POSITIONS.length; ri++) {
      const rear = BOLT_POSITIONS[ri];

      // Deterministic and smooth synthetic surface centered around targets.
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

function toMeasuredRowsFromStorageGrid(grid) {
  const rows = [];
  for (let fi = 0; fi < BOLT_POSITIONS.length; fi++) {
    for (let ri = 0; ri < BOLT_POSITIONS.length; ri++) {
      const cell = grid[fi][ri];
      rows.push({
        frontBolt: BOLT_POSITIONS[fi],
        rearBolt: BOLT_POSITIONS[ri],
        neg20: Number(cell.neg20),
        zero: Number(cell.zero),
        pos20: Number(cell.pos20),
      });
    }
  }
  return rows;
}

async function main() {
  let browser;

  try {
    info('Connecting to server');
    await waitForServer(BASE_URL);
    pass('Server ready');

    info('Preparing deterministic raw data');
    const flGridStorage = buildDeterministicStorageGrid(0);
    const frGridStorage = buildDeterministicStorageGrid(0.08);

    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/input.html`, { waitUntil: 'networkidle2' });

    await page.evaluate((fl, fr) => {
      localStorage.setItem('mx5-nc1-alignment-FL', JSON.stringify(fl));
      localStorage.setItem('mx5-nc1-alignment-FR', JSON.stringify(fr));
    }, flGridStorage, frGridStorage);

    await page.goto(`${BASE_URL}/report.html`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#section-table', { visible: true });
    await page.waitForSelector('#section-symmetry', { visible: true });
    await page.waitForSelector('#section-washers', { visible: true });

    info('Building independent oracle from raw data (in browser module context)');
    const oracle = await page.evaluate(async (flGrid, frGrid, positions) => {
      const mod = await import('/js/report-engine.js');

      const toRows = (grid) => {
        const rows = [];
        for (let fi = 0; fi < positions.length; fi++) {
          const front = positions[fi];
          for (let ri = 0; ri < positions.length; ri++) {
            const rear = positions[ri];
            const cell = grid[String(front)]?.[String(rear)] ?? grid[front]?.[rear];
            rows.push({
              frontBolt: front,
              rearBolt: rear,
              neg20: Number(cell.neg20),
              zero: Number(cell.zero),
              pos20: Number(cell.pos20),
            });
          }
        }
        return rows;
      };

      const flResult = mod.processWheel(toRows(flGrid));
      const frResult = mod.processWheel(toRows(frGrid));
      const sym = mod.symmetryAnalysis(flResult, frResult);

      return { flResult, frResult, sym };
    }, flGridStorage, frGridStorage, BOLT_POSITIONS);

    const flResult = oracle.flResult;
    const frResult = oracle.frResult;
    const sym = oracle.sym;

    // 1) Raw table values validated directly against raw-data oracle (not other sections)
    info('Validating raw data table cells against oracle');
    const checkpoints = [
      { front: -6, rear: -6 },
      { front: 0, rear: 0 },
      { front: 6, rear: 6 },
      { front: sym.recommendation.flFront, rear: sym.recommendation.flRear },
    ];

    for (const cp of checkpoints) {
      const expected = flResult.rows169.find(r => r.frontBolt === cp.front && r.rearBolt === cp.rear);
      if (!expected) fail(`Missing expected row for (${cp.front},${cp.rear})`);

      await page.click('button[data-metric="camber"]');
      await page.waitForTimeout(80);
      const actualCamber = await page.evaluate(({ front, rear }) => {
        const fi = front + 6;
        const ri = rear + 6;
        const row = document.querySelectorAll('#table-container tbody tr')[fi];
        if (!row) return NaN;
        const cell = row.querySelectorAll('td')[ri + 1];
        if (!cell) return NaN;
        const metricText = cell.querySelector('.cell-value > div')?.textContent?.trim() ?? '';
        return Number(metricText.replace('°', '').replace('mm', '').replace('+', '').trim());
      }, cp);

      await page.click('button[data-metric="caster"]');
      await page.waitForTimeout(80);
      const actualCaster = await page.evaluate(({ front, rear }) => {
        const fi = front + 6;
        const ri = rear + 6;
        const row = document.querySelectorAll('#table-container tbody tr')[fi];
        if (!row) return NaN;
        const cell = row.querySelectorAll('td')[ri + 1];
        if (!cell) return NaN;
        const metricText = cell.querySelector('.cell-value > div')?.textContent?.trim() ?? '';
        return Number(metricText.replace('°', '').replace('mm', '').replace('+', '').trim());
      }, cp);

      if (!Number.isFinite(actualCamber) || !Number.isFinite(actualCaster)) {
        fail(`Table cell metric read failed at (${cp.front},${cp.rear})`);
      }
      if (!approxEqual(actualCamber, Number(expected.camber.toFixed(2)))) {
        fail(`Camber mismatch at (${cp.front},${cp.rear}): ui=${actualCamber}, expected=${expected.camber.toFixed(2)}`);
      }
      if (!approxEqual(actualCaster, Number(expected.caster.toFixed(2)))) {
        fail(`Caster mismatch at (${cp.front},${cp.rear}): ui=${actualCaster}, expected=${expected.caster.toFixed(2)}`);
      }
    }
    pass('Raw table cell values match oracle');

    // 2) Recommendation consolidation table — bolt positions cross-checked against oracle recommendation
    info('Validating recommendation consolidation table bolt positions against oracle');
    const consolidationBolts = await page.evaluate(() => {
      function parseFirstNumber(text) {
        const m = String(text).match(/[-+]?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : NaN;
      }
      function parseBolts(td) {
        const divs = td ? Array.from(td.querySelectorAll('div')) : [];
        const f = divs.find(d => d.textContent.trim().startsWith('F:'));
        const r = divs.find(d => d.textContent.trim().startsWith('R:'));
        if (!f || !r) return null;
        return {
          front: parseFirstNumber(f.textContent.split(':')[1]),
          rear:  parseFirstNumber(r.textContent.split(':')[1]),
        };
      }
      const table = document.querySelector('.symmetry-consolidation-table');
      if (!table) return null;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      return rows.map(r => {
        const tds = r.querySelectorAll('td');
        return {
          metric:     (tds[0]?.textContent || '').trim(),
          flBolts:    parseBolts(tds[2]),
          frBolts:    parseBolts(tds[3]),
        };
      });
    });

    if (!consolidationBolts || consolidationBolts.length < 2) fail('Recommendation consolidation table missing or incomplete');
    const recCamberRow = consolidationBolts.find(r => r.metric.includes('Camber'));
    const recCasterRow = consolidationBolts.find(r => r.metric.includes('Caster'));
    if (!recCamberRow || !recCasterRow) fail('Consolidation table missing Camber or Caster rows');
    if (!recCamberRow.flBolts || !recCasterRow.flBolts) fail('Consolidation table FL bolt positions missing');

    // The recommendation selects either the camber-symmetric or caster-symmetric pair bolts.
    const flBoltMatchesCamberRow = recCamberRow.flBolts.front === sym.recommendation.flFront && recCamberRow.flBolts.rear === sym.recommendation.flRear;
    const flBoltMatchesCasterRow = recCasterRow.flBolts.front === sym.recommendation.flFront && recCasterRow.flBolts.rear === sym.recommendation.flRear;
    if (!flBoltMatchesCamberRow && !flBoltMatchesCasterRow) {
      fail(`Recommendation FL bolts (${sym.recommendation.flFront},${sym.recommendation.flRear}) not found in consolidation table [camberRow: (${recCamberRow.flBolts.front},${recCamberRow.flBolts.rear}), casterRow: (${recCasterRow.flBolts.front},${recCasterRow.flBolts.rear})]`);
    }
    pass('Recommendation consolidation table shows correct bolt positions');

    // 3) Front consolidation table validated independently against oracle
    info('Validating front consolidation table against oracle');
    const frontConsolidation = await page.evaluate(() => {
      const table = document.querySelector('.symmetry-consolidation-table');
      if (!table) return null;
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      return rows.map(r => {
        const tds = r.querySelectorAll('td');
        return {
          metric: tds[0]?.textContent?.trim() || '',
          compromise: parseFirstNumber(tds[1]?.textContent || ''),
        };
      });

      function parseFirstNumber(text) {
        const m = String(text).match(/[-+]?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : NaN;
      }
    });

    if (!frontConsolidation || frontConsolidation.length < 2) fail('Front consolidation table rows missing');
    const camberRow = frontConsolidation.find(r => r.metric.includes('Camber'));
    const casterRow = frontConsolidation.find(r => r.metric.includes('Caster'));
    if (!camberRow || !casterRow) fail('Consolidation metrics rows missing');

    const expectedCamberCompromise = Number(((sym.fl.bestCamberValue + sym.fr.bestCamberValue) / 2).toFixed(2));
    const expectedCasterCompromise = Number(((sym.fl.bestCasterValue + sym.fr.bestCasterValue) / 2).toFixed(2));
    if (!approxEqual(camberRow.compromise, expectedCamberCompromise)) {
      fail(`Consolidation camber compromise mismatch: ui=${camberRow.compromise}, expected=${expectedCamberCompromise}`);
    }
    if (!approxEqual(casterRow.compromise, expectedCasterCompromise)) {
      fail(`Consolidation caster compromise mismatch: ui=${casterRow.compromise}, expected=${expectedCasterCompromise}`);
    }
    pass('Consolidation values match oracle');

    // 4) Washer section validated against recommendation directly from oracle
    info('Validating washer suggested bolt positions against recommendation oracle');
    const washerPositions = await page.evaluate(() => {
      const columns = Array.from(document.querySelectorAll('.washer-wheel-column'));
      const pick = (labelText) => columns.find(c => c.querySelector('.washer-wheel-label')?.textContent?.includes(labelText));
      const readCol = (col) => {
        const rows = Array.from(col.querySelectorAll('.washer-bolt-row'));
        const frontRow = rows.find(r => r.querySelector('.washer-bolt-name')?.textContent?.includes('Front Bolt'));
        const rearRow = rows.find(r => r.querySelector('.washer-bolt-name')?.textContent?.includes('Rear Bolt'));
        return {
          front: parseFirstNumber(frontRow?.querySelector('.washer-position')?.textContent || ''),
          rear: parseFirstNumber(rearRow?.querySelector('.washer-position')?.textContent || ''),
        };
      };
      const fl = pick('(FL)');
      const fr = pick('(FR)');
      return {
        fl: fl ? readCol(fl) : null,
        fr: fr ? readCol(fr) : null,
      };

      function parseFirstNumber(text) {
        const m = String(text).match(/[-+]?\d+(?:\.\d+)?/);
        return m ? Number(m[0]) : NaN;
      }
    });

    if (!washerPositions.fl || !washerPositions.fr) fail('Washer FL/FR columns missing');
    if (washerPositions.fl.front !== sym.recommendation.flFront || washerPositions.fl.rear !== sym.recommendation.flRear) {
      fail(`Washer FL mismatch: ui=(${washerPositions.fl.front},${washerPositions.fl.rear}) expected=(${sym.recommendation.flFront},${sym.recommendation.flRear})`);
    }
    if (washerPositions.fr.front !== sym.recommendation.frFront || washerPositions.fr.rear !== sym.recommendation.frRear) {
      fail(`Washer FR mismatch: ui=(${washerPositions.fr.front},${washerPositions.fr.rear}) expected=(${sym.recommendation.frFront},${sym.recommendation.frRear})`);
    }
    pass('Washer recommendations match oracle');

    pass('All report sections independently validated from raw-data oracle');

    console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
    process.exit(failures > 0 ? 1 : 0);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((err) => {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
});
