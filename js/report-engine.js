/**
 * report-engine.js — Data processing layer for the report page.
 *
 * Exported API:
 *   processWheel(parsedCSV) → WheelResult
 *   symmetryAnalysis(flResult, frResult) → SymmetryResult
 *
 * WheelResult shape:
 *   {
 *     grid:               GridCell[][]      13×13 grid (front axis × rear axis)
 *     rows169:            DerivedRow[]      flat array of 169 rows with camber + caster
 *     bestCell:           DerivedRow        row with lowest combined score (compromise)
 *     bestCamberCell:     DerivedRow        row that minimizes |camberDelta| (best camber position)
 *     bestCasterCell:     DerivedRow        row that minimizes |casterDelta| (best caster position)
 *   }
 *
 * NOTE: bestCell may differ from bestCamberCell or bestCasterCell because:
 *   - bestCell optimizes the compromise (weighted Golden Rule score)
 *   - bestCamberCell optimizes camber accuracy alone
 *   - bestCasterCell optimizes caster accuracy alone
 *   These may be at different bolt positions (e.g., Front +0 gives best camber,
 *   but Front +1 gives better caster).
 *
 * DerivedRow shape:
 *   { camberBolt, casterBolt, camber, caster, isInterpolated,
 *     camberDelta, casterDelta, score }
 *
 * SymmetryResult shape (Phase 1):
 *   {
 *     fl: { bestCamber, bestCaster, bestFront, bestRear }
 *     fr: { bestCamber, bestCaster, bestFront, bestRear }
 *     recommendation: {
 *       camber, caster,
 *       flCamberBolt, flCasterBolt, frCamberBolt, frCasterBolt,
 *       note: string
 *     }
 *   }
 *
 * BOLT POSITIONS vs ALIGNMENT VALUES:
 * ════════════════════════════════════
 * CRITICAL DISTINCTION: Bolt positions are IMPLEMENTATION DETAILS.
 * Symmetry applies ONLY to final alignment VALUES (camber, caster, toe), NOT to bolt positions.
 *
 * WORKFLOW:
 *   1. For each wheel (FL, FR), processWheel() finds all 169 bolt positions and their resulting values
 *   2. Each wheel independently identifies the bestCell (lowest combined error to targets)
 *   3. FL and FR may achieve the SAME camber/caster/toe using DIFFERENT bolt positions
 *   4. symmetryAnalysis() finds bolt position pairs where FL and FR achieve MATCHING VALUES
 *   5. Final recommendation: Use FL's bolt position to get X° camber, FR's bolt position to get X° camber
 *
 * EXAMPLE in practice:
 *   - FL best position: Front +0, Rear −3 → achieves −1.1° camber, 4.95° caster
 *   - FR best position: Front +2, Rear −1 → achieves −1.2° camber, 5.05° caster
 *   - Symmetry analysis: Find positions that achieve MATCHING values (e.g., both −1.1° camber)
 *   - Recommendation: FL uses Front +0, Rear −3; FR uses Front +1, Rear −4 (different positions!)
 *                     Both wheels end up with −1.1° camber (symmetric VALUE, different POSITIONS)
 *
 * SCORING PHILOSOPHY - "The Golden Rule":
 * ════════════════════════════════════════
 * Wheel alignment involves trade-offs between camber and caster accuracy.
 * The Golden Rule prioritizes camber first because missing camber targets severely
 * impacts tire wear and handling, while caster compromises are more tolerant.
 *
 * Scoring formula (implemented in _computeGoldenRuleScore):
 *   1. |camberDelta| > 1.0°  → unacceptable (score = 100+ penalty)
 *   2. Otherwise             → absCamber×12 + absCaster×casterWeight + absToe×1.2
 *      where casterWeight decays linearly from 3.0 (perfect camber) to 1.0 (0.5° error).
 *      Continuous formula guarantees monotonicity: worsening camber always raises score.
 *
 * See README.md § Prioritisation: The Golden Rule for full discussion of principles.
 */

import { BOLT_POSITIONS, TARGET_CAMBER, TARGET_CASTER, TARGET_STEERING_RATIO, TARGET_CASTER_INPUT_MODE, TARGET_CASTER_WHEEL_DEGREES, SYMMETRY_TOLERANCE, TOE_SYMMETRY_TOLERANCE } from './constants.js';
import { interpolateGrid } from './interpolation.js';
import { calculateCaster, calculateCasterMultiplier } from './math-utils.js';

/**
 * @typedef {import('./interpolation.js').GridCell} GridCell
 * @typedef {{ camberBolt:number, casterBolt:number, camber:number, caster:number, toe:number|null,
 *             isInterpolated:boolean, camberDelta:number, casterDelta:number|null, toeDelta:number|null, score:number }} DerivedRow
 */

