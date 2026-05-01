#!/usr/bin/env node
/**
 * compute-e2e-optima.mjs — One-time pre-computation script for e2e-data-integrity fixture.
 *
 * Generates all 169 bilinear+cross-term cells per wheel, calls processWheel()
 * to find bestCell, and computes chart boundary values.
 *
 * Output: JSON per wheel — copy into FIXTURE in tests/integration/e2e-data-integrity.mjs
 *
 * Usage: node scripts/compute-e2e-optima.mjs
 */

// Mock localStorage before any browser-dependent imports are evaluated
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

const { processWheel } = await import('../js/report-engine.js');

// ── Constants ────────────────────────────────────────────────────────────

const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const CASTER_MULTIPLIER = 1.462;

// ── Wheel parameters ─────────────────────────────────────────────────────

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

// Per-wheel processing targets (mirrors report-page.js _getWheelTargets)
const WHEEL_TARGETS = {
  FL: { targetCamber: -1.1,  targetCaster: 5.0  },
  FR: { targetCamber: -1.1,  targetCaster: 5.0  },
  RL: { targetCamber: -1.5,  targetCaster: null },
  RR: { targetCamber: -1.5,  targetCaster: null },
};

// ── Formula ───────────────────────────────────────────────────────────────

/**
 * Generate a single grid cell value for the fixture.
 *
 * @param {string} wheel
 * @param {number} frontBolt  −6..+6
 * @param {number} rearBolt   −6..+6
 * @returns {{ neg20: string, zero: string, pos20: string }}
 */
function generateCell(wheel, frontBolt, rearBolt) {
  const nf = (frontBolt + 6) / 12;  // 0..1
  const nr = (rearBolt  + 6) / 12;  // 0..1

  const {
    camberCorners, camberBulgeSign, camberCurvature,
    spreadCorners, spreadBulgeSign, spreadCurvature,
  } = WHEEL_PARAMS[wheel];

  function bilinear(corners) {
    return corners.LL * (1 - nf) * (1 - nr)
         + corners.LR * (1 - nf) * nr
         + corners.HL * nf       * (1 - nr)
         + corners.HR * nf       * nr;
  }

  function crossTerm(curvature, bulgeSign) {
    // × 4 to scale max amplitude (nf*(1-nf) max = 0.25 → 4 × 0.25 = 1)
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

/**
 * Sign-format a bolt position value (mirrors washer-diagram.js _sign).
 * @param {number} n
 * @returns {string}
 */
function sign(n) {
  return n >= 0 ? `+${n}` : String(n);
}

// ── Main computation ──────────────────────────────────────────────────────

const output = {};

for (const wheel of ['FL', 'FR', 'RL', 'RR']) {
  // 1. Build full 13×13 gridData (string values, string keys)
  const gridData = {};
  for (const f of BOLT_POSITIONS) {
    gridData[String(f)] = {};
    for (const r of BOLT_POSITIONS) {
      gridData[String(f)][String(r)] = generateCell(wheel, f, r);
    }
  }

  // 2. Build parsedCSV for processWheel (numeric values)
  const parsedCSV = [];
  for (const f of BOLT_POSITIONS) {
    for (const r of BOLT_POSITIONS) {
      const cell = gridData[String(f)][String(r)];
      parsedCSV.push({
        frontBolt: f,
        rearBolt:  r,
        neg20:     parseFloat(cell.neg20),
        zero:      parseFloat(cell.zero),
        pos20:     parseFloat(cell.pos20),
      });
    }
  }

  // 3. Run processWheel to get bestCell
  const targets = WHEEL_TARGETS[wheel];
  const result = processWheel(parsedCSV, {
    targetCamber: targets.targetCamber,
    targetCaster: targets.targetCaster,
  });

  const { bestCell } = result;

  // 4. Chart boundary values — _aggregateByFrontBolt picks rearBolt=0
  //    So cambers[i] = camber at BOLT_POSITIONS[i], rearBolt=0
  const chartBoltIdxs = [0, 6, 12]; // first, mid, last
  function chartCamber(boltIdx) {
    const fb = BOLT_POSITIONS[boltIdx];
    return parseFloat(gridData[String(fb)]['0'].zero);
  }
  function chartCaster(boltIdx) {
    const fb = BOLT_POSITIONS[boltIdx];
    const cell = gridData[String(fb)]['0'];
    return CASTER_MULTIPLIER * Math.abs(parseFloat(cell.pos20) - parseFloat(cell.neg20));
  }

  const isRear = wheel === 'RL' || wheel === 'RR';

  const expectedChart = {
    camber: {
      first: +chartCamber(0).toFixed(3),
      mid:   +chartCamber(6).toFixed(3),
      last:  +chartCamber(12).toFixed(3),
    },
    caster: isRear ? null : {
      first: +chartCaster(0).toFixed(3),
      mid:   +chartCaster(6).toFixed(3),
      last:  +chartCaster(12).toFixed(3),
    },
    targetCamber: targets.targetCamber,
    targetCaster: isRear ? null : targets.targetCaster,
  };

  // 5. Washer texts and rotation angles
  const washerPositionTexts = {
    frontBolt: `Position: ${sign(bestCell.frontBolt)}`,
    rearBolt:  `Position: ${sign(bestCell.rearBolt)}`,
  };
  const rotationAngles = {
    frontBolt: bestCell.frontBolt * 15,
    rearBolt:  bestCell.rearBolt  * 15,
  };

  output[wheel] = {
    gridData,
    expectedChart,
    expectedOptima: {
      bestCell: { frontBolt: bestCell.frontBolt, rearBolt: bestCell.rearBolt },
      washerPositionTexts,
      rotationAngles,
    },
  };
}

// 6. Print JSON output
console.log(JSON.stringify(output, null, 2));
