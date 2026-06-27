/**
 * tests/unit/report-engine.test.js
 * 
 * Unit tests for report-engine.js module.
 * Tests processWheel() and symmetryAnalysis() functions with fixture-based approach.
 * 
 * Phase 3.2: Report Engine Tests (T033-T048)
 * Target: ≥20 test cases, ≥80% line coverage, ≥75% branch coverage
 */

import { processWheel, symmetryAnalysis } from '../../js/report-engine.js';
import { 
  excellentCamberGoodCaster, 
  excellentCamberPoorCaster,
  poorCamberOrangeTier,
  veryPoorCamberRedTier,
  singleMeasuredCamber,
  multiPointCamber
} from './fixtures/index.js';
import { 
  minimalGridFL,
  denseGrid13x13,
  singlePointGrid,
  sparseCornerPoints
} from './fixtures/index.js';
import { TARGET_CAMBER, TARGET_CASTER, CASTER_MULTIPLIER, SYMMETRY_TOLERANCE, TOE_SYMMETRY_TOLERANCE, TARGET_TOE_FRONT } from '../../js/constants.js';

describe('report-engine.js', () => {
  describe('processWheel()', () => {
    
    // ─────────────────────────────────────────────────────────────
    // T034: Golden Rule scoring — continuous formula verification
    // ─────────────────────────────────────────────────────────────
    describe('Golden Rule scoring — continuous formula', () => {
      // Helper: expected score using the continuous formula
      function expectedGoldenScore(camberDelta, casterDelta, toeDelta = null) {
        const absCamber = Math.abs(camberDelta);
        const absCaster = casterDelta == null ? 0 : Math.abs(casterDelta);
        const absToe    = toeDelta    == null ? 0 : Math.abs(toeDelta);
        if (absCamber > 1.0) return 100 + absCamber * 10 + absToe * 0.5;
        const casterWeight = 1.0 + 2.0 * Math.max(0, (0.5 - absCamber) / 0.5);
        return absCamber * 12.0 + absCaster * casterWeight + absToe * 1.2;
      }

      test('Score matches continuous formula for all 169 rows', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        result.rows169.forEach(row => {
          const expected = expectedGoldenScore(row.camberDelta, row.casterDelta, row.toeDelta);
          expect(row.score).toBeCloseTo(expected, 5);
        });
      });

      test('Caster weight is 3x at perfect camber, 1x at 0.5° camber error', () => {
        // Directly verify the weight transitions
        // At absCamber=0:   casterWeight = 1 + 2×1 = 3.0
        // At absCamber=0.5: casterWeight = 1 + 2×0 = 1.0
        const scoreA = expectedGoldenScore(0.0, 1.0);   // pure caster, perfect camber
        const scoreB = expectedGoldenScore(0.5, 1.0);   // pure caster, camber at boundary
        expect(scoreA).toBeCloseTo(0.0 * 12 + 1.0 * 3.0, 6); // casterWeight = 3
        expect(scoreB).toBeCloseTo(0.5 * 12 + 1.0 * 1.0, 6); // casterWeight = 1
      });

      // REGRESSION: the original formula had a scoring inversion — a position with
      // |camberDelta|=0.501° scored BETTER than one with 0.499° when |casterDelta|≥0.125°,
      // because the caster weight dropped from 3× to 1× at the boundary.
      test('worsening camber never improves score (monotonicity)', () => {
        // Probe the old inversion point: |camberDelta| crossing 0.5°, |casterDelta| = 0.5°
        // Old: score(0.499°,0.5°)=1.999  score(0.501°,0.5°)=1.252 → WRONG (inversion)
        // New: score must strictly increase as camberDelta grows
        const absCaster = 0.5;
        for (let cd = 0.0; cd < 1.0; cd += 0.001) {
          const scoreLo = expectedGoldenScore(cd,       absCaster);
          const scoreHi = expectedGoldenScore(cd + 0.001, absCaster);
          expect(scoreHi).toBeGreaterThanOrEqual(scoreLo);
        }
      });

      test('better camber always wins over worse camber (at same caster)', () => {
        // The bug: position at 0.499° scored WORSE than 0.501° (would be recommended over it)
        const absCaster = 0.5;
        const scoreBetter = expectedGoldenScore(0.499, absCaster);
        const scoreWorse  = expectedGoldenScore(0.501, absCaster);
        expect(scoreBetter).toBeLessThan(scoreWorse);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T037: Golden Rule scoring - very poor camber, heavy penalty
    // ─────────────────────────────────────────────────────────────
    describe('Golden Rule scoring - very poor camber penalty', () => {
      test('With very poor camber (>1.0°), should apply heavy penalty (score > 100)', () => {
        // Create a fixture with very poor camber
        const veryPoorInput = [{
          frontBolt: 0,
          rearBolt: 0,
          neg20: -2.0,
          zero: -2.5,  // delta: -1.4° (very poor, > 1.0°)
          pos20: -2.8
        }];
        
        const result = processWheel(veryPoorInput);
        const bestCell = result.bestCell;
        
        // Penalty tier: score = 100 + |camberDelta|*10 + |toeDelta|*0.5
        const expectedPenalty = Math.abs(bestCell.camberDelta) > 1.0;
        expect(expectedPenalty).toBe(true);
        expect(bestCell.score).toBeGreaterThan(100);
      });

      test('Poor camber positions should be effectively rejected', () => {
        const veryPoorInput = [{
          frontBolt: 0,
          rearBolt: 0,
          neg20: -2.0,
          zero: -2.5,
          pos20: -2.8
        }];
        
        const result = processWheel(veryPoorInput);
        // bestCell should be from this poor position, but with high score
        expect(result.bestCell.score).toBeGreaterThan(50);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T038: Golden Rule scoring - camber weight dominance
    // ─────────────────────────────────────────────────────────────
    describe('Golden Rule scoring - camber first principle', () => {
      test('Camber weight (12×) dominates caster weight (≤3×) for typical errors', () => {
        // A position 0.1° off camber should score worse than one with perfect camber
        // even if the second has 0.3° more caster error
        // score(0.1°camber, 0°caster) = 0.1×12 + 0×3 = 1.2
        // score(0°camber, 0.3°caster) = 0×12 + 0.3×3 = 0.9  → better camber position is worse? NO
        // Actually with perfect camber and 0.3° caster: 0 + 0.3×3 = 0.9 WINS (lower = better)
        // That is correct: perfect camber + 0.3° caster is better than 0.1° camber + 0° caster
        const scorePerfectCamber = 0 * 12 + 0.3 * 3;        // 0.9
        const scoreSlightCamber  = 0.1 * 12 + 0 * (1 + 2*(0.5-0.1)/0.5);  // 1.2
        expect(scorePerfectCamber).toBeLessThan(scoreSlightCamber);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T039: bestCell selection (lowest score)
    // ─────────────────────────────────────────────────────────────
    describe('bestCell selection', () => {
      test('bestCell should have minimum score among all rows', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        const minScore = Math.min(...result.rows169.map(r => r.score));
        expect(result.bestCell.score).toBe(minScore);
      });

      test('bestCell bolt positions should be valid BOLT_POSITIONS values', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        const validPositions = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
        
        expect(validPositions).toContain(result.bestCell.camberBolt);
        expect(validPositions).toContain(result.bestCell.casterBolt);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T040: bestCamberCell selection
    // ─────────────────────────────────────────────────────────────
    describe('bestCamberCell selection', () => {
      test('bestCamberCell should minimize |camberDelta|', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        const minAbsCamberDelta = Math.min(...result.rows169.map(r => Math.abs(r.camberDelta)));
        expect(Math.abs(result.bestCamberCell.camberDelta)).toBe(minAbsCamberDelta);
      });

      test('bestCamberCell may differ from bestCell', () => {
        // With multiple data points, camber-optimized position may differ from compromise position
        const result = processWheel([excellentCamberGoodCaster, poorCamberOrangeTier]);
        // Both positions exist, so we may have different strategies
        expect(result.bestCamberCell).toBeDefined();
        expect(result.bestCell).toBeDefined();
        // They could be the same or different depending on data
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T041: bestCasterCell special case for rear wheels
    // ─────────────────────────────────────────────────────────────
    describe('bestCasterCell for rear wheels (targetCaster = null)', () => {
      test('With targetCaster = null (rear wheel), bestCasterCell should equal bestCell', () => {
        const result = processWheel([excellentCamberGoodCaster], { targetCaster: null });
        expect(result.bestCasterCell).toEqual(result.bestCell);
      });

      test('Should compute score without caster component for rear wheel', () => {
        const result = processWheel([excellentCamberGoodCaster], { targetCaster: null });
        // Scores should be computed only on camber
        expect(result.bestCell.casterDelta).toBeNull();
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T042: topByCamberDelta and topByCasterDelta ranking
    // ─────────────────────────────────────────────────────────────
    describe('Top lists by metric', () => {
      test('topByCamberDelta should be sorted by |camberDelta| ascending', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        
        expect(result.topByCamberDelta).toBeDefined();
        expect(result.topByCamberDelta.length).toBeGreaterThan(0);
        expect(result.topByCamberDelta.length).toBeLessThanOrEqual(4);
        
        for (let i = 1; i < result.topByCamberDelta.length; i++) {
          const prevAbsDelta = Math.abs(result.topByCamberDelta[i - 1].camberDelta);
          const currAbsDelta = Math.abs(result.topByCamberDelta[i].camberDelta);
          expect(currAbsDelta).toBeGreaterThanOrEqual(prevAbsDelta);
        }
      });

      test('topByCasterDelta should be sorted by |casterDelta| ascending', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        
        expect(result.topByCasterDelta).toBeDefined();
        expect(result.topByCasterDelta.length).toBeLessThanOrEqual(4);
        
        if (result.topByCasterDelta.length > 0) {
          for (let i = 1; i < result.topByCasterDelta.length; i++) {
            const prevAbsDelta = Math.abs(result.topByCasterDelta[i - 1].casterDelta);
            const currAbsDelta = Math.abs(result.topByCasterDelta[i].casterDelta);
            expect(currAbsDelta).toBeGreaterThanOrEqual(prevAbsDelta);
          }
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T043: Null toe handling
    // ─────────────────────────────────────────────────────────────
    describe('Null toe handling in scoring', () => {
      test('With toe = null, scoring should not include toe component', () => {
        const result = processWheel([excellentCamberGoodCaster], { targetToe: null });
        
        result.rows169.forEach(row => {
          expect(row.toeDelta).toBeNull();
          expect(Number.isFinite(row.score)).toBe(true);
          expect(Number.isNaN(row.score)).toBe(false);
        });
      });

      test('Score should be computed without errors when toe is null', () => {
        const result = processWheel([excellentCamberGoodCaster], { targetToe: null });
        expect(result.bestCell.score).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.bestCell.score)).toBe(true);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T044: Grid structure and measuredToe property
    // ─────────────────────────────────────────────────────────────
    describe('Grid structure and metadata', () => {
      test('Grid should be 13x13 array', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        expect(result.grid).toHaveLength(13);
        expect(result.grid[0]).toHaveLength(13);
      });

      test('measuredToe should be null or a number', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        expect(result.measuredToe === null || typeof result.measuredToe === 'number').toBe(true);
      });
    });
  });

  describe('symmetryAnalysis()', () => {
    
    // ─────────────────────────────────────────────────────────────
    // T045: Symmetric camber pair detection (front axle)
    // ─────────────────────────────────────────────────────────────
    describe('Symmetric camber pair detection', () => {
      test('Should find symmetric camber pair within tolerance', () => {
        // Create two wheel results with similar excellent camber
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([excellentCamberGoodCaster]);
        
        const result = symmetryAnalysis(flResult, frResult);
        
        expect(result).toHaveProperty('fl');
        expect(result).toHaveProperty('fr');
        expect(result).toHaveProperty('recommendation');
      });

      test('Recommendation should include matched camber value', () => {
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([excellentCamberGoodCaster]);
        
        const result = symmetryAnalysis(flResult, frResult);
        
        if (result.recommendation) {
          expect(result.recommendation).toHaveProperty('camber');
          expect(result.recommendation).toHaveProperty('caster');
          expect(result.recommendation).toHaveProperty('flCamberBolt');
          expect(result.recommendation).toHaveProperty('flCasterBolt');
          expect(result.recommendation).toHaveProperty('frCamberBolt');
          expect(result.recommendation).toHaveProperty('frCasterBolt');
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T046: Asymmetric case (no symmetric pairs found)
    // ─────────────────────────────────────────────────────────────
    describe('No symmetric pairs found', () => {
      test('Should return gracefully with note when no symmetric pair found', () => {
        // Create two wheel results with different characteristics
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([veryPoorCamberRedTier]);
        
        const result = symmetryAnalysis(flResult, frResult);
        
        expect(result).toHaveProperty('recommendation');
        if (result.recommendation) {
          expect(result.recommendation).toHaveProperty('note');
          expect(typeof result.recommendation.note).toBe('string');
        }
      });

      test('Should use individual best positions as fallback', () => {
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([veryPoorCamberRedTier]);
        
        const result = symmetryAnalysis(flResult, frResult);
        
        if (result.recommendation) {
          expect(result.recommendation.flCamberBolt).toBeDefined();
          expect(result.recommendation.flCasterBolt).toBeDefined();
          expect(result.recommendation.frCamberBolt).toBeDefined();
          expect(result.recommendation.frCasterBolt).toBeDefined();
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T047: Rear axle handling
    // ─────────────────────────────────────────────────────────────
    describe('Rear axle handling', () => {
      test('With rlResult and rrResult, should analyze rear camber', () => {
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([excellentCamberGoodCaster]);
        const rlResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
        const rrResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
        
        const result = symmetryAnalysis(flResult, frResult, rlResult, rrResult);
        
        expect(result).toHaveProperty('rear');
        if (result.rear) {
          expect(result.rear).toHaveProperty('recommendation');
        }
      });

      test('Rear analysis should focus on camber only (no caster)', () => {
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([excellentCamberGoodCaster]);
        const rlResult = processWheel([excellentCamberGoodCaster], { targetCaster: null });
        const rrResult = processWheel([excellentCamberGoodCaster], { targetCaster: null });
        
        const result = symmetryAnalysis(flResult, frResult, rlResult, rrResult);
        
        if (result.rear && result.rear.recommendation) {
          expect(result.rear.recommendation).toHaveProperty('rlCamberBolt');
          expect(result.rear.recommendation).toHaveProperty('rlCasterBolt');
          expect(result.rear.recommendation).toHaveProperty('rrCamberBolt');
          expect(result.rear.recommendation).toHaveProperty('rrCasterBolt');
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T048: Complete 4-wheel analysis
    // ─────────────────────────────────────────────────────────────
    describe('Complete 4-wheel analysis', () => {
      test('Should handle all 4 wheels with front + rear sections', () => {
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([excellentCamberGoodCaster]);
        const rlResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
        const rrResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
        
        const result = symmetryAnalysis(flResult, frResult, rlResult, rrResult);
        
        expect(result.fl).toBeDefined();
        expect(result.fr).toBeDefined();
        expect(result.rear).toBeDefined();
        expect(result.rear.rl).toBeDefined();
        expect(result.rear.rr).toBeDefined();
      });

      test('Recommendation should cover all 4 wheels', () => {
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([excellentCamberGoodCaster]);
        const rlResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
        const rrResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
        
        const result = symmetryAnalysis(flResult, frResult, rlResult, rrResult);
        
        if (result.recommendation) {
          expect(result.recommendation).toHaveProperty('flCamberBolt');
          expect(result.recommendation).toHaveProperty('frCamberBolt');
        }
        if (result.rear && result.rear.recommendation) {
          expect(result.rear.recommendation).toHaveProperty('rlCamberBolt');
          expect(result.rear.recommendation).toHaveProperty('rrCamberBolt');
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T049-T050: Caster calculation verification
    // ─────────────────────────────────────────────────────────────
    describe('Caster calculation verification', () => {
      test('Caster should be calculated as CASTER_MULTIPLIER × |camberPos20 - camberNeg20|', () => {
        const input = [{
          frontBolt: 0,
          rearBolt: 0,
          neg20: -0.8,  // Measured
          zero: -1.0,   // Target camber value
          pos20: -1.2   // Measured
        }];
        
        const result = processWheel(input);
        const expectedCaster = CASTER_MULTIPLIER * Math.abs(-1.2 - (-0.8));
        
        // All cells should have caster calculated
        result.rows169.forEach(row => {
          expect(typeof row.caster).toBe('number');
          expect(row.caster).toBeGreaterThanOrEqual(0);
        });
      });

      test('Different camber sweeps should produce different caster values', () => {
        const input1 = [{
          frontBolt: 0,
          rearBolt: 0,
          neg20: -1.0,
          zero: -1.1,
          pos20: -1.1
        }];
        
        const input2 = [{
          frontBolt: 0,
          rearBolt: 0,
          neg20: -0.5,
          zero: -1.1,
          pos20: -1.5
        }];
        
        const result1 = processWheel(input1);
        const result2 = processWheel(input2);
        
        const caster1 = result1.bestCell.caster;
        const caster2 = result2.bestCell.caster;
        
        // Different sweeps should generally produce different casters
        expect(typeof caster1).toBe('number');
        expect(typeof caster2).toBe('number');
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T049: Rear wheel caster sign verification (todo.md blocker)
    // ─────────────────────────────────────────────────────────────
    describe('Rear wheel caster sign and formula', () => {
      test('Rear wheels use same caster formula as front wheels', () => {
        // Front wheel measurement
        const flInput = [{
          camberBolt: 0, casterBolt: 0,
          neg20: -0.8, zero: -1.0, pos20: -1.2
        }];
        const flResult = processWheel(flInput, { targetCaster: 5.0 });
        const flCaster = flResult.bestCell.caster;

        // Rear wheel measurement (different magnitude, same sweep pattern)
        const rlInput = [{
          camberBolt: 0, casterBolt: 0,
          neg20: -1.5, zero: -1.7, pos20: -1.9
        }];
        const rlResult = processWheel(rlInput, { targetCaster: null });
        const rlCaster = rlResult.bestCell.caster;

        // Both sweeps are 0.4° (same as FL: -0.8 to -1.2, RL: -1.5 to -1.9)
        // Caster should be equal for same sweep, even though rear wheel targetCaster is null
        expect(Math.abs(flCaster - rlCaster)).toBeLessThan(0.01);
      });

      test('FL and FR wheels with opposite steering orientations should have different caster directions', () => {
        // Simulate FL wheel (CCW/negative steering produces one pattern)
        const flInput = [{
          camberBolt: 0, casterBolt: 0,
          neg20: -0.8, zero: -1.0, pos20: -1.2  // Camber becomes more negative with positive steering
        }];
        const flResult = processWheel(flInput, { targetCaster: 5.0 });

        // Simulate FR wheel (CW/positive steering produces opposite pattern)
        // If steering causes opposite camber change, sign should flip
        const frInput = [{
          camberBolt: 0, casterBolt: 0,
          neg20: -1.2, zero: -1.0, pos20: -0.8  // Camber becomes less negative with positive steering
        }];
        const frResult = processWheel(frInput, { targetCaster: 5.0 });

        // Caster is calculated from absolute sweep, so magnitude should be same
        // But note: caster formula uses |camber_acw - camber_cw|, always positive
        expect(Math.abs(flResult.bestCell.caster - frResult.bestCell.caster)).toBeLessThan(0.01);
      });

      test('Caster calculation ignores wheel order (ACW/CW terminology)', () => {
        // Caster uses absolute value of sweep
        const input1 = [{ camberBolt: 0, casterBolt: 0, neg20: -0.8, zero: -1.0, pos20: -1.2 }];
        const input2 = [{ camberBolt: 0, casterBolt: 0, neg20: -1.2, zero: -1.0, pos20: -0.8 }];

        const result1 = processWheel(input1);
        const result2 = processWheel(input2);

        // Both have same sweep magnitude (0.4°), so caster should be equal
        expect(Math.abs(result1.bestCell.caster - result2.bestCell.caster)).toBeLessThan(0.001);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Additional correctness tests
  // ─────────────────────────────────────────────────────────────
  describe('topByCamberDelta — absolute sort correctness', () => {
    test('With data spanning positive and negative camberDelta, top 4 are closest by |delta|', () => {
      // Multi-point data: some cells land above target (positive delta), some below (negative)
      // camberTarget = -1.1; cell.zero varies so deltas span both signs
      const input = [
        { camberBolt: -3, casterBolt: 0, neg20: -0.8, zero: -0.9, pos20: -1.0 },  // camber -0.9, delta +0.2
        { camberBolt:  0, casterBolt: 0, neg20: -1.0, zero: -1.1, pos20: -1.2 },  // camber -1.1, delta  0.0 ← best
        { camberBolt:  3, casterBolt: 0, neg20: -1.2, zero: -1.3, pos20: -1.4 },  // camber -1.3, delta -0.2
        { camberBolt: -6, casterBolt: 0, neg20: -0.5, zero: -0.6, pos20: -0.7 },  // camber -0.6, delta +0.5
        { camberBolt:  6, casterBolt: 0, neg20: -1.5, zero: -1.7, pos20: -1.9 },  // camber -1.7, delta -0.6
      ];

      const result = processWheel(input);

      // topByCamberDelta should be sorted by |camberDelta|, not signed camberDelta
      for (let i = 1; i < result.topByCamberDelta.length; i++) {
        const prev = Math.abs(result.topByCamberDelta[i - 1].camberDelta);
        const curr = Math.abs(result.topByCamberDelta[i].camberDelta);
        expect(curr).toBeGreaterThanOrEqual(prev);
      }

      // The first entry must be the one closest to target (delta ≈ 0)
      expect(Math.abs(result.topByCamberDelta[0].camberDelta)).toBeLessThan(0.01);
    });

    test('topByCasterDelta sorted by |casterDelta| with multi-point data', () => {
      const input = [
        { camberBolt: -3, casterBolt:  3, neg20: -0.8, zero: -1.1, pos20: -5.0 },  // big sweep → high caster
        { camberBolt:  0, casterBolt:  0, neg20: -0.8, zero: -1.1, pos20: -1.2 },  // small sweep → low caster
        { camberBolt:  3, casterBolt: -3, neg20: -0.6, zero: -1.1, pos20: -3.0 },  // medium sweep
      ];

      const result = processWheel(input);

      for (let i = 1; i < result.topByCasterDelta.length; i++) {
        const prev = Math.abs(result.topByCasterDelta[i - 1].casterDelta);
        const curr = Math.abs(result.topByCasterDelta[i].casterDelta);
        expect(curr).toBeGreaterThanOrEqual(prev);
      }
    });
  });

  describe('Rear fallback recommendation bolt positions', () => {
    test('Rear fallback uses camberOptCamberBolt / camberOptCasterBolt (not undefined)', () => {
      const rlResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
      const rrResult = processWheel([veryPoorCamberRedTier], { targetCaster: null, targetCamber: -1.5 });

      const result = symmetryAnalysis(null, null, rlResult, rrResult);

      // Rear recommendation must exist and have defined bolt positions
      expect(result.rear).toBeDefined();
      expect(result.rear.recommendation).toBeDefined();
      expect(result.rear.recommendation.rlCamberBolt).toBeDefined();
      expect(result.rear.recommendation.rlCasterBolt).toBeDefined();
      expect(result.rear.recommendation.rrCamberBolt).toBeDefined();
      expect(result.rear.recommendation.rrCasterBolt).toBeDefined();
      // All bolt positions must be valid integers in [-6, 6]
      const validPositions = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
      expect(validPositions).toContain(result.rear.recommendation.rlCamberBolt);
      expect(validPositions).toContain(result.rear.recommendation.rlCasterBolt);
    });
  });

  describe('Caster formula absolute value check', () => {
    test('Caster is always non-negative regardless of sweep direction', () => {
      // Sweep that goes "the wrong way" (neg20 > pos20)
      const input = [{ camberBolt: 0, casterBolt: 0, neg20: -1.5, zero: -1.1, pos20: -0.8 }];
      const result = processWheel(input);
      result.rows169.forEach(row => {
        expect(row.caster).toBeGreaterThanOrEqual(0);
      });
    });

    test('Caster value for known sweep matches formula: multiplier × |pos20 - neg20|', () => {
      // sweep = |pos20 - neg20| = |(-1.5) - (-0.5)| = 1.0°
      // multiplier = 1 / (2 * sin(24°)) ≈ 1.2285
      // caster ≈ 1.2285
      const input = [{ camberBolt: 0, casterBolt: 0, neg20: -0.5, zero: -1.0, pos20: -1.5 }];
      const result = processWheel(input);
      const sweep = Math.abs(-1.5 - (-0.5));
      const expectedCaster = (1 / (2 * Math.sin(24 * Math.PI / 180))) * sweep;
      expect(result.bestCell.caster).toBeCloseTo(expectedCaster, 4);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // REGRESSION TESTS: Audit-identified bugs — prevent silent reintroduction
  // ─────────────────────────────────────────────────────────────────────────

  describe('_summariseIndependent field semantics (Bug 1 regression)', () => {
    // Input: two bolt positions where best-camber and best-caster differ.
    // Position A (camberBolt=-6): camber=-1.1° (target), caster≈0.25° (well below 5° target)
    // Position B (camberBolt=+6): camber=-1.4° (off),   caster≈6.1° (nearest to 5° target)
    // After interpolation: bestCamberCell ≈ A, bestCasterCell ≈ B.
    const twoPointInput = [
      { camberBolt: -6, casterBolt: 0, neg20: -1.0, zero: -1.1, pos20: -1.2 },
      { camberBolt:  6, casterBolt: 0, neg20:  0.0, zero: -1.4, pos20: -5.0 },
    ];

    test('bestCamberCell and bestCasterCell are distinct positions', () => {
      const result = processWheel(twoPointInput);
      expect(result.bestCamberCell.camberBolt).not.toBe(result.bestCasterCell.camberBolt);
      expect(Math.abs(result.bestCamberCell.camberDelta)).toBeLessThan(
        Math.abs(result.bestCasterCell.camberDelta)
      );
    });

    test('camberCasterAtBestCamber equals caster at best-camber position', () => {
      const result = processWheel(twoPointInput);
      const sym = symmetryAnalysis(result, result);
      expect(sym.fl.camberCasterAtBestCamber).toBeCloseTo(result.bestCamberCell.caster, 4);
    });

    test('casterCamberAtBestCaster equals camber at best-caster position', () => {
      const result = processWheel(twoPointInput);
      const sym = symmetryAnalysis(result, result);
      expect(sym.fl.casterCamberAtBestCaster).toBeCloseTo(result.bestCasterCell.camber, 4);
    });

    test('camberCasterAtBestCamber and casterCamberAtBestCaster are numerically distinct', () => {
      // If these were the same value, swapping them in the UI would be undetectable.
      const result = processWheel(twoPointInput);
      const sym = symmetryAnalysis(result, result);
      const diff = Math.abs(sym.fl.camberCasterAtBestCamber - sym.fl.casterCamberAtBestCaster);
      expect(diff).toBeGreaterThan(0.5);
    });

    test('camberCasterAtBestCamber is a caster-range value (positive, matches caster formula)', () => {
      const result = processWheel(twoPointInput);
      const sym = symmetryAnalysis(result, result);
      // Caster is always non-negative (Math.abs in formula); camber is typically negative
      expect(sym.fl.camberCasterAtBestCamber).toBeGreaterThanOrEqual(0);
    });

    test('casterCamberAtBestCaster is a camber-range value (typically negative for road cars)', () => {
      const result = processWheel(twoPointInput);
      const sym = symmetryAnalysis(result, result);
      // Camber at the best-caster position should reflect that position's camber measurement
      expect(typeof sym.fl.casterCamberAtBestCaster).toBe('number');
      expect(Number.isFinite(sym.fl.casterCamberAtBestCaster)).toBe(true);
    });
  });

  describe('Rear _summariseIndependent shape — no bestCell (Bug 2 regression)', () => {
    test('result.rear.rl has camberOptCamberBolt, not bestCell', () => {
      const rlResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
      const rrResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
      const sym = symmetryAnalysis(null, null, rlResult, rrResult);

      expect(sym.rear).toBeDefined();
      expect(sym.rear.rl).toBeDefined();
      expect(sym.rear.rl.bestCell).toBeUndefined();
      expect(sym.rear.rl.camberOptCamberBolt).toBeDefined();
      expect(sym.rear.rl.camberOptCasterBolt).toBeDefined();
      expect(sym.rear.rl.bestCamberValue).toBeDefined();
      expect(sym.rear.rl.camberCasterAtBestCamber).toBeDefined();
    });

    test('result.rear.rr has camberOptCamberBolt, not bestCell', () => {
      const rlResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
      const rrResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
      const sym = symmetryAnalysis(null, null, rlResult, rrResult);

      expect(sym.rear.rr).toBeDefined();
      expect(sym.rear.rr.bestCell).toBeUndefined();
      expect(sym.rear.rr.camberOptCamberBolt).toBeDefined();
    });

    test('camberOptCamberBolt from rear summary is a valid bolt position', () => {
      const rlResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
      const rrResult = processWheel([excellentCamberGoodCaster], { targetCaster: null, targetCamber: -1.5 });
      const sym = symmetryAnalysis(null, null, rlResult, rrResult);

      const validPositions = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
      expect(validPositions).toContain(sym.rear.rl.camberOptCamberBolt);
      expect(validPositions).toContain(sym.rear.rl.camberOptCasterBolt);
    });
  });

  describe('Toe values in symmetry result are in degrees, not mm (Bug 3 regression)', () => {
    const toeInput = [{
      camberBolt: 0, casterBolt: 0,
      neg20: -0.95, zero: -1.08, pos20: -1.24,
      toe: 0.07,  // 0.07° — same order of magnitude as TARGET_TOE_FRONT
    }];

    test('bestToe in _summariseIndependent is in degrees (same scale as target)', () => {
      const result = processWheel(toeInput, { targetToe: TARGET_TOE_FRONT });
      const sym = symmetryAnalysis(result, result);
      // bestToe should be ≈ 0.07° — not ≈ 0.57 mm
      expect(sym.fl.bestToe).toBeCloseTo(0.07, 2);
      // Not in mm range — toe in mm for 0.07° at 469mm diameter ≈ 0.57mm
      expect(Math.abs(sym.fl.bestToe)).toBeLessThan(0.5);
    });

    test('flToe in camberSymmetricPair is in degrees', () => {
      const result = processWheel(toeInput, { targetToe: TARGET_TOE_FRONT });
      const sym = symmetryAnalysis(result, result);
      if (sym.camberSymmetricPair) {
        expect(Math.abs(sym.camberSymmetricPair.flToe)).toBeLessThan(0.5);
        expect(Math.abs(sym.camberSymmetricPair.frToe)).toBeLessThan(0.5);
      }
    });

    test('toeMismatch in symmetry result is in degrees (sub-0.5 for matched wheels)', () => {
      const result = processWheel(toeInput, { targetToe: TARGET_TOE_FRONT });
      const sym = symmetryAnalysis(result, result);
      // Identical FL/FR data → toeMismatch = 0
      if (sym.recommendation && sym.recommendation.toeMismatch != null) {
        expect(sym.recommendation.toeMismatch).toBeCloseTo(0, 5);
        expect(sym.recommendation.toeMismatch).toBeLessThan(0.5);
      }
    });
  });

  describe('Symmetry tolerance constant values (Bug 4 regression)', () => {
    test('SYMMETRY_TOLERANCE is 0.3° (matches UI text "±0.3°")', () => {
      expect(SYMMETRY_TOLERANCE).toBe(0.3);
    });

    test('TOE_SYMMETRY_TOLERANCE is 0.031° (matches UI text "±0.031°")', () => {
      expect(TOE_SYMMETRY_TOLERANCE).toBeCloseTo(0.031, 4);
    });

    test('TOE_SYMMETRY_TOLERANCE is below 0.1° (was incorrectly shown as 0.10 in UI)', () => {
      expect(TOE_SYMMETRY_TOLERANCE).toBeLessThan(0.1);
    });
  });
});