/**
 * Apply the "Golden Rule" to calculate a prioritised score.
 *
 * Golden Rule: Camber is fundamental to performance. If you have to miss
 * camber by >1.0° just to hit caster, you're usually hurting the car.
 *
 * Design invariant (monotonicity): a position with WORSE camber must NEVER score
 * better than one with BETTER camber when caster is identical. The original two-tier
 * formula (abrupt weight drop at 0.5°) violated this — the caster weight dropped from
 * 3× to 1× at the boundary, so a position with |camberDelta|=0.501° scored lower
 * (better) than one at 0.499° when |casterDelta|≥0.125°. Fixed by a continuous caster
 * weight that decays linearly from 3× (perfect camber) to 1× (0.5° camber error), with
 * a camber weight of 12 that guarantees monotonicity for any |casterDelta| < 3°.
 *
 * Scoring tiers:
 *   1. |camberDelta| > 1.0°  → unacceptable (score ≥ 100)
 *   2. |camberDelta| ≤ 1.0°  → absCamber×12 + absCaster×casterWeight(absCamber) + absToe×1.2
 *      casterWeight = 1 + 2×max(0, (0.5 − absCamber)/0.5)  [3× at 0°, 1× at ≥0.5°]
 */
function _computeGoldenRuleScore(camberDelta, casterDelta, toeDelta = null) {
  const absCamber = Math.abs(camberDelta);
  const absCaster = casterDelta == null ? 0 : Math.abs(casterDelta);
  const absToe    = toeDelta    == null ? 0 : Math.abs(toeDelta);

  // Tier 1: camber >1.0° is unacceptable — hard penalty regardless of caster
  if (absCamber > 1.0) {
    return 100 + absCamber * 10 + absToe * 0.5;
  }

  // Tiers 2+3 unified: caster weight decays continuously as camber error grows.
  // At absCamber=0:    casterWeight=3.0  (caster prioritised when camber is already perfect)
  // At absCamber≥0.5°: casterWeight=1.0  (camber is now the bottleneck)
  // camberWeight=12 ensures d(score)/d(absCamber) > 0 for all |casterDelta| < 3° (12 > 3×4).
  const casterWeight = 1.0 + 2.0 * Math.max(0, (0.5 - absCamber) / 0.5);
  return absCamber * 12.0 + absCaster * casterWeight + absToe * 1.2;
}

/**
 * Process a parsed CSV for one wheel.
 *
 * Returns multiple "best" positions because camber and caster optimize independently:
 *   - bestCell: Best compromise (weighted score using Golden Rule)
 *   - bestCamberCell: Best position for camber accuracy alone
 *   - bestCasterCell: Best position for caster accuracy alone
 *
 * These may be at different bolt positions because the front and rear bolts affect
 * both camber and caster simultaneously. The position that minimizes camber error
 * may not be the same as the position that minimizes caster error.
 *
 * @param {import('./csv-io.js').MeasuredRow[]} parsedCSV
 * @param {{ targetCamber?: number, targetCaster?: number|null, targetToe?: number|null, measuredToe?: number|null, steeringRatio?: number|null, casterInputMode?: string|null, casterWheelDegrees?: number|null }} [options]
 * @returns {{
 *   grid: GridCell[][],
 *   rows169: DerivedRow[],
 *   bestCell: DerivedRow,
 *   bestCamberCell: DerivedRow,
 *   bestCasterCell: DerivedRow,
 *   targets: { camber:number, caster:number|null, toe:number|null },
 *   measuredToe: number|null
 * }}
 */
