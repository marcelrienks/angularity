/**
 * diagrams-page.js — Main controller for diagrams.html.
 *
 * Handles:
 *   - Loading wheel results from localStorage
 *   - Computing and rendering washer diagrams
 *   - Section visibility based on data availability
 */

import { WHEELS, FRONT_WHEELS, REAR_WHEELS, BOLT_POSITIONS, TARGET_CAMBER, TARGET_CASTER, TARGET_CAMBER_REAR, TARGET_TOE_FRONT, TARGET_TOE_REAR, TARGET_STEERING_RATIO, TARGET_CASTER_INPUT_MODE, TARGET_CASTER_WHEEL_DEGREES, getBoltPositions } from './constants.js';
import { renderWasherSection } from './washer-diagram.js';
import { loadWheelFromStorage, loadWheelToeFromStorage } from './localstorage-io.js';
import { processWheel, symmetryAnalysis } from './report-engine.js';
import { _showError, _hideError } from './error-utils.js';

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _bindErrorClose();
  _renderDiagrams();
  _setupAutoRefresh();
});

// ── Auto-refresh on visibility change ──────────────────────────────────────

function _setupAutoRefresh() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      _renderDiagrams();
    }
  });

  window.addEventListener('focus', () => {
    _renderDiagrams();
  });

  window.addEventListener('pageshow', () => {
    _renderDiagrams();
  });
}

// ── Error handling ─────────────────────────────────────────────────────────

function _bindErrorClose() {
  const closeBtn = document.getElementById('error-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', _hideError);
  }
}

// ── Wheel targets helper ───────────────────────────────────────────────────

function _getWheelTargets(wheel) {
  return REAR_WHEELS.includes(wheel)
    ? { camber: TARGET_CAMBER_REAR, caster: null, toe: TARGET_TOE_REAR }
    : { camber: TARGET_CAMBER, caster: TARGET_CASTER, toe: TARGET_TOE_FRONT };
}

function _getWheelProcessingOptions(wheel) {
  const targets = _getWheelTargets(wheel);
  return {
    targetCamber: targets.camber,
    targetCaster: targets.caster,
    targetToe: targets.toe,
    steeringRatio: undefined,
    casterInputMode: undefined,
    casterWheelDegrees: undefined,
    measuredToe: loadWheelToeFromStorage(wheel),
  };
}

// ── Render diagrams ───────────────────────────────────────────────────────

function _renderDiagrams() {
  try {
    const recommendations = _computeRecommendations();
    const hasData = Object.values(recommendations).some(r => r !== null && r !== undefined);

    const noDataMsg = document.getElementById('no-data-msg');
    if (noDataMsg) noDataMsg.style.display = hasData ? 'none' : '';

    if (!hasData) {
      _hideSection('section-washers');
      return;
    }

    _showSection('section-washers');
    renderWasherSection('washer-container', recommendations);
  } catch (err) {
    console.error('[diagrams-page] Error rendering diagrams:', err);
    _showError(`Error rendering diagrams: ${err.message}`);
  }
}

// ── Compute recommendations ────────────────────────────────────────────────

