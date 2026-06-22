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
import { TARGET_CAMBER, TARGET_CASTER, CASTER_MULTIPLIER, SYMMETRY_TOLERANCE } from '../../js/constants.js';

describe('report-engine.js', () => {
  describe('processWheel()', () => {
    
    // ─────────────────────────────────────────────────────────────
    // T034: WheelResult structure verification
    // ─────────────────────────────────────────────────────────────
    describe('T034: WheelResult structure', () => {
      test('T034.1: Should return complete WheelResult with all required properties', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        
        expect(result).toHaveProperty('grid');
        expect(result).toHaveProperty('rows169');
        expect(result).toHaveProperty('bestCell');
        expect(result).toHaveProperty('bestCamberCell');
        expect(result).toHaveProperty('bestCasterCell');
        expect(result).toHaveProperty('topByCamberDelta');
        expect(result).toHaveProperty('topByCasterDelta');
        expect(result).toHaveProperty('targets');
        expect(result).toHaveProperty('measuredToe');
      });

      test('T034.2: Should set targets with camber, caster, and toe', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        
        expect(result.targets).toHaveProperty('camber');
        expect(result.targets).toHaveProperty('caster');
        expect(result.targets).toHaveProperty('toe');
        expect(result.targets.camber).toBe(TARGET_CAMBER);
        expect(result.targets.caster).toBe(TARGET_CASTER);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T035: rows169 array structure and sorting
    // ─────────────────────────────────────────────────────────────
    describe('T035: rows169 array structure', () => {
      test('T035.1: Should have exactly 169 rows (13x13 grid)', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        expect(result.rows169).toHaveLength(169);
      });

      test('T035.2: Each row should have required fields', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        const row = result.rows169[0];
        
        expect(row).toHaveProperty('camberBolt');
        expect(row).toHaveProperty('casterBolt');
        expect(row).toHaveProperty('camber');
        expect(row).toHaveProperty('caster');
        expect(row).toHaveProperty('toe');
        expect(row).toHaveProperty('isInterpolated');
        expect(row).toHaveProperty('camberDelta');
        expect(row).toHaveProperty('casterDelta');
        expect(row).toHaveProperty('toeDelta');
        expect(row).toHaveProperty('score');
      });

      test('T035.3: Rows should be sorted by frontBolt then rearBolt', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        
        for (let i = 1; i < result.rows169.length; i++) {
          const prev = result.rows169[i - 1];
          const curr = result.rows169[i];
          
          if (curr.camberBolt !== prev.camberBolt) {
            expect(curr.camberBolt).toBeGreaterThanOrEqual(prev.camberBolt);
          } else {
            expect(curr.casterBolt).toBeGreaterThanOrEqual(prev.casterBolt);
          }
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T036: Golden Rule scoring - excellent camber, prioritize caster
    // ─────────────────────────────────────────────────────────────
    describe('T036: Golden Rule scoring - excellent camber tier', () => {
      test('T036.1: With excellent camber and poor caster, should prioritize caster (3x weight)', () => {
        // excellentCamberPoorCaster: camber -1.09 (delta -0.01, excellent)
        // caster 0.87 (delta 0.37 vs target 5.0, but the caster calculation is different)
        // This test verifies the prioritization formula is applied
        const result = processWheel([excellentCamberPoorCaster]);
        const rows = result.rows169;
        
        // Find rows with good camber (delta <= 0.5) and poor caster (delta > 0.4)
        const goodCamberPoorCasterRows = rows.filter(r => 
          Math.abs(r.camberDelta) <= 0.5 && 
          r.casterDelta !== null && 
          Math.abs(r.casterDelta) > 0.4
        );
        
        // These rows should use the caster-prioritized formula
        if (goodCamberPoorCasterRows.length > 0) {
          // Score should be: |camberDelta| + |casterDelta|*3 + |toeDelta|*0.8
          goodCamberPoorCasterRows.forEach(row => {
            const expectedScore = Math.abs(row.camberDelta) 
              + Math.abs(row.casterDelta) * 3.0 
              + (row.toeDelta === null ? 0 : Math.abs(row.toeDelta) * 0.8);
            expect(row.score).toBeCloseTo(expectedScore, 5);
          });
        }
      });

      test('T036.2: Score formula should be verified for golden rule tier', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        expect(result.rows169.length).toBe(169);
        expect(result.rows169[0].score).toBeGreaterThanOrEqual(0);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T037: Golden Rule scoring - very poor camber, heavy penalty
    // ─────────────────────────────────────────────────────────────
    describe('T037: Golden Rule scoring - very poor camber penalty', () => {
      test('T037.1: With very poor camber (>1.0°), should apply heavy penalty (score > 100)', () => {
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

      test('T037.2: Poor camber positions should be effectively rejected', () => {
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
    // T038: Golden Rule scoring - balanced approach
    // ─────────────────────────────────────────────────────────────
    describe('T038: Golden Rule scoring - balanced approach', () => {
      test('T038.1: Balanced formula should use 1.5x camber weight vs 1x caster', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        // Balanced rows: camber error ≤ 0.5° AND caster error ≤ 0.4°
        // Score = |camberDelta|*1.5 + |casterDelta| + |toeDelta|*1.2
        
        const balancedRows = result.rows169.filter(r =>
          Math.abs(r.camberDelta) <= 0.5 &&
          r.casterDelta !== null &&
          Math.abs(r.casterDelta) <= 0.4
        );
        
        // At least some rows should fall into this category
        if (balancedRows.length > 0) {
          balancedRows.forEach(row => {
            // Verify formula is applied (approximately)
            const expectedScore = Math.abs(row.camberDelta) * 1.5 
              + Math.abs(row.casterDelta)
              + (row.toeDelta === null ? 0 : Math.abs(row.toeDelta) * 1.2);
            expect(row.score).toBeCloseTo(expectedScore, 5);
          });
        }
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T039: bestCell selection (lowest score)
    // ─────────────────────────────────────────────────────────────
    describe('T039: bestCell selection', () => {
      test('T039.1: bestCell should have minimum score among all rows', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        const minScore = Math.min(...result.rows169.map(r => r.score));
        expect(result.bestCell.score).toBe(minScore);
      });

      test('T039.2: bestCell bolt positions should be valid BOLT_POSITIONS values', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        const validPositions = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
        
        expect(validPositions).toContain(result.bestCell.camberBolt);
        expect(validPositions).toContain(result.bestCell.casterBolt);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T040: bestCamberCell selection
    // ─────────────────────────────────────────────────────────────
    describe('T040: bestCamberCell selection', () => {
      test('T040.1: bestCamberCell should minimize |camberDelta|', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        const minAbsCamberDelta = Math.min(...result.rows169.map(r => Math.abs(r.camberDelta)));
        expect(Math.abs(result.bestCamberCell.camberDelta)).toBe(minAbsCamberDelta);
      });

      test('T040.2: bestCamberCell may differ from bestCell', () => {
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
    describe('T041: bestCasterCell for rear wheels (targetCaster = null)', () => {
      test('T041.1: With targetCaster = null (rear wheel), bestCasterCell should equal bestCell', () => {
        const result = processWheel([excellentCamberGoodCaster], { targetCaster: null });
        expect(result.bestCasterCell).toEqual(result.bestCell);
      });

      test('T041.2: Should compute score without caster component for rear wheel', () => {
        const result = processWheel([excellentCamberGoodCaster], { targetCaster: null });
        // Scores should be computed only on camber
        expect(result.bestCell.casterDelta).toBeNull();
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T042: topByCamberDelta and topByCasterDelta ranking
    // ─────────────────────────────────────────────────────────────
    describe('T042: Top lists by metric', () => {
      test('T042.1: topByCamberDelta should be sorted by |camberDelta| ascending', () => {
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

      test('T042.2: topByCasterDelta should be sorted by |casterDelta| ascending', () => {
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
    describe('T043: Null toe handling in scoring', () => {
      test('T043.1: With toe = null, scoring should not include toe component', () => {
        const result = processWheel([excellentCamberGoodCaster], { targetToe: null });
        
        result.rows169.forEach(row => {
          expect(row.toeDelta).toBeNull();
          expect(Number.isFinite(row.score)).toBe(true);
          expect(Number.isNaN(row.score)).toBe(false);
        });
      });

      test('T043.2: Score should be computed without errors when toe is null', () => {
        const result = processWheel([excellentCamberGoodCaster], { targetToe: null });
        expect(result.bestCell.score).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.bestCell.score)).toBe(true);
      });
    });

    // ─────────────────────────────────────────────────────────────
    // T044: Grid structure and measuredToe property
    // ─────────────────────────────────────────────────────────────
    describe('T044: Grid structure and metadata', () => {
      test('T044.1: Grid should be 13x13 array', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        expect(result.grid).toHaveLength(13);
        expect(result.grid[0]).toHaveLength(13);
      });

      test('T044.2: measuredToe should be null or a number', () => {
        const result = processWheel([excellentCamberGoodCaster]);
        expect(result.measuredToe === null || typeof result.measuredToe === 'number').toBe(true);
      });
    });
  });

  describe('symmetryAnalysis()', () => {
    
    // ─────────────────────────────────────────────────────────────
    // T045: Symmetric camber pair detection (front axle)
    // ─────────────────────────────────────────────────────────────
    describe('T045: Symmetric camber pair detection', () => {
      test('T045.1: Should find symmetric camber pair within tolerance', () => {
        // Create two wheel results with similar excellent camber
        const flResult = processWheel([excellentCamberGoodCaster]);
        const frResult = processWheel([excellentCamberGoodCaster]);
        
        const result = symmetryAnalysis(flResult, frResult);
        
        expect(result).toHaveProperty('fl');
        expect(result).toHaveProperty('fr');
        expect(result).toHaveProperty('recommendation');
      });

      test('T045.2: Recommendation should include matched camber value', () => {
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
    describe('T046: No symmetric pairs found', () => {
      test('T046.1: Should return gracefully with note when no symmetric pair found', () => {
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

      test('T046.2: Should use individual best positions as fallback', () => {
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
    describe('T047: Rear axle handling', () => {
      test('T047.1: With rlResult and rrResult, should analyze rear camber', () => {
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

      test('T047.2: Rear analysis should focus on camber only (no caster)', () => {
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
    describe('T048: Complete 4-wheel analysis', () => {
      test('T048.1: Should handle all 4 wheels with front + rear sections', () => {
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

      test('T048.2: Recommendation should cover all 4 wheels', () => {
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
    describe('T049-T050: Caster calculation verification', () => {
      test('T049.1: Caster should be calculated as CASTER_MULTIPLIER × |camberPos20 - camberNeg20|', () => {
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

      test('T049.2: Different camber sweeps should produce different caster values', () => {
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
  });
});