export function processWheel(parsedCSV, options = {}) {
  const targetCamber = Object.prototype.hasOwnProperty.call(options, 'targetCamber') ? options.targetCamber : TARGET_CAMBER;
  const targetCaster = Object.prototype.hasOwnProperty.call(options, 'targetCaster') ? options.targetCaster : TARGET_CASTER;
  const targetToe = Object.prototype.hasOwnProperty.call(options, 'targetToe') ? options.targetToe : null;
  const measuredToe = Object.prototype.hasOwnProperty.call(options, 'measuredToe') ? options.measuredToe : null;
  const casterInputMode = Object.prototype.hasOwnProperty.call(options, 'casterInputMode')
    ? options.casterInputMode
    : TARGET_CASTER_INPUT_MODE;
  const casterWheelDegreesCandidate = Object.prototype.hasOwnProperty.call(options, 'casterWheelDegrees')
    ? options.casterWheelDegrees
    : TARGET_CASTER_WHEEL_DEGREES;
  const casterWheelDegrees = Number.isFinite(Number(casterWheelDegreesCandidate)) && Number(casterWheelDegreesCandidate) > 0
    ? Number(casterWheelDegreesCandidate)
    : TARGET_CASTER_WHEEL_DEGREES;
  const steeringRatioCandidate = Object.prototype.hasOwnProperty.call(options, 'steeringRatio')
    ? options.steeringRatio
    : TARGET_STEERING_RATIO;
  const steeringRatio = Number.isFinite(Number(steeringRatioCandidate)) && Number(steeringRatioCandidate) > 0
    ? Number(steeringRatioCandidate)
    : TARGET_STEERING_RATIO;
  const casterOptions = casterInputMode === 'wheel-degrees'
    ? { wheelDegrees: casterWheelDegrees }
    : { steeringRatio };

  const csvToe = parsedCSV.find(r => r.toe != null && Number.isFinite(Number(r.toe)));
  const effectiveToe = csvToe ? Number(csvToe.toe) : measuredToe;

  // Build grid from MEASURED data only — no interpolation
  // Infer measured positions from the data itself
  const camberMeasured = [...new Set(parsedCSV.map(r => r.camberBolt))].sort((a, b) => a - b);
  const casterMeasured = [...new Set(parsedCSV.map(r => r.casterBolt))].sort((a, b) => a - b);

  // Create map for quick lookup
  const measuredMap = {};
  for (const row of parsedCSV) {
    if (!measuredMap[row.camberBolt]) measuredMap[row.camberBolt] = {};
    measuredMap[row.camberBolt][row.casterBolt] = row;
  }

  // Build grid with only measured positions (sparse 13x13, unmeasured positions undefined)
  const grid = [];
  for (let fi = 0; fi < BOLT_POSITIONS.length; fi++) {
    const row = [];
    for (let ri = 0; ri < BOLT_POSITIONS.length; ri++) {
      const camberBolt = BOLT_POSITIONS[fi];
      const casterBolt = BOLT_POSITIONS[ri];
      const cell = measuredMap[camberBolt]?.[casterBolt];
      if (cell) {
        row.push({
          camberBolt,
          casterBolt,
          zero: cell.zero,
          neg20: cell.neg20,
          pos20: cell.pos20,
          isInterpolated: false
        });
      } else {
        row.push(undefined);
      }
    }
    grid.push(row);
  }

  const rows169 = [];

  for (const camberBolt of camberMeasured) {
    for (const casterBolt of casterMeasured) {
      const cell = measuredMap[camberBolt][casterBolt];
      if (!cell) continue;
      const camber = cell.zero;
      const caster = calculateCaster(cell.neg20, cell.pos20, casterOptions);
      const toe = effectiveToe;

      const camberDelta = camber - targetCamber;
      const casterDelta = targetCaster == null ? null : caster - targetCaster;
      const toeDelta = targetToe == null || toe == null ? null : toe - targetToe;
      const score = targetCaster == null
        ? _computeGoldenRuleScore(camberDelta, null, toeDelta)
        : _computeGoldenRuleScore(camberDelta, casterDelta, toeDelta);

      rows169.push({
        camberBolt:    cell.camberBolt,
        casterBolt:     cell.casterBolt,
        camber,
        caster,
        toe,
        isInterpolated: false,  // No interpolation — all measured
        camberDelta,
        casterDelta,
        toeDelta,
        score,
      });
    }
  }

  rows169.sort((a, b) =>
    a.camberBolt !== b.camberBolt ? a.camberBolt - b.camberBolt : a.casterBolt - b.casterBolt
  );

  // Pre-sort for quick access to top matches (by absolute delta — closest to target)
  const topByCamberDelta = rows169
    .slice()
    .sort((a, b) => Math.abs(a.camberDelta) - Math.abs(b.camberDelta))
    .slice(0, 4);

  const topByCasterDelta = targetCaster == null
    ? []
    : rows169
        .slice()
        .sort((a, b) => Math.abs(a.casterDelta) - Math.abs(b.casterDelta))
        .slice(0, 4);

  // Best compromise (using Golden Rule weighted score)
  const bestCell = rows169.reduce((best, r) => r.score < best.score ? r : best, rows169[0]);

  // Best for camber accuracy alone (minimizes |camberDelta|)
  const bestCamberCell = rows169.reduce((best, r) => 
    Math.abs(r.camberDelta) < Math.abs(best.camberDelta) ? r : best, rows169[0]
  );

  // Best for caster accuracy alone (minimizes |casterDelta|)
  // IMPORTANT: Rear wheels do NOT have caster adjustments; targetCaster is always null for RL/RR
  // Therefore bestCasterCell is set to bestCell (no caster optimization possible)
  const bestCasterCell = targetCaster == null
    ? bestCell  // Rear wheels: no caster adjustment capability, so skip caster analysis
    : rows169.reduce((best, r) =>
        Math.abs(r.casterDelta) < Math.abs(best.casterDelta) ? r : best, rows169[0]
      );

  return {
    grid,
    rows169,
    topByCamberDelta,
    topByCasterDelta,
    bestCell,
    bestCamberCell,
    bestCasterCell,
    measuredBolts: {
      camber: camberMeasured,
      caster: casterMeasured,
    },
    targets: {
      camber: targetCamber,
      caster: targetCaster,
      toe: targetToe,
      steeringRatio,
      casterInputMode,
      casterWheelDegrees,
      casterMultiplier: targetCaster == null ? null : calculateCasterMultiplier(casterOptions),
    },
    measuredToe: effectiveToe,
  };
}

/**
 * Symmetry analysis comparing Front Left and Front Right results.
 *
 * CRITICAL: Analyzes camber and caster INDEPENDENTLY because bolt positions affect both.
 *
 * Each wheel has two separate optimization goals:
 *   1. Best Camber: the bolt position that minimizes |camberDelta|
 *      (At this position, caster is what it is; may not be optimal for caster)
 *   2. Best Caster: the bolt position that minimizes |casterDelta|
 *      (At this position, camber is what it is; may not be optimal for camber)
 *
 * This function finds:
 *   1. Symmetric camber pairs: FL and FR positions where camber values match
 *   2. Symmetric caster pairs: FL and FR positions where caster values match
 *   3. A consolidated recommendation that considers both
 *
 * Example:
 *   FL best camber: Front +0, Rear −3 → −1.1° camber, 4.95° caster at camber position
 *   FR best camber: Front +1, Rear −4 → −1.1° camber, 5.05° caster at camber position
 *   → Both wheels achieve −1.1° camber (CAMBER SYMMETRIC), though bolt positions differ
 *
 *   FL best caster: Front −1, Rear +2 → −1.0° camber, 5.0° caster at caster position
 *   FR best caster: Front +0, Rear +1 → −1.05° camber, 5.0° caster at caster position
 *   → Both wheels achieve 5.0° caster (CASTER SYMMETRIC), though bolt positions differ
 *
 * Also supports REAR AXLE analysis (RL/RR), which only optimizes CAMBER (no caster).
 *
 * @param {{ grid, rows169, bestCamberCell, bestCasterCell }} flResult - FL result
 * @param {{ grid, rows169, bestCamberCell, bestCasterCell }} frResult - FR result
 * @param {{ grid, rows169, bestCamberCell, bestCasterCell }} rlResult - RL result (optional)
 * @param {{ grid, rows169, bestCamberCell, bestCasterCell }} rrResult - RR result (optional)
 * @returns {object} SymmetryResult with front (camber & caster) and rear (camber only) analyses
 */