function _computeRecommendations() {
  const results = {};
  const recommendations = {};

  // Load all wheel results from localStorage
  for (const wheel of WHEELS) {
    const wheelState = loadWheelFromStorage(wheel);
    if (!wheelState) continue;

    try {
      const gridStateRows = _gridStateToRows(wheelState);
      if (gridStateRows.length === 0) continue;

      const processedRows = _convertRowsForProcessing(gridStateRows);
      results[wheel] = processWheel(processedRows, _getWheelProcessingOptions(wheel));
    } catch (err) {
      console.error(`[diagrams-page] ${wheel} processing error:`, err.message);
    }
  }

  // Compute front recommendations
  if (results.FL || results.FR) {
    const hasBoth = results.FL && results.FR;

    if (hasBoth) {
      try {
        const sym = symmetryAnalysis(results.FL, results.FR);
        const rec = sym.recommendation;
        recommendations.FL = { camberBolt: rec.flCamberBolt, casterBolt: rec.flCasterBolt };
        recommendations.FR = { camberBolt: rec.frCamberBolt, casterBolt: rec.frCasterBolt };
      } catch (err) {
        console.error('[diagrams-page] Front symmetry analysis error:', err);
        if (results.FL) recommendations.FL = { camberBolt: results.FL.bestCell.camberBolt, casterBolt: results.FL.bestCell.casterBolt };
        if (results.FR) recommendations.FR = { camberBolt: results.FR.bestCell.camberBolt, casterBolt: results.FR.bestCell.casterBolt };
      }
    } else {
      if (results.FL) recommendations.FL = { camberBolt: results.FL.bestCell.camberBolt, casterBolt: results.FL.bestCell.casterBolt };
      if (results.FR) recommendations.FR = { camberBolt: results.FR.bestCell.camberBolt, casterBolt: results.FR.bestCell.casterBolt };
    }
  }

  // Compute rear recommendations
  if (results.RL || results.RR) {
    const hasBoth = results.RL && results.RR;

    if (hasBoth) {
      try {
        const rearSym = symmetryAnalysis(null, null, results.RL, results.RR);
        const rec = rearSym.recommendation;
        recommendations.RL = { camberBolt: rec.rlCamberBolt, casterBolt: rec.rlCasterBolt };
        recommendations.RR = { camberBolt: rec.rrCamberBolt, casterBolt: rec.rrCasterBolt };
      } catch (err) {
        console.error('[diagrams-page] Rear symmetry analysis error:', err);
        if (results.RL) recommendations.RL = { camberBolt: results.RL.bestCell.camberBolt, casterBolt: results.RL.bestCell.casterBolt };
        if (results.RR) recommendations.RR = { camberBolt: results.RR.bestCell.camberBolt, casterBolt: results.RR.bestCell.casterBolt };
      }
    } else {
      if (results.RL) recommendations.RL = { camberBolt: results.RL.bestCell.camberBolt, casterBolt: results.RL.bestCell.casterBolt };
      if (results.RR) recommendations.RR = { camberBolt: results.RR.bestCell.camberBolt, casterBolt: results.RR.bestCell.casterBolt };
    }
  }

  return recommendations;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function _gridStateToRows(wheelState) {
  const rows = [];
  const boltPositions = getBoltPositions();

  for (const f of boltPositions) {
    const fKey = wheelState[f] !== undefined ? f : String(f);
    if (!wheelState[fKey]) continue;

    for (const r of boltPositions) {
      const rKey = wheelState[fKey][r] !== undefined ? r : String(r);
      const cell = wheelState[fKey]?.[rKey];
      if (!cell) continue;

      const neg20Str = cell.neg20?.trim() ?? '';
      const zeroStr = cell.zero?.trim() ?? '';
      const pos20Str = cell.pos20?.trim() ?? '';

      if (!neg20Str && !zeroStr && !pos20Str) continue;

      const neg20 = neg20Str ? parseFloat(neg20Str) : NaN;
      const zero = zeroStr ? parseFloat(zeroStr) : NaN;
      const pos20 = pos20Str ? parseFloat(pos20Str) : NaN;

      if (!isNaN(neg20) || !isNaN(zero) || !isNaN(pos20)) {
        rows.push({
          camberBolt: f,
          casterBolt: r,
          camberNeg20: isNaN(neg20) ? 0 : neg20,
          camber0: isNaN(zero) ? 0 : zero,
          camberPos20: isNaN(pos20) ? 0 : pos20,
        });
      }
    }
  }

  return rows;
}

function _convertRowsForProcessing(gridStateRows) {
  return gridStateRows.map(r => ({
    camberBolt: r.camberBolt,
    casterBolt: r.casterBolt,
    neg20: r.camberNeg20,
    zero: r.camber0,
    pos20: r.camberPos20,
    toe: r.toe ?? null,
  }));
}

// ── Section visibility ─────────────────────────────────────────────────────

function _showSection(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}

function _hideSection(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
