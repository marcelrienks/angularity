/**
 * Symmetry Fixtures: Front-left/right and rear axle pair tests
 * 
 * Symmetry Tolerance (from research.md):
 * - Camber: ±0.3° between FL and FR (or RL and RR)
 * - Caster: ±0.15° between FL and FR
 * - Rear wheels: targetCaster = null (no caster adjustment)
 */

/**
 * Front axle: Perfectly symmetric camber
 * FL camber = FR camber (within ±0.3°)
 */
export const flFrSymmetricCamber = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.12,    // Within ±0.3° of FL (-1.10°)
    caster: 5.01,
  },
};

/**
 * Front axle: Perfectly symmetric caster
 * FL caster = FR caster (within ±0.15°)
 */
export const flFrSymmetricCaster = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.12,    // Within ±0.15° of FL (5.00°)
  },
};

/**
 * Front axle: Asymmetric (not symmetric)
 * Camber difference > 0.3° (exceeds tolerance)
 */
export const flFrAsymmetricCamber = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.00,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.45,    // Difference: 0.45°, exceeds ±0.3° tolerance
    caster: 5.00,
  },
};

/**
 * Front axle: Asymmetric caster
 * Caster difference > 0.15° (exceeds tolerance)
 */
export const flFrAsymmetricCaster = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.20,    // Difference: 0.20°, exceeds ±0.15° tolerance
  },
};

/**
 * Rear axle: Symmetric camber
 * RL camber = RR camber (within ±0.3°)
 * Note: targetCaster = null (no caster for rear wheels)
 */
export const rlRrSymmetricCamber = {
  rl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.50,
    caster: null,     // Rear wheel: no caster
    targetCaster: null,
  },
  rr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.52,    // Within ±0.3° of RL
    caster: null,
    targetCaster: null,
  },
};

/**
 * Rear axle: Asymmetric camber
 * RL camber differs from RR by > 0.3°
 */
export const rlRrAsymmetricCamber = {
  rl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.40,
    caster: null,
    targetCaster: null,
  },
  rr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.80,    // Difference: 0.40°, exceeds ±0.3° tolerance
    caster: null,
    targetCaster: null,
  },
};

/**
 * Mixed: Front symmetric, rear symmetric
 * All axes meet symmetry tolerance
 */
export const frontSymmetricRearSymmetric = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.12,
    caster: 5.12,
  },
  rl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.50,
    caster: null,
    targetCaster: null,
  },
  rr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.52,
    caster: null,
    targetCaster: null,
  },
};

/**
 * Mixed: Front asymmetric, rear symmetric
 * Only front fails symmetry check
 */
export const frontAsymmetricRearSymmetric = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.00,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.45,    // Asymmetric from FL
    caster: 5.00,
  },
  rl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.50,
    caster: null,
    targetCaster: null,
  },
  rr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.50,    // Symmetric with RL
    caster: null,
    targetCaster: null,
  },
};

/**
 * Mixed: Front symmetric, rear asymmetric
 * Only rear fails symmetry check
 */
export const frontSymmetricRearAsymmetric = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,    // Symmetric with FL
    caster: 5.00,
  },
  rl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.40,
    caster: null,
    targetCaster: null,
  },
  rr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.80,    // Asymmetric from RL
    caster: null,
    targetCaster: null,
  },
};

/**
 * Front only (no rear wheels)
 * Tests symmetry with optional rear parameters
 */
export const frontOnlySymmetric = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.10,
    caster: 5.00,
  },
};

/**
 * Front only (asymmetric)
 * Tests symmetry failure with optional rear parameters omitted
 */
export const frontOnlyAsymmetric = {
  fl: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.00,
    caster: 5.00,
  },
  fr: {
    frontBolt: 0,
    rearBolt: 0,
    camber: -1.50,
    caster: 5.00,
  },
};

/**
 * All symmetric: Best case scenario
 * All wheels symmetric within tolerance
 */
export const allSymmetric = {
  fl: { camber: -1.10, caster: 5.00 },
  fr: { camber: -1.11, caster: 5.01 },
  rl: { camber: -1.50, caster: null },
  rr: { camber: -1.50, caster: null },
};

/**
 * All asymmetric: Worst case scenario
 * All axes fail symmetry checks
 */
export const allAsymmetric = {
  fl: { camber: -1.00, caster: 5.00 },
  fr: { camber: -1.50, caster: 5.20 },  // Asymmetric on both axes
  rl: { camber: -1.30, caster: null },
  rr: { camber: -1.80, caster: null },   // Asymmetric camber
};