export function symmetryAnalysis(flResult, frResult, rlResult = null, rrResult = null) {
  try {
    // FRONT AXLE ANALYSIS (if FL/FR results provided)
    let fl = null;
    let fr = null;
    let camberSymmetricPair = null;
    let casterSymmetricPair = null;
    let recommendation = null;

    if (flResult && frResult) {
      fl = _summariseIndependent(flResult);
      fr = _summariseIndependent(frResult);

      // Find SYMMETRIC CAMBER PAIR: FL and FR positions where camber values match
      camberSymmetricPair = _findBestSymmetricCamberPair(
        flResult.rows169, frResult.rows169, TARGET_CAMBER
      );

      // Find SYMMETRIC CASTER PAIR: FL and FR positions where caster values match
      casterSymmetricPair = _findBestSymmetricCasterPair(
        flResult.rows169, frResult.rows169, TARGET_CASTER
      );

      // Determine which pair is closest to BOTH targets
      if (!camberSymmetricPair && !casterSymmetricPair) {
        // No symmetric pairs found; use individual best positions
        recommendation = {
          camber: (fl.bestCamber + fr.bestCamber) / 2,
          caster: (fl.bestCaster + fr.bestCaster) / 2,
          flCamberBolt: fl.camberOptCamberBolt,
          flCasterBolt: fl.camberOptCasterBolt,
          frCamberBolt: fr.camberOptCamberBolt,
          frCasterBolt: fr.camberOptCasterBolt,
          flToe: fl.bestToe,
          frToe: fr.bestToe,
          toeMismatch: fl.bestToe != null && fr.bestToe != null ? Math.abs(fl.bestToe - fr.bestToe) : null,
          note: 'No symmetric pair found within ±0.3° tolerance. This is the closest approximation.',
        };
      } else if (!camberSymmetricPair) {
        // Only caster pair found
        recommendation = {
          camber: casterSymmetricPair.flCamberAtBestCaster,
          caster: casterSymmetricPair.flCaster,
          flCamberBolt: casterSymmetricPair.flPosition.camberBolt,
          flCasterBolt: casterSymmetricPair.flPosition.casterBolt,
          frCamberBolt: casterSymmetricPair.frPosition.camberBolt,
          frCasterBolt: casterSymmetricPair.frPosition.casterBolt,
          flToe: casterSymmetricPair.flToe,
          frToe: casterSymmetricPair.frToe,
          toeMismatch: casterSymmetricPair.toeMismatch,
          note: 'Symmetric caster values with matching bolt positions.',
        };
      } else if (!casterSymmetricPair) {
        // Only camber pair found
        recommendation = {
          camber: camberSymmetricPair.flCamber,
          caster: camberSymmetricPair.flCasterAtBestCamber,
          flCamberBolt: camberSymmetricPair.flPosition.camberBolt,
          flCasterBolt: camberSymmetricPair.flPosition.casterBolt,
          frCamberBolt: camberSymmetricPair.frPosition.camberBolt,
          frCasterBolt: camberSymmetricPair.frPosition.casterBolt,
          flToe: camberSymmetricPair.flToe,
          frToe: camberSymmetricPair.frToe,
          toeMismatch: camberSymmetricPair.toeMismatch,
          note: 'Symmetric camber values with matching bolt positions.',
        };
      } else {
        // Both pairs found; choose the one closest to targets
        const camberPairScore = Math.abs(camberSymmetricPair.flCamber - TARGET_CAMBER)
                              + Math.abs(camberSymmetricPair.frCamber - TARGET_CAMBER);
        const casterPairScore = Math.abs(casterSymmetricPair.flCaster - TARGET_CASTER)
                              + Math.abs(casterSymmetricPair.frCaster - TARGET_CASTER);

        if (camberPairScore <= casterPairScore) {
          // Camber is closer to target; use camber symmetric pair as primary
          recommendation = {
            camber: camberSymmetricPair.flCamber,
            caster: camberSymmetricPair.flCasterAtBestCamber,
            flCamberBolt: camberSymmetricPair.flPosition.camberBolt,
            flCasterBolt: camberSymmetricPair.flPosition.casterBolt,
            frCamberBolt: camberSymmetricPair.frPosition.camberBolt,
            frCasterBolt: camberSymmetricPair.frPosition.casterBolt,
            flToe: camberSymmetricPair.flToe,
            frToe: camberSymmetricPair.frToe,
            toeMismatch: camberSymmetricPair.toeMismatch,
            note: 'Symmetric camber values with matching bolt positions to achieve equal camber on both wheels.',
          };
        } else {
          // Caster is closer to target; use caster symmetric pair as primary
          recommendation = {
            camber: casterSymmetricPair.flCamberAtBestCaster,
            caster: casterSymmetricPair.flCaster,
            flCamberBolt: casterSymmetricPair.flPosition.camberBolt,
            flCasterBolt: casterSymmetricPair.flPosition.casterBolt,
            frCamberBolt: casterSymmetricPair.frPosition.camberBolt,
            frCasterBolt: casterSymmetricPair.frPosition.casterBolt,
            flToe: casterSymmetricPair.flToe,
            frToe: casterSymmetricPair.frToe,
            toeMismatch: casterSymmetricPair.toeMismatch,
            note: 'Symmetric caster values with matching bolt positions to achieve equal caster on both wheels.',
          };
        }
      }
    }

    // REAR AXLE ANALYSIS (optional): If RL and RR results provided, analyze rear camber symmetry
    let rearRecommendation = null;
    let rearCamberSymmetricPair = null;
    if (rlResult && rrResult) {
      const rl = _summariseIndependent(rlResult);
      const rr = _summariseIndependent(rrResult);

      // Find SYMMETRIC CAMBER PAIR for rear wheels (no caster on rear)
      rearCamberSymmetricPair = _findBestSymmetricRearCamberPair(
        rlResult.rows169, rrResult.rows169, TARGET_CAMBER
      );

      if (rearCamberSymmetricPair) {
        rearRecommendation = {
          camber: rearCamberSymmetricPair.rlCamber,
          rlCamberBolt: rearCamberSymmetricPair.rlPosition.camberBolt,
          rlCasterBolt: rearCamberSymmetricPair.rlPosition.casterBolt,
          rrCamberBolt: rearCamberSymmetricPair.rrPosition.camberBolt,
          rrCasterBolt: rearCamberSymmetricPair.rrPosition.casterBolt,
          rlToe: rearCamberSymmetricPair.rlToe,
          rrToe: rearCamberSymmetricPair.rrToe,
          toeMismatch: rearCamberSymmetricPair.toeMismatch,
          note: 'Symmetric camber values with matching bolt positions.',
        };
      } else {
        // No symmetric pair; use individual best positions
        rearRecommendation = {
          camber: (rl.bestCamber + rr.bestCamber) / 2,
          rlCamberBolt: rl.camberOptCamberBolt,
          rlCasterBolt: rl.camberOptCasterBolt,
          rrCamberBolt: rr.camberOptCamberBolt,
          rrCasterBolt: rr.camberOptCasterBolt,
          rlToe: rl.bestToe,
          rrToe: rr.bestToe,
          toeMismatch: rl.bestToe != null && rr.bestToe != null ? Math.abs(rl.bestToe - rr.bestToe) : null,
          note: 'No symmetric pair found within ±0.3° tolerance. This is the closest approximation.',
        };
      }
    }

    return { 
      fl, fr, recommendation, camberSymmetricPair, casterSymmetricPair,
      rear: rearRecommendation ? { rl: rlResult ? _summariseIndependent(rlResult) : null, rr: rrResult ? _summariseIndependent(rrResult) : null, recommendation: rearRecommendation, camberSymmetricPair: rearCamberSymmetricPair } : null
    };
  } catch (err) {
    console.error('[report-engine] Error in symmetryAnalysis:', err);
    throw err;
  }
}

/**
 * Extract best camber and best caster values from wheel result.
 * 
 * IMPORTANT: These are independent best values:
 *   - bestCamber: value achieved by the bolt position that minimizes camber error
 *   - bestCaster: value achieved by the bolt position that minimizes caster error
 *   These may be at DIFFERENT bolt positions because bolts affect both camber and caster.
 * 
 * @param {object} result - WheelResult from processWheel()
 * @returns {object} { 
 *   bestCamber, camberFront, camberRear, camberDelta,
 *   bestCaster, casterFront, casterRear, casterDelta
 * }
 */
function _summariseIndependent(result) {
  const { bestCamberCell, bestCasterCell } = result;

  return {
    // Best camber scenario: values from the position that minimizes camber error
    bestCamber: bestCamberCell.camber,
    bestCamberValue: bestCamberCell.camber,
    camberCasterAtBestCamber: bestCamberCell.caster,
    camberOptCamberBolt: bestCamberCell.camberBolt,
    camberOptCasterBolt: bestCamberCell.casterBolt,
    camberDelta: bestCamberCell.camberDelta,
    bestToe: bestCamberCell.toe ?? null,

    // Best caster scenario: values from the position that minimizes caster error
    bestCaster: bestCasterCell.caster,
    bestCasterValue: bestCasterCell.caster,
    casterCamberAtBestCaster: bestCasterCell.camber,
    casterOptCamberBolt: bestCasterCell.camberBolt,
    casterOptCasterBolt: bestCasterCell.casterBolt,
    casterDelta: bestCasterCell.casterDelta,
  };
}

/**
 * Symmetric compromise: average of the two wheels' best achievable values.
 * This gives the "midpoint" of what both wheels can do.
 */
function _compromiseValue(a, b) {
  return (a + b) / 2;
}

/**
 * Find the BEST POSITION PAIR for FL and FR where final VALUES are symmetric.
 * 
 * CRITICAL: This function finds pairs where:
 *   - FL and FR achieve the SAME camber value (within tolerance)
 *   - FL and FR achieve the SAME caster value (within tolerance)
 *   - FL and FR may use DIFFERENT bolt positions (and typically will!)
 * 
 * DEFINITION (Value-Based Symmetry Only):
 *   FL camber value ≈ FR camber value (can be at different bolt positions)
 *   FL caster value ≈ FR caster value (can be at different bolt positions)
 *   Bolt positions themselves are irrelevant to symmetry.
 * 
 * ALGORITHM:
 *   1. For each FL position, find all FR positions where values match within tolerance
 *   2. Among matching FR positions, choose the one closest to targets
 *   3. Score the FL-FR pair based on their combined distance to targets
 *   4. Return the highest-scoring pair (closest to targets while maintaining value symmetry)
 * 
 * TOLERANCE:
 *   - Camber: ±0.3° (symmetry tolerance from DECISIONS.md § Decision 3)
 *   - Caster: ±0.3° (symmetry tolerance from DECISIONS.md § Decision 3)
 * 
 * @param {DerivedRow[]} flRows - All 169 bolt positions and their values for FL
 * @param {DerivedRow[]} frRows - All 169 bolt positions and their values for FR
 * @param {number} targetCamber - Target camber value (e.g., -1.1°)
 * @param {number} targetCaster - Target caster value (e.g., 5.0°)
 * @returns {{flPosition, frPosition, flCamber, frCamber, flCaster, frCaster, score}} 
 *          Best symmetric pair with FL and FR achieving matching values
 */
function _findBestSymmetricPosition(flRows, frRows, targetCamber, targetCaster) {
  if (!flRows || !frRows || flRows.length === 0 || frRows.length === 0) return null;

  let bestScore = Infinity;
  let bestPair = null;

  // For each FL position, find the FR position with matching values
  for (const flRow of flRows) {
    let bestMatchFrRow = null;
    let bestMatchError = Infinity;

    // Find FR position(s) that match FL values
    for (const frRow of frRows) {
      const camberMatch = Math.abs(flRow.camber - frRow.camber);
      const casterMatch = Math.abs(flRow.caster - frRow.caster);

      // Both values must match within tolerance (±0.3° per DECISIONS.md § Decision 3)
      if (camberMatch <= SYMMETRY_TOLERANCE && casterMatch <= SYMMETRY_TOLERANCE) {
        // Among matching FR positions, prefer the one closest to targets
        const frCamberError = Math.abs(frRow.camber - targetCamber);
        const frCasterError = Math.abs(frRow.caster - targetCaster);
        const frError = frCamberError + frCasterError; // Simple combined error

        if (frError < bestMatchError) {
          bestMatchError = frError;
          bestMatchFrRow = frRow;
        }
      }
    }

    // If we found a matching FR position, score this pair
    if (bestMatchFrRow) {
      const flCamberError = Math.abs(flRow.camber - targetCamber);
      const flCasterError = Math.abs(flRow.caster - targetCaster);
      const frCamberError = Math.abs(bestMatchFrRow.camber - targetCamber);
      const frCasterError = Math.abs(bestMatchFrRow.caster - targetCaster);

      // Score: combined distance to targets for both wheels
      // (Using value error, not Golden Rule, since values are symmetric)
      const pairScore = flCamberError + flCasterError + frCamberError + frCasterError;

      if (pairScore < bestScore) {
        bestScore = pairScore;
        bestPair = {
          flPosition: { camberBolt: flRow.camberBolt, casterBolt: flRow.casterBolt },
          frPosition: { camberBolt: bestMatchFrRow.camberBolt, casterBolt: bestMatchFrRow.casterBolt },
          flCamber: flRow.camber,
          frCamber: bestMatchFrRow.camber,
          flCaster: flRow.caster,
          frCaster: bestMatchFrRow.caster,
          score: bestScore,
        };
      }
    }
  }

  // Fallback: if no value-symmetric pair found, find closest positions individually
  if (!bestPair) {
    // Find best FL position
    let bestFlRow = flRows[0];
    let bestFlScore = Infinity;
    for (const flRow of flRows) {
      const flScore = Math.abs(flRow.camber - targetCamber) + Math.abs(flRow.caster - targetCaster);
      if (flScore < bestFlScore) {
        bestFlScore = flScore;
        bestFlRow = flRow;
      }
    }

    // Find best FR position
    let bestFrRow = frRows[0];
    let bestFrScore = Infinity;
    for (const frRow of frRows) {
      const frScore = Math.abs(frRow.camber - targetCamber) + Math.abs(frRow.caster - targetCaster);
      if (frScore < bestFrScore) {
        bestFrScore = frScore;
        bestFrRow = frRow;
      }
    }

    bestPair = {
      flPosition: { camberBolt: bestFlRow.camberBolt, casterBolt: bestFlRow.casterBolt },
      frPosition: { camberBolt: bestFrRow.camberBolt, casterBolt: bestFrRow.casterBolt },
      flCamber: bestFlRow.camber,
      frCamber: bestFrRow.camber,
      flCaster: bestFlRow.caster,
      frCaster: bestFrRow.caster,
      score: bestFlScore + bestFrScore,
    };
  }

  return bestPair;
}

/**
 * Find CAMBER-ONLY symmetric pair: FL and FR positions where CAMBER values match.
 * 
 * This isolates camber optimization: finds positions on each wheel that achieve
 * the same camber value, regardless of what caster those positions produce.
 * 
 * Tolerance: ±0.05° for camber (strict; they should match closely)
 * 
 * @param {DerivedRow[]} flRows - All 169 positions for FL
 * @param {DerivedRow[]} frRows - All 169 positions for FR
 * @param {number} targetCamber - Target camber value
 * @returns {{flPosition, frPosition, flCamber, frCamber, flCasterAtBestCamber, frCasterAtBestCamber}}
 *   Best pair where camber values match, with caster values that result from those positions
 */
function _findBestSymmetricCamberPair(flRows, frRows, targetCamber) {
  if (!flRows || !frRows || flRows.length === 0 || frRows.length === 0) return null;

  const CAMBER_TOLERANCE = SYMMETRY_TOLERANCE;
  let bestScore = Infinity;
  let bestPair = null;

  // For each FL position, find FR position(s) with matching camber
  for (const flRow of flRows) {
    let bestMatchFrRow = null;
    let bestMatchError = Infinity;

    // Find FR position(s) with matching camber
    for (const frRow of frRows) {
      const camberMatch = Math.abs(flRow.camber - frRow.camber);

      // Camber must match within tolerance
      if (camberMatch <= CAMBER_TOLERANCE) {
        // If both wheels have toe values, check toe compatibility (within ±0.10 mm)
        const toeMismatch = (flRow.toe != null && frRow.toe != null) 
          ? Math.abs(flRow.toe - frRow.toe) 
          : 0;  // No penalty if one or both toe values missing

        // Toe must match within tolerance
        if (toeMismatch <= TOE_SYMMETRY_TOLERANCE) {
          // Among matching FR positions, prefer the one closest to target camber
          const frCamberError = Math.abs(frRow.camber - targetCamber);

          if (frCamberError < bestMatchError) {
            bestMatchError = frCamberError;
            bestMatchFrRow = frRow;
          }
        }
      }
    }

    // If we found a matching FR position, score this pair
    if (bestMatchFrRow) {
      const flCamberError = Math.abs(flRow.camber - targetCamber);
      const frCamberError = Math.abs(bestMatchFrRow.camber - targetCamber);
      const toeMismatch = (flRow.toe != null && bestMatchFrRow.toe != null) 
        ? Math.abs(flRow.toe - bestMatchFrRow.toe) 
        : 0;

      // Score based on how close to target camber, with toe mismatch penalty
      const pairScore = flCamberError + frCamberError + (toeMismatch * 0.5);

      if (pairScore < bestScore) {
        bestScore = pairScore;
        bestPair = {
          flPosition: { camberBolt: flRow.camberBolt, casterBolt: flRow.casterBolt },
          frPosition: { camberBolt: bestMatchFrRow.camberBolt, casterBolt: bestMatchFrRow.casterBolt },
          flCamber: flRow.camber,
          frCamber: bestMatchFrRow.camber,
          flCasterAtBestCamber: flRow.caster,      // Caster value at FL's best-camber position
          frCasterAtBestCamber: bestMatchFrRow.caster,  // Caster value at FR's best-camber position
          flToe: flRow.toe,                          // Toe value at FL's best-camber position
          frToe: bestMatchFrRow.toe,                 // Toe value at FR's best-camber position
          toeMismatch,
          score: bestScore,
        };
      }
    }
  }

  // Search result: return best pair found within ±0.3° camber and ±0.10 mm toe tolerance
  // See DECISIONS.md § Decision 3: Symmetry Tolerance
  return bestPair;
}

/**
 * Find CASTER-ONLY symmetric pair: FL and FR positions where CASTER values match.
 * 
 * This isolates caster optimization: finds positions on each wheel that achieve
 * the same caster value, regardless of what camber those positions produce.
 * 
 * Tolerance: ±SYMMETRY_TOLERANCE (0.3°) for caster matching between wheels
 * 
 * @param {DerivedRow[]} flRows - All 169 positions for FL
 * @param {DerivedRow[]} frRows - All 169 positions for FR
 * @param {number} targetCaster - Target caster value
 * @returns {{flPosition, frPosition, flCaster, frCaster, flCamberAtBestCaster, frCamberAtBestCaster}}
 *   Best pair where caster values match, with camber values that result from those positions
 */
function _findBestSymmetricCasterPair(flRows, frRows, targetCaster) {
  if (!flRows || !frRows || flRows.length === 0 || frRows.length === 0) return null;

  const CASTER_TOLERANCE = SYMMETRY_TOLERANCE;
  let bestScore = Infinity;
  let bestPair = null;

  // For each FL position, find FR position(s) with matching caster
  for (const flRow of flRows) {
    let bestMatchFrRow = null;
    let bestMatchError = Infinity;

    // Find FR position(s) with matching caster
    for (const frRow of frRows) {
      const casterMatch = Math.abs(flRow.caster - frRow.caster);

      // Caster must match within tolerance
      if (casterMatch <= CASTER_TOLERANCE) {
        // If both wheels have toe values, check toe compatibility (within ±0.10 mm)
        const toeMismatch = (flRow.toe != null && frRow.toe != null) 
          ? Math.abs(flRow.toe - frRow.toe) 
          : 0;  // No penalty if one or both toe values missing

        // Toe must match within tolerance
        if (toeMismatch <= TOE_SYMMETRY_TOLERANCE) {
          // Among matching FR positions, prefer the one closest to target caster
          const frCasterError = Math.abs(frRow.caster - targetCaster);

          if (frCasterError < bestMatchError) {
            bestMatchError = frCasterError;
            bestMatchFrRow = frRow;
          }
        }
      }
    }

    // If we found a matching FR position, score this pair
    if (bestMatchFrRow) {
      const flCasterError = Math.abs(flRow.caster - targetCaster);
      const frCasterError = Math.abs(bestMatchFrRow.caster - targetCaster);
      const toeMismatch = (flRow.toe != null && bestMatchFrRow.toe != null) 
        ? Math.abs(flRow.toe - bestMatchFrRow.toe) 
        : 0;

      // Score based on how close to target caster, with toe mismatch penalty
      const pairScore = flCasterError + frCasterError + (toeMismatch * 0.5);

      if (pairScore < bestScore) {
        bestScore = pairScore;
        bestPair = {
          flPosition: { camberBolt: flRow.camberBolt, casterBolt: flRow.casterBolt },
          frPosition: { camberBolt: bestMatchFrRow.camberBolt, casterBolt: bestMatchFrRow.casterBolt },
          flCaster: flRow.caster,
          frCaster: bestMatchFrRow.caster,
          flCamberAtBestCaster: flRow.camber,      // Camber value at FL's best-caster position
          frCamberAtBestCaster: bestMatchFrRow.camber,  // Camber value at FR's best-caster position
          flToe: flRow.toe,                          // Toe value at FL's best-caster position
          frToe: bestMatchFrRow.toe,                 // Toe value at FR's best-caster position
          toeMismatch,
          score: bestScore,
        };
      }
    }
  }

  // Search result: return best pair found within ±SYMMETRY_TOLERANCE caster and TOE_SYMMETRY_TOLERANCE
  // See DECISIONS.md § Decision 3: Symmetry Tolerance
  return bestPair;
}

/**
 * Find CAMBER-ONLY symmetric pair for REAR WHEELS: RL and RR positions where CAMBER values match.
 * 
 * Rear wheels only have CAMBER optimization (no caster adjustment on rear axle).
 * This function finds positions on RL and RR that achieve the same camber value.
 * 
 * Tolerance: ±0.3° for camber (same as front, per DECISIONS.md § Decision 3)
 * 
 * @param {DerivedRow[]} rlRows - All 169 positions for RL (Rear Left)
 * @param {DerivedRow[]} rrRows - All 169 positions for RR (Rear Right)
 * @param {number} targetCamber - Target camber value
 * @returns {{rlPosition, rrPosition, rlCamber, rrCamber, score}} 
 *   Best pair where rear camber values match within tolerance
 */
function _findBestSymmetricRearCamberPair(rlRows, rrRows, targetCamber) {
  if (!rlRows || !rrRows || rlRows.length === 0 || rrRows.length === 0) return null;

  let bestScore = Infinity;
  let bestPair = null;

  // For each RL position, find RR position(s) with matching camber
  for (const rlRow of rlRows) {
    let bestMatchRrRow = null;
    let bestMatchError = Infinity;

    // Find RR position(s) with matching camber
    for (const rrRow of rrRows) {
      const camberMatch = Math.abs(rlRow.camber - rrRow.camber);

      // Camber must match within tolerance
      if (camberMatch <= SYMMETRY_TOLERANCE) {
        // If both wheels have toe values, check toe compatibility (within ±0.10 mm)
        const toeMismatch = (rlRow.toe != null && rrRow.toe != null) 
          ? Math.abs(rlRow.toe - rrRow.toe) 
          : 0;  // No penalty if one or both toe values missing

        // Toe must match within tolerance
        if (toeMismatch <= TOE_SYMMETRY_TOLERANCE) {
          // Among matching RR positions, prefer the one closest to target camber
          const rrCamberError = Math.abs(rrRow.camber - targetCamber);

          if (rrCamberError < bestMatchError) {
            bestMatchError = rrCamberError;
            bestMatchRrRow = rrRow;
          }
        }
      }
    }

    // If we found a matching RR position, score this pair
    if (bestMatchRrRow) {
      const rlCamberError = Math.abs(rlRow.camber - targetCamber);
      const rrCamberError = Math.abs(bestMatchRrRow.camber - targetCamber);
      const toeMismatch = (rlRow.toe != null && bestMatchRrRow.toe != null) 
        ? Math.abs(rlRow.toe - bestMatchRrRow.toe) 
        : 0;

      // Score: camber error + toe penalty (lower toe mismatch is better)
      const pairScore = rlCamberError + rrCamberError + (toeMismatch * 0.5);

      if (pairScore < bestScore) {
        bestScore = pairScore;
        bestPair = {
          rlPosition: { camberBolt: rlRow.camberBolt, casterBolt: rlRow.casterBolt },
          rrPosition: { camberBolt: bestMatchRrRow.camberBolt, casterBolt: bestMatchRrRow.casterBolt },
          rlCamber: rlRow.camber,
          rrCamber: bestMatchRrRow.camber,
          rlToe: rlRow.toe,
          rrToe: bestMatchRrRow.toe,
          toeMismatch,
          score: bestScore,
        };
      }
    }
  }

  // Search result: return best pair found within ±0.3° camber and ±0.10 mm toe tolerance
  // See DECISIONS.md § Decision 3: Symmetry Tolerance
  return bestPair;
}

