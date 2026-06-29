/**
 * report-page.js — Main controller for report.html.
 *
 * Handles:
 *   - Section visibility
 *   - 13×13 summary table rendering (Section 2.1)
 *   - Main chart (Section 2.2) via chart-builder.js
 *   - Symmetry analysis (Section 2.3) via report-engine.js
 */

import { REQUIRED_POSITIONS, BOLT_POSITIONS, COLOURS, TARGET_CAMBER, TARGET_CASTER,
         TARGET_CAMBER_REAR, TARGET_TOE_FRONT, TARGET_TOE_REAR, TARGET_STEERING_RATIO, TARGET_CASTER_INPUT_MODE, TARGET_CASTER_WHEEL_DEGREES, TARGET_WHEEL_DIAMETER, CAMBER_THRESHOLDS, CASTER_THRESHOLDS, TOE_THRESHOLDS,
         WHEELS, FRONT_WHEELS, REAR_WHEELS, WHEEL_LABELS,
         SYMMETRY_TOLERANCE, getBoltPositions, getCurrentMeasurementDensity } from './constants.js';
import { processWheel, symmetryAnalysis } from './report-engine.js';
import { buildScatterChart, destroyChart, updateChartNote } from './chart-builder.js';
import { loadFullGridState, loadWheelFromStorage, loadWheelToeFromStorage, hasSufficientData, invalidateCache } from './localstorage-io.js';
import { calculateCaster, toeDegreesToResultantMm } from './math-utils.js';
import { _th } from './table-utils.js';
import { _sign } from './format-utils.js';
import { _showError, _hideError, _showWarning, _hideWarning } from './error-utils.js';

// ── Storage & state ────────────────────────────────────────────────────────

/** @type {Object<string, object|null>} */
const results = Object.fromEntries(WHEELS.map(wheel => [wheel, null]));

/** @type {{ main: Chart|null }} */
const charts = { main: null };

/** Active wheel tab for multi-wheel sections */
let activeTableWheel  = 'FL';
let activeChartWheel  = 'FL';

function _getWheelTargets(wheel) {
  return REAR_WHEELS.includes(wheel)
    ? { camber: TARGET_CAMBER_REAR, caster: null, toe: TARGET_TOE_REAR, steeringRatio: null, casterInputMode: null, casterWheelDegrees: null }
    : {
        camber: TARGET_CAMBER,
        caster: TARGET_CASTER,
        toe: TARGET_TOE_FRONT,
        steeringRatio: TARGET_STEERING_RATIO,
        casterInputMode: TARGET_CASTER_INPUT_MODE,
        casterWheelDegrees: TARGET_CASTER_WHEEL_DEGREES,
      };
}

function _getWheelProcessingOptions(wheel) {
  const targets = _getWheelTargets(wheel);
  return {
    targetCamber: targets.camber,
    targetCaster: targets.caster,
    targetToe: targets.toe,
    steeringRatio: targets.steeringRatio,
    casterInputMode: targets.casterInputMode,
    casterWheelDegrees: targets.casterWheelDegrees,
    measuredToe: loadWheelToeFromStorage(wheel),
  };
}

function _getWheelCasterOptions(wheel, result = null) {
  const mode = result?.targets?.casterInputMode ?? _getWheelTargets(wheel).casterInputMode;
  const wheelDegrees = result?.targets?.casterWheelDegrees ?? _getWheelTargets(wheel).casterWheelDegrees;
  const steeringRatio = result?.targets?.steeringRatio ?? _getWheelTargets(wheel).steeringRatio;

  if (mode === 'wheel-degrees' && Number.isFinite(Number(wheelDegrees)) && Number(wheelDegrees) > 0) {
    return { wheelDegrees: Number(wheelDegrees) };
  }

  return { steeringRatio: _getWheelSteeringRatio(wheel, result) };
}

function _getWheelSteeringRatio(wheel, result = null) {
  const ratio = result?.targets?.steeringRatio ?? _getWheelTargets(wheel).steeringRatio;
  return Number.isFinite(Number(ratio)) && Number(ratio) > 0 ? Number(ratio) : TARGET_STEERING_RATIO;
}

function _getLoadedWheels() {
  return WHEELS.filter(wheel => results[wheel] != null);
}

function _ensureActiveWheel(activeWheel, loadedWheels) {
  return loadedWheels.includes(activeWheel) ? activeWheel : (loadedWheels[0] ?? 'FL');
}

function _hasAxlePair(axleWheels) {
  return axleWheels.every(wheel => results[wheel] != null);
}

// ── Validation & Data Gate ────────────────────────────────────────────────

// (Validation now happens dynamically as data is loaded via  
//  _loadFromLocalStorage and _loadFromDataFiles)

// ── Error/Info Banners ─────────────────────────────────────────────────────

/**
 * Clear the error/insufficient data message banner.
 */
function _clearInsufficientDataMessage() {
  const banner = document.getElementById('error-banner');
  if (banner) {
    banner.innerHTML = '';
    banner.style.display = 'none';
  }
}

// ── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Always bind UI controls first
  _bindWheelTabs();

  // Load data ONLY from localStorage (user's previous session)
  _loadFromLocalStorage();

  // Set up auto-refresh event listeners for when page becomes active
  _setupAutoRefresh();
});


// ── Auto-load from localStorage (session data) ────────────────────────────

/**
 * Load gridState from localStorage (input page session data) for each wheel independently.
 * Called first on page load, on page visibility changes, and by manual refresh button.
 * Each wheel's data is stored and loaded separately.
 * Converts gridState format to measurement row format and processes wheels.
 */
function _loadFromLocalStorage() {
  try {
    // Reset results cache to ensure fresh load from localStorage
    for (const wheel of WHEELS) {
      results[wheel] = null;
    }
    
    // Load each wheel independently using per-wheel keys
    for (const wheel of WHEELS) {
      const wheelState = loadWheelFromStorage(wheel);
      if (!wheelState) continue;

      try {
        // Convert gridState[wheel] to measurement row format
        const gridStateRows = _gridStateToRows(wheelState);
        if (gridStateRows.length === 0) continue;

        // Convert property names from gridState format to processWheel format
        const processedRows = _convertRowsForProcessing(gridStateRows);
        results[wheel] = processWheel(processedRows, _getWheelProcessingOptions(wheel));
        _updateStatus(wheel, '(from browser memory)', gridStateRows.length);
      } catch (wheelErr) {
        console.error(`[report-page] ${wheel} processing error:`, wheelErr.message);
      }
    }
    
    // Rebuild UI to show any loaded data
    const hasData = _getLoadedWheels().length > 0;
    if (hasData) {
      _rebuildAll();
      _clearInsufficientDataMessage();
    }
  } catch (err) {
    console.error('[report-page] localStorage error:', err?.message || err);
    // Corrupt or unrecognised localStorage — fail silently
  }
}

/**
 * Set up auto-refresh event listeners to reload from localStorage when the report page becomes active.
 * Triggers on: page visibility change, window focus, and page show (back/forward navigation).
 */
function _setupAutoRefresh() {
  // Detect tab/window focus changes
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      _loadFromLocalStorage();
    }
  });
  
  // Detect window focus (user switches back to this window)
  window.addEventListener('focus', () => {
    _loadFromLocalStorage();
  });
  
  // Detect back/forward navigation to this page
  window.addEventListener('pageshow', (event) => {
    _loadFromLocalStorage();
  });
}

/**
 * Convert gridState for a wheel into an array of measurement row objects.
 * Only includes positions that have at least one non-empty input value.
 *
 * JSON deserialization converts numeric keys to strings, so we access with both
 * numeric and string keys.
 *
 * @param {Object} wheelState - gridState[wheel] (may have string keys from JSON.parse)
 * @returns {Array<{camberBolt:number, casterBolt:number, camberNeg20:number, camber0:number, camberPos20:number}>}
 */
function _gridStateToRows(wheelState) {
  const rows = [];
  const boltPositions = getBoltPositions();

  for (const f of boltPositions) {
    // JSON.parse converts numeric keys to strings
    const fKey = wheelState[f] !== undefined ? f : String(f);
    if (!wheelState[fKey]) continue;

    for (const r of boltPositions) {
      // JSON.parse converts numeric keys to strings
      const rKey = wheelState[fKey][r] !== undefined ? r : String(r);
      const cell = wheelState[fKey]?.[rKey];
      if (!cell) continue;

      // Extract values; skip row if all are empty
      const neg20Str = cell.neg20?.trim() ?? '';
      const zeroStr  = cell.zero?.trim()  ?? '';
      const pos20Str = cell.pos20?.trim() ?? '';

      if (!neg20Str && !zeroStr && !pos20Str) continue;

      // Convert to numbers (empty string → NaN, which will be handled by parseFloat)
      const neg20 = neg20Str ? parseFloat(neg20Str) : NaN;
      const zero  = zeroStr  ? parseFloat(zeroStr)  : NaN;
      const pos20 = pos20Str ? parseFloat(pos20Str) : NaN;

      // Only add row if at least one value is numeric
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

// ── Master rebuild ─────────────────────────────────────────────────────────

function _rebuildAll() {
  const loadedWheels = _getLoadedWheels();
  const hasAny = loadedWheels.length > 0;
  const hasFrontPair = _hasAxlePair(FRONT_WHEELS);
  const hasRearPair = _hasAxlePair(REAR_WHEELS);

  // No-data placeholder
  const noDataMsg = document.getElementById('no-data-msg');
  if (noDataMsg) noDataMsg.style.display = hasAny ? 'none' : '';

  if (!hasAny) return;

  activeTableWheel = _ensureActiveWheel(activeTableWheel, loadedWheels);
  activeChartWheel = _ensureActiveWheel(activeChartWheel, loadedWheels);

  _rebuildWheelTabs(loadedWheels);
  _renderSummaryTable();
  _renderToeSummary();
  _renderSymmetry();

  _showSection('section-table');
  _showSection('section-chart');
  _renderMainChart();

  if (hasFrontPair || hasRearPair) {
    _showSection('section-symmetry');
  } else {
    _hideSection('section-symmetry');
  }
}

// ── Wheel tabs ─────────────────────────────────────────────────────────────

function _bindWheelTabs() {
  const groups = [
    { selector: '#table-wheel-tabs button',       setter: w => { activeTableWheel = w; _renderSummaryTable(); } },
    { selector: '#chart-wheel-tabs button',       setter: w => { activeChartWheel = w; _renderMainChart(); } },
  ];

  for (const { selector, setter } of groups) {
    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setter(btn.dataset.wheel);
      });
    });
  }
}

/**
 * Re-render all analysis sections when data is refreshed.
 */
function _rebuildAnalysisSections() {
  _renderSummaryTable();
  _renderMainChart();
  _renderToeSummary();
  _renderSymmetry();
}

function _rebuildWheelTabs(loadedWheels) {
  const tabMap = [
    ['#table-wheel-tabs',       activeTableWheel],
    ['#chart-wheel-tabs',       activeChartWheel],
  ];

  for (const [sel, activeWheel] of tabMap) {
    const el = document.querySelector(sel);
    if (!el) continue;
    el.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.wheel === activeWheel);
    });
  }
}

// ── Section 2.1: Summary Table ─────────────────────────────────────────────

/**
 * Identify the top 3-5 closest matches for camber and caster targets.
 * Returns a Map of position keys to indicator types ('camber', 'caster', 'both').
 * Uses pre-sorted arrays from report-engine.js to avoid redundant sorting.
 * @param {object} result - The WheelResult object from processWheel()
 * @param {string} wheel - The wheel ID
 * @returns {Map<string, string>} Map of 'f,r' → 'camber'|'caster'|'both'
 */
function _getTopTargetMatches(result, wheel) {
  const { topByCamberDelta, topByCasterDelta, topByToeDelta } = result;
  const isRearWheel = REAR_WHEELS.includes(wheel);

  // Convert pre-sorted rows to keys
  const topCamber = topByCamberDelta.map(r => `${r.camberBolt},${r.casterBolt}`);
  const topSecondary = isRearWheel
    ? topByToeDelta.map(r => `${r.camberBolt},${r.casterBolt}`)
    : topByCasterDelta.map(r => `${r.camberBolt},${r.casterBolt}`);

  // Build result map
  const result_map = new Map();
  for (const key of topCamber) {
    if (topSecondary.includes(key)) {
      result_map.set(key, 'both');        // Both targets close
    } else {
      result_map.set(key, 'camber');      // Only camber close
    }
  }
  for (const key of topSecondary) {
    if (!result_map.has(key)) {
      const label = isRearWheel ? 'toe' : 'caster';
      result_map.set(key, label);         // Only secondary target close
    }
  }

  return result_map;
}

function _renderSummaryTable() {
  const container = document.getElementById('table-container');
  if (!container) return;

  // Always show only the selected wheel
  const result = results[activeTableWheel];
  if (!result) { 
    container.innerHTML = ''; 
    return; 
  }

  container.innerHTML = '';
  container.appendChild(_buildTable(result));
}

/**
 * Build a table highlighting a specific (front, rear) position.
 * Used for Phase 2 to show both wheels at the same symmetric position.
 */
function _buildTableHighlightingPosition(result, highlightFront, highlightRear) {
  const { grid } = result;
  const targetMatches = _getTopTargetMatches(result, activeTableWheel);
  const isRearWheel = REAR_WHEELS.includes(activeTableWheel);
  const measuredToe = Number(result.measuredToe);
  const rearToe = Number.isFinite(measuredToe) ? measuredToe : null;

  const table = document.createElement('table');
  table.className = 'data-table';

  // ── Header row: rear bolt positions ───────────────────────────────────
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  const columnMetricLabel = isRearWheel ? 'Toe' : 'Camber';
  const columnMetricClass = isRearWheel ? 'metric-toe' : 'metric-camber';
  const rowMetricLabel = isRearWheel ? 'Camber' : 'Caster';
  const rowMetricClass = isRearWheel ? 'metric-camber' : 'metric-caster';
  _th(headerRow, `<span class="${columnMetricClass}">${columnMetricLabel}</span>→<br><span class="${rowMetricClass}">${rowMetricLabel}</span>↓`, 'col-label-row', true);
  for (const r of BOLT_POSITIONS) {
    const th = _th(headerRow, `<span class="${columnMetricClass}">${_sign(r)}</span>`, '', true);
    if (REQUIRED_POSITIONS.includes(r)) th.classList.add('required-header');
  }

  // ── Data rows ──────────────────────────────────────────────────────────
  const tbody = table.createTBody();
  for (let ri = 0; ri < BOLT_POSITIONS.length; ri++) {
    const f = BOLT_POSITIONS[ri];
    const tr = tbody.insertRow();

    // Row header
    const rowLbl = tr.insertCell();
    rowLbl.className = 'row-label sub-header';
    if (REQUIRED_POSITIONS.includes(f)) rowLbl.classList.add('required-header');
    rowLbl.innerHTML = `<span class="${rowMetricClass}">${_sign(f)}</span>`;

    for (let fi = 0; fi < BOLT_POSITIONS.length; fi++) {
      const r     = BOLT_POSITIONS[fi];
      const cell  = grid[fi][ri];
      if (!cell) continue;  // Skip unmeasured positions
      const camber = +cell.zero.toFixed(2);
      const caster = +(calculateCaster(cell.neg20, cell.pos20, _getWheelCasterOptions(activeTableWheel, result))).toFixed(2);
      const isHighlighted = (cell.camberBolt === highlightFront && cell.casterBolt === highlightRear);
      
      const key = `${cell.camberBolt},${cell.casterBolt}`;
      const matchType = targetMatches.get(key);

      const td = tr.insertCell();
      if (cell.isInterpolated)  td.classList.add('interpolated');
      if (isHighlighted)        td.classList.add('highlighted-position'); // Symmetric position

      // Add target indicator classes based on top matches
      let isHighlightedCell = false;
      if (matchType === 'both') {
        td.classList.add('best-both');       // Both targets met
        isHighlightedCell = true;
      } else if (matchType === 'camber') {
        td.classList.add('best-camber');     // Camber target met (blue)
        isHighlightedCell = true;
      } else if (matchType === 'caster') {
        td.classList.add('best-caster');     // Caster target met (green)
        isHighlightedCell = true;
      } else if (matchType === 'toe') {
        td.classList.add('best-toe');        // Toe target met (orange)
        isHighlightedCell = true;
      }

      if (REQUIRED_POSITIONS.includes(r)) {
        td.classList.add('required-col');
      }

      const metricClass = _metricValueClass({ camber, caster, toe: rearToe }, activeTableWheel);
      const metricValue = _formatSelectedMetricValue({ camber, caster, toe: rearToe }, isRearWheel);

      // Add muted class for non-highlighted cells (only best matches and symmetric positions are bright)
      const isMuted = !isHighlightedCell && !isHighlighted;
      const mutedClass = isMuted ? 'muted' : '';

      td.innerHTML = `
        <div class="cell-value">
          <div class="${selectedMetric} ${metricClass} ${mutedClass}">${metricValue}</div>
        </div>`;
    }
  }

  return table;
}

function _buildTable(result) {
  const { grid, measuredBolts } = result;
  const targetMatches = _getTopTargetMatches(result, activeTableWheel);
  const isRearWheel = REAR_WHEELS.includes(activeTableWheel);
  const measuredToe = Number(result.measuredToe);
  const rearToe = Number.isFinite(measuredToe) ? measuredToe : null;

  // Use measured bolt positions, not hardcoded 13
  const measuredCamber = measuredBolts.camber;  // e.g., [-2, -1, 0, 1, 2] for 5x5 config
  const measuredCaster = measuredBolts.caster;

  const table = document.createElement('table');
  table.className = 'data-table';

  // ── Header row: rear bolt positions ───────────────────────────────────
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  const columnMetricLabel = isRearWheel ? 'Toe' : 'Camber';
  const columnMetricClass = isRearWheel ? 'metric-toe' : 'metric-camber';
  const rowMetricLabel = isRearWheel ? 'Camber' : 'Caster';
  const rowMetricClass = isRearWheel ? 'metric-camber' : 'metric-caster';
  _th(headerRow, `<span class="${columnMetricClass}">${columnMetricLabel}</span>→<br><span class="${rowMetricClass}">${rowMetricLabel}</span>↓`, 'col-label-row', true);
  for (const r of measuredCamber) {
    const th = _th(headerRow, `<span class="${columnMetricClass}">${_sign(r)}</span>`, '', true);
    if (REQUIRED_POSITIONS.includes(r)) th.classList.add('required-header');
  }

  // ── Data rows ──────────────────────────────────────────────────────────
  const tbody = table.createTBody();
  for (const f of measuredCaster) {
    const tr = tbody.insertRow();

    // Row header
    const rowLbl = tr.insertCell();
    rowLbl.className = 'row-label sub-header';
    if (REQUIRED_POSITIONS.includes(f)) rowLbl.classList.add('required-header');
    rowLbl.innerHTML = `<span class="${rowMetricClass}">${_sign(f)}</span>`;

    for (const r of measuredCamber) {
      const fi = BOLT_POSITIONS.indexOf(r);
      const ri = BOLT_POSITIONS.indexOf(f);
      const cell  = grid[fi][ri];
      if (!cell) continue;  // Skip unmeasured positions
      const camber = +cell.zero.toFixed(2);
      const caster = +(calculateCaster(cell.neg20, cell.pos20, _getWheelCasterOptions(activeTableWheel, result))).toFixed(2);
      const toe = rearToe;

      const key = `${cell.camberBolt},${cell.casterBolt}`;
      const matchType = targetMatches.get(key);

      const td = tr.insertCell();
      if (cell.isInterpolated)  td.classList.add('interpolated');

      // Add target indicator classes based on top matches
      let isHighlightedCell = false;
      if (matchType === 'both') {
        td.classList.add('best-both');       // Both targets met
        isHighlightedCell = true;
      } else if (matchType === 'camber') {
        td.classList.add('best-camber');     // Camber target met (blue)
        isHighlightedCell = true;
      } else if (matchType === 'caster') {
        td.classList.add('best-caster');     // Caster target met (green)
        isHighlightedCell = true;
      } else if (matchType === 'toe') {
        td.classList.add('best-toe');        // Toe target met (orange)
        isHighlightedCell = true;
      }

      if (REQUIRED_POSITIONS.includes(r)) {
        td.classList.add('required-col');
      }

      const weightClass = !isHighlightedCell ? 'muted' : 'bold';
      const sizeClass = !isHighlightedCell ? 'cell-value-small' : 'cell-value-large';

      // Format both values: camber always, plus caster (front) or toe (rear)
      const camberValue = `${camber > 0 ? '+' : ''}${camber.toFixed(2)}°`;
      let secondValue = '';
      let secondLabel = '';

      if (isRearWheel) {
        secondLabel = 'Toe';
        if (toe != null && !Number.isNaN(Number(toe))) {
          secondValue = `${Number(toe) >= 0 ? '+' : ''}${Number(toe).toFixed(2)}°`;
        } else {
          secondValue = 'n/a';
        }
      } else {
        secondLabel = 'Caster';
        secondValue = `${caster.toFixed(2)}°`;
      }

      td.innerHTML = `
        <div class="cell-value ${weightClass} ${sizeClass}">
          <div class="metric-camber">${camberValue}</div>
          <div class="metric-${secondLabel.toLowerCase()}">${secondValue}</div>
        </div>`;
    }
  }

  return table;
}

/**
 * Determine selected-metric color class.
 * @param {number} camber - Camber value
 * @param {number} caster - Caster value
 * @param {string} wheel - Wheel identifier
 * @returns {string} CSS class: 'target-met', 'near-target', or 'off-target'
 */
function _valueClass(camber, caster, wheel) {
  const targets = _getWheelTargets(wheel);

  if (selectedMetric === 'caster' && targets.caster != null) {
    const delta = Math.abs(caster - targets.caster);
    if (delta <= CASTER_THRESHOLDS.targetMet)  return 'target-met';
    if (delta <= CASTER_THRESHOLDS.nearTarget) return 'near-target';
    return 'off-target';
  } else {
    // Default: camber
    const delta = Math.abs(camber - targets.camber);
    if (delta <= CAMBER_THRESHOLDS.targetMet)  return 'target-met';
    if (delta <= CAMBER_THRESHOLDS.nearTarget) return 'near-target';
    return 'off-target';
  }
}

function _toeValueClass(toe, wheel) {
  if (toe == null || Number.isNaN(Number(toe))) return 'off-target';
  const targets = _getWheelTargets(wheel);
  const delta = Math.abs(Number(toe) - targets.toe);
  if (delta <= TOE_THRESHOLDS.targetMet) return 'target-met';
  if (delta <= TOE_THRESHOLDS.nearTarget) return 'near-target';
  return 'off-target';
}

function _metricValueClass(values, wheel) {
  if (selectedMetric === 'toe') {
    return _toeValueClass(values.toe, wheel);
  }
  return _valueClass(values.camber, values.caster, wheel);
}

function _formatSelectedMetricValue(values, isRearWheel) {
  if (selectedMetric === 'camber') {
    const camber = Number(values.camber);
    return `${camber > 0 ? '+' : ''}${camber.toFixed(2)}°`;
  }

  if (selectedMetric === 'toe') {
    if (!isRearWheel || values.toe == null || Number.isNaN(Number(values.toe))) return 'n/a';
    const toe = Number(values.toe);
    return `${toe >= 0 ? '+' : ''}${toe.toFixed(2)}°`;
  }

  const caster = Number(values.caster);
  return `${caster.toFixed(2)}°`;
}

// ── Section 2.2: Main Chart ────────────────────────────────────────────────

function _renderMainChart() {
  destroyChart(charts.main);
  charts.main = null;

  const result = results[activeChartWheel];
  if (!result) return;

  charts.main = buildScatterChart('main-chart', result.rows169, activeChartWheel, result.targets ?? _getWheelTargets(activeChartWheel));
  updateChartNote(result.targets ?? _getWheelTargets(activeChartWheel));
}

function _renderToeSummary() {
  const el = document.getElementById('toe-summary');
  if (!el) return;

  const result = results[activeTableWheel];
  if (!result) {
    el.textContent = '';
    return;
  }

  const targetToeDeg = result.targets?.toe ?? _getWheelTargets(activeTableWheel).toe;
  const measuredToeDeg = result.measuredToe;

  if (measuredToeDeg == null || Number.isNaN(Number(measuredToeDeg))) {
    el.textContent = `${activeTableWheel} toe: not measured (target ${targetToeDeg >= 0 ? '+' : ''}${targetToeDeg.toFixed(2)}° per wheel)`;
    return;
  }

  const deltaDeg = Number(measuredToeDeg) - targetToeDeg;
  const absDeltaDeg = Math.abs(deltaDeg);
  const status = absDeltaDeg <= TOE_THRESHOLDS.targetMet
    ? 'on target'
    : absDeltaDeg <= TOE_THRESHOLDS.nearTarget
      ? 'near target'
      : 'off target';

  const perWheelMm = toeDegreesToResultantMm(Number(measuredToeDeg), TARGET_WHEEL_DIAMETER);
  const axleTotalMm = perWheelMm * 2;
  el.textContent = `${activeTableWheel} toe ${Number(measuredToeDeg) >= 0 ? '+' : ''}${Number(measuredToeDeg).toFixed(2)}° per wheel (target ${targetToeDeg >= 0 ? '+' : ''}${targetToeDeg.toFixed(2)}°, Δ ${deltaDeg >= 0 ? '+' : ''}${deltaDeg.toFixed(2)}°, ${status}; resultant ~${perWheelMm >= 0 ? '+' : ''}${perWheelMm.toFixed(2)} mm/wheel, axle ~${axleTotalMm >= 0 ? '+' : ''}${axleTotalMm.toFixed(2)} mm)`;
}

// ── Section 2.3: Symmetry Analysis ────────────────────────────────────────

function _renderSymmetry() {
  try {
    const container = document.getElementById('symmetry-container');
    if (!container) return;
    container.innerHTML = '';

    const frontSym = _hasAxlePair(FRONT_WHEELS) ? symmetryAnalysis(results.FL, results.FR) : null;
    const rearSym = _hasAxlePair(REAR_WHEELS) ? symmetryAnalysis(null, null, results.RL, results.RR) : null;

    if (!frontSym && !rearSym) return;
    const recommendedSection = document.createElement('div');
    recommendedSection.className = 'symmetry-analysis-section';

    const recommendedTitle = document.createElement('h2');
    recommendedTitle.className = 'header';
    recommendedTitle.textContent = 'Recommended Summary';
    recommendedSection.appendChild(recommendedTitle);

    const recommendedDesc = document.createElement('p');
    recommendedDesc.className = 'paragraph';
    recommendedDesc.textContent = 'Best overall compromise for left/right symmetry, prioritizing target alignment values.';
    recommendedSection.appendChild(recommendedDesc);

    if (frontSym) {
      const frontSubsection = document.createElement('div');
      frontSubsection.className = 'symmetry-subsection';

      const frontSubtitle = document.createElement('h3');
      frontSubtitle.className = 'sub-header';
      frontSubtitle.textContent = 'Front Axle (FL ↔ FR)';
      frontSubsection.appendChild(frontSubtitle);

      frontSubsection.appendChild(_buildFrontConsolidationTableWithStatus(frontSym));
      recommendedSection.appendChild(frontSubsection);
    }

    if (rearSym) {
      const rearSubsection = document.createElement('div');
      rearSubsection.className = 'symmetry-subsection';

      const rearSubtitle = document.createElement('h3');
      rearSubtitle.className = 'sub-header';
      rearSubtitle.textContent = 'Rear Axle (RL ↔ RR)';
      rearSubsection.appendChild(rearSubtitle);

      // Pass rearSym.rear which contains the rear-specific analysis
      rearSubsection.appendChild(_buildRearConsolidationTable(rearSym.rear));
      recommendedSection.appendChild(rearSubsection);
    }

    container.appendChild(recommendedSection);

    // ── 2. INDEPENDENT OPTIMIZATIONS ───────────────────────────────────────
    const independentSection = document.createElement('div');
    independentSection.className = 'symmetry-analysis-section';

    const independentTitle = document.createElement('h2');
    independentTitle.className = 'header';
    independentTitle.textContent = 'Independent Optimizations';
    independentSection.appendChild(independentTitle);

    const independentDesc = document.createElement('p');
    independentDesc.className = 'paragraph';
    independentDesc.textContent = 'Each wheel optimized separately, showing best camber and best caster scenarios with their resulting cross-metric values.';
    independentSection.appendChild(independentDesc);

    if (frontSym) {
      const frontIndepSubsection = document.createElement('div');
      frontIndepSubsection.className = 'symmetry-subsection';

      const frontIndepSubtitle = document.createElement('h3');
      frontIndepSubtitle.className = 'sub-header';
      frontIndepSubtitle.textContent = 'Front Wheels (FL & FR)';
      frontIndepSubsection.appendChild(frontIndepSubtitle);

      const frontIndepGrid = document.createElement('div');
      frontIndepGrid.className = 'symmetry-grid';

      for (const [wheel, data] of [['FL', frontSym.fl], ['FR', frontSym.fr]]) {
        const card = _buildIndependentOptimizationCard(wheel, data);
        frontIndepGrid.appendChild(card);
      }

      frontIndepSubsection.appendChild(frontIndepGrid);
      independentSection.appendChild(frontIndepSubsection);
    }

    if (rearSym) {
      const rearIndepSubsection = document.createElement('div');
      rearIndepSubsection.className = 'symmetry-subsection';

      const rearIndepSubtitle = document.createElement('h3');
      rearIndepSubtitle.className = 'sub-header';
      rearIndepSubtitle.textContent = 'Rear Wheels (RL & RR)';
      rearIndepSubsection.appendChild(rearIndepSubtitle);

      const rearIndepGrid = document.createElement('div');
      rearIndepGrid.className = 'symmetry-grid';

      if (rearSym.rear && rearSym.rear.rl && rearSym.rear.rr) {
        for (const [wheel, wheelData] of [['RL', rearSym.rear.rl], ['RR', rearSym.rear.rr]]) {
          if (wheelData && wheelData.camberOptCamberBolt != null) {
            const bestCell = {
              camberBolt: wheelData.camberOptCamberBolt,
              casterBolt: wheelData.camberOptCasterBolt,
              camber: wheelData.bestCamberValue,
              caster: wheelData.camberCasterAtBestCamber,
            };
            const card = _buildRearIndependentOptimizationCard(wheel, bestCell, TARGET_CAMBER_REAR);
            rearIndepGrid.appendChild(card);
          }
        }
      }

      rearIndepSubsection.appendChild(rearIndepGrid);
      independentSection.appendChild(rearIndepSubsection);
    }

    container.appendChild(independentSection);

    // ── 3. SYMMETRY OPTIONS ────────────────────────────────────────────────
    const optionsSection = document.createElement('div');
    optionsSection.className = 'symmetry-analysis-section';

    const optionsTitle = document.createElement('h2');
    optionsTitle.className = 'header';
    optionsTitle.textContent = 'Symmetry Options';
    optionsSection.appendChild(optionsTitle);

    const optionsDesc = document.createElement('p');
    optionsDesc.className = 'paragraph';
    optionsDesc.textContent = 'Alternative symmetric pairings where both wheels lock to matching alignment values (within tolerance).';
    optionsSection.appendChild(optionsDesc);

    if (frontSym) {
      const frontOptSubsection = document.createElement('div');
      frontOptSubsection.className = 'symmetry-subsection';

      const frontOptSubtitle = document.createElement('h3');
      frontOptSubtitle.className = 'sub-header';
      frontOptSubtitle.textContent = 'Front Axle Pairs';
      frontOptSubsection.appendChild(frontOptSubtitle);

      const frontOptGrid = document.createElement('div');
      frontOptGrid.className = 'symmetry-grid';
      frontOptGrid.classList.add('symmetry-grid--single');

      // Camber Symmetry Pair
      if (frontSym.camberSymmetricPair) {
        const camberCard = _buildSymmetryPairCard('Camber Symmetry Pair', frontSym.camberSymmetricPair, 'camber');
        frontOptGrid.appendChild(camberCard);
      } else {
        const noPairDiv = document.createElement('div');
        noPairDiv.className = 'empty-state';
        noPairDiv.textContent = 'No camber symmetry pair found within ±0.3° tolerance';
        frontOptGrid.appendChild(noPairDiv);
      }

      // Caster Symmetry Pair
      if (frontSym.casterSymmetricPair) {
        const casterCard = _buildSymmetryPairCard('Caster Symmetry Pair', frontSym.casterSymmetricPair, 'caster');
        frontOptGrid.appendChild(casterCard);
      } else {
        const noPairDiv = document.createElement('div');
        noPairDiv.className = 'empty-state';
        noPairDiv.textContent = 'No caster symmetry pair found within ±0.3° tolerance';
        frontOptGrid.appendChild(noPairDiv);
      }

      // Toe Symmetry Pair
      if (frontSym.camberSymmetricPair || frontSym.casterSymmetricPair) {
        const toeCard = _buildToeSymmetryPairCard('Toe Symmetry Pair', frontSym.camberSymmetricPair || frontSym.casterSymmetricPair, 'FL/FR');
        frontOptGrid.appendChild(toeCard);
      }

      frontOptSubsection.appendChild(frontOptGrid);
      optionsSection.appendChild(frontOptSubsection);
    }

    if (rearSym && rearSym.rear) {
      const rearOptSubsection = document.createElement('div');
      rearOptSubsection.className = 'symmetry-subsection';

      const rearOptSubtitle = document.createElement('h3');
      rearOptSubtitle.className = 'sub-header';
      rearOptSubtitle.textContent = 'Rear Axle Pairs';
      rearOptSubsection.appendChild(rearOptSubtitle);

      const rearOptGrid = document.createElement('div');
      rearOptGrid.className = 'symmetry-grid';
      rearOptGrid.classList.add('symmetry-grid--single');

      // Camber Symmetry Pair
      if (rearSym.rear.camberSymmetricPair) {
        const rearCamberCard = _buildRearSymmetryPairCard('Camber Symmetry Pair', rearSym.rear, rearSym.rear.camberSymmetricPair);
        rearOptGrid.appendChild(rearCamberCard);
      } else {
        const noPairDiv = document.createElement('div');
        noPairDiv.className = 'empty-state';
        noPairDiv.textContent = 'No rear camber symmetry pair found within ±0.3° tolerance';
        rearOptGrid.appendChild(noPairDiv);
      }

      // Toe Symmetry Pair
      if (rearSym.rear.camberSymmetricPair) {
        const rearToeCard = _buildToeSymmetryPairCard('Toe Symmetry Pair', rearSym.rear.camberSymmetricPair, 'RL/RR');
        rearOptGrid.appendChild(rearToeCard);
      } else {
        const noToeMsgDiv = document.createElement('div');
        noToeMsgDiv.className = 'empty-state';
        noToeMsgDiv.textContent = 'Toe data not available without camber symmetric pair';
        rearOptGrid.appendChild(noToeMsgDiv);
      }

      rearOptSubsection.appendChild(rearOptGrid);
      optionsSection.appendChild(rearOptSubsection);
    }

    container.appendChild(optionsSection);
  } catch (err) {
    const container = document.getElementById('symmetry-container');
    if (container) {
      container.innerHTML = `<div style="color:red; padding:16px; font-family:monospace; font-size:0.75rem;"><div><strong>ERROR:</strong> ${err.message}</div><div style="margin-top:8px; white-space:pre-wrap; font-size:0.7rem;">${err.stack}</div></div>`;
    }
  }
}

function _buildAxleHeading(title, description) {
  const wrap = document.createElement('div');
  wrap.className = 'axle-heading';
  wrap.innerHTML = `
    <div class="label-uppercase">${title}</div>
    <div class="axle-heading-desc">${description}</div>`;
  return wrap;
}

/**
 * Build independent optimization card for front wheels (FL or FR)
 * Shows best camber scenario and best caster scenario side-by-side
 */
function _buildIndependentOptimizationCard(wheel, data) {
  const card = document.createElement('div');
  card.className = 'symmetry-card';

  card.innerHTML = `
    <div class="title">${wheel}</div>
    <div class="scenario-grid">
      <div class="scenario-col">
        <div class="scenario-header">Optimize Camber</div>
        <table class="scenario-table">
          <thead><tr>
            <th class="sct-metric"></th>
            <th class="sct-bolt">Bolt</th>
            <th class="sct-result">Achieved</th>
            <th class="sct-vs">vs Target</th>
          </tr></thead>
          <tbody>
            <tr>
              <td class="sct-metric"><span class="metric-camber">Camber</span></td>
              <td class="sct-bolt">${_sign(data.camberOptCamberBolt)}</td>
              <td class="sct-result">${data.bestCamberValue.toFixed(2)}°</td>
              <td class="sct-vs">Δ ${_delta(data.camberDelta)}°</td>
            </tr>
            <tr class="sct-side-effect">
              <td class="sct-metric"><span class="metric-caster">Caster</span></td>
              <td class="sct-bolt">${_sign(data.camberOptCasterBolt)}</td>
              <td class="sct-result">${data.camberCasterAtBestCamber.toFixed(2)}°</td>
              <td class="sct-vs">side effect</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="scenario-col scenario-col--right">
        <div class="scenario-header">Optimize Caster</div>
        <table class="scenario-table">
          <thead><tr>
            <th class="sct-metric"></th>
            <th class="sct-bolt">Bolt</th>
            <th class="sct-result">Achieved</th>
            <th class="sct-vs">vs Target</th>
          </tr></thead>
          <tbody>
            <tr>
              <td class="sct-metric"><span class="metric-caster">Caster</span></td>
              <td class="sct-bolt">${_sign(data.casterOptCasterBolt)}</td>
              <td class="sct-result">${data.bestCasterValue.toFixed(2)}°</td>
              <td class="sct-vs">Δ ${_delta(data.casterDelta)}°</td>
            </tr>
            <tr class="sct-side-effect">
              <td class="sct-metric"><span class="metric-camber">Camber</span></td>
              <td class="sct-bolt">${_sign(data.casterOptCamberBolt)}</td>
              <td class="sct-result">${data.casterCamberAtBestCaster.toFixed(2)}°</td>
              <td class="sct-vs">side effect</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
  return card;
}

/**
 * Build independent optimization card for rear wheels (RL or RR)
 * Shows best camber scenario only (rear has no caster)
 */
function _buildRearIndependentOptimizationCard(wheel, bestCell, targetCamber) {
  const card = document.createElement('div');
  card.className = 'symmetry-card';

  card.innerHTML = `
    <div class="title">${wheel}</div>
    <div>
      <div class="symmetry-metric front-bolt">
        <span class="label">Best <span class="metric-camber">Camber</span> Camber Bolt</span>
        <span class="value">${_sign(bestCell.camberBolt)}</span>
      </div>
      <div class="symmetry-metric rear-bolt">
        <span class="label">Best <span class="metric-camber">Camber</span> Toe Bolt</span>
        <span class="value">${_sign(bestCell.casterBolt)}</span>
      </div>
      <div class="symmetry-metric camber">
        <span class="label"><span class="metric-camber">Camber</span></span>
        <span class="value">${bestCell.camber.toFixed(2)}°</span>
        <span class="symmetry-target">Target: ${targetCamber.toFixed(2)}° &nbsp; Δ ${_delta(bestCell.camber - targetCamber)}°</span>
      </div>
      <div class="symmetry-metric caster symmetry-metric--compact">
        <span class="label"><span class="metric-caster">Resulting Caster</span></span>
        <span class="value">${bestCell.caster.toFixed(2)}°</span>
      </div>
    </div>`;
  return card;
}

/**
 * Build symmetric pair card for front wheels
 * Shows FL and FR achieving matching camber or caster values
 */
function _buildSymmetryPairCard(title, pairData, metricType) {
  const card = document.createElement('div');
  card.className = 'symmetry-card';

  const flMetricValue = metricType === 'camber' ? pairData.flCamber : pairData.flCaster;
  const frMetricValue = metricType === 'camber' ? pairData.frCamber : pairData.frCaster;
  const avgMetricValue = (flMetricValue + frMetricValue) / 2;
  const resultingMetric = metricType === 'camber' ? 'Resulting Caster' : 'Resulting Camber';
  const resultingFL = metricType === 'camber' ? pairData.flCasterAtBestCamber : pairData.flCamberAtBestCaster;
  const resultingFR = metricType === 'camber' ? pairData.frCasterAtBestCamber : pairData.frCamberAtBestCaster;
  const metricLabel = metricType === 'camber' ? 'Camber' : 'Caster';
  const metricClass = metricType === 'camber' ? 'metric-camber' : 'metric-caster';
  const metricLabelLower = metricLabel.toLowerCase();
  const resultingClass = metricType === 'camber' ? 'metric-caster' : 'metric-camber';

  card.innerHTML = `
    <div class="title">${title}</div>
    <div class="section-desc">FL and FR achieve matching <span class="${metricClass}">${metricLabelLower}</span> (avg ${avgMetricValue.toFixed(2)}°)</div>
    <div class="scenario-grid">
      <div class="scenario-col">
        <div class="scenario-header">FL</div>
        <div class="bolt-values-grid">
          <div class="bolts-col">
            <div class="symmetry-metric front-bolt symmetry-metric--compact">
              <span class="label">Camber Bolt</span>
              <span class="value">${_sign(pairData.flPosition.camberBolt)}</span>
            </div>
            <div class="symmetry-metric rear-bolt symmetry-metric--compact">
              <span class="label">Caster Bolt</span>
              <span class="value">${_sign(pairData.flPosition.casterBolt)}</span>
            </div>
          </div>
          <div class="values-col">
            <div class="symmetry-metric ${metricType} symmetry-metric--compact">
              <span class="label"><span class="${metricClass}">${metricLabel}</span></span>
              <span class="value">${flMetricValue.toFixed(2)}°</span>
            </div>
            <div class="symmetry-metric ${metricType === 'camber' ? 'caster' : 'camber'} symmetry-metric--compact">
              <span class="label"><span class="${resultingClass}">${resultingMetric}</span></span>
              <span class="value">${resultingFL.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>
      <div class="scenario-col scenario-col--right">
        <div class="scenario-header">FR</div>
        <div class="bolt-values-grid">
          <div class="bolts-col">
            <div class="symmetry-metric front-bolt symmetry-metric--compact">
              <span class="label">Camber Bolt</span>
              <span class="value">${_sign(pairData.frPosition.camberBolt)}</span>
            </div>
            <div class="symmetry-metric rear-bolt symmetry-metric--compact">
              <span class="label">Caster Bolt</span>
              <span class="value">${_sign(pairData.frPosition.casterBolt)}</span>
            </div>
          </div>
          <div class="values-col">
            <div class="symmetry-metric ${metricType} symmetry-metric--compact">
              <span class="label"><span class="${metricClass}">${metricLabel}</span></span>
              <span class="value">${frMetricValue.toFixed(2)}°</span>
            </div>
            <div class="symmetry-metric ${metricType === 'camber' ? 'caster' : 'camber'} symmetry-metric--compact">
              <span class="label"><span class="${resultingClass}">${resultingMetric}</span></span>
              <span class="value">${resultingFR.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  return card;
}

/**
 * Build rear symmetric pair card (camber only)
 */
function _buildRearSymmetryPairCard(title, rearData, rearPair) {
  const card = document.createElement('div');
  card.className = 'symmetry-card';

  // rearPair has the structure: { rlPosition, rrPosition, rlCamber, rrCamber, rlToe, rrToe, toeMismatch }
  if (!rearPair || !rearPair.rlPosition || !rearPair.rrPosition) {
    card.innerHTML = '<div class="empty-state">Rear symmetric pair data incomplete</div>';
    return card;
  }

  const camberValue = rearPair.rlCamber;

  card.innerHTML = `
    <div class="title">${title}</div>
    <div class="section-desc">RL and RR achieve matching <span class="metric-camber">camber</span> (${camberValue.toFixed(2)}°)</div>
    <div class="scenario-grid">
      <div class="scenario-col">
        <div class="scenario-header">RL</div>
        <div class="bolt-values-grid">
          <div class="bolts-col">
            <div class="symmetry-metric front-bolt symmetry-metric--compact">
              <span class="label">Camber Bolt</span>
              <span class="value">${_sign(rearPair.rlPosition.camberBolt)}</span>
            </div>
            <div class="symmetry-metric rear-bolt symmetry-metric--compact">
              <span class="label">Toe Bolt</span>
              <span class="value">${_sign(rearPair.rlPosition.casterBolt)}</span>
            </div>
          </div>
          <div class="values-col">
            <div class="symmetry-metric camber symmetry-metric--compact">
              <span class="label"><span class="metric-camber">Camber</span></span>
              <span class="value">${camberValue.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>
      <div class="scenario-col scenario-col--right">
        <div class="scenario-header">RR</div>
        <div class="bolt-values-grid">
          <div class="bolts-col">
            <div class="symmetry-metric front-bolt symmetry-metric--compact">
              <span class="label">Camber Bolt</span>
              <span class="value">${_sign(rearPair.rrPosition.camberBolt)}</span>
            </div>
            <div class="symmetry-metric rear-bolt symmetry-metric--compact">
              <span class="label">Toe Bolt</span>
              <span class="value">${_sign(rearPair.rrPosition.casterBolt)}</span>
            </div>
          </div>
          <div class="values-col">
            <div class="symmetry-metric camber symmetry-metric--compact">
              <span class="label"><span class="metric-camber">Camber</span></span>
              <span class="value">${camberValue.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  return card;
}

/**
 * Build Toe Symmetry Pair Card (front or rear wheels)
 */
function _buildToeSymmetryPairCard(title, pairData, wheelPrefix = 'FL/FR') {
  const leftWheel = wheelPrefix.split('/')[0];
  const rightWheel = wheelPrefix.split('/')[1];
  const isRear = leftWheel === 'RL';

  // Get toe properties based on wheel prefix
  const leftToeValue = isRear ? pairData.rlToe : pairData.flToe;
  const rightToeValue = isRear ? pairData.rrToe : pairData.frToe;

  if (!pairData || leftToeValue == null || rightToeValue == null) {
    const notAvailable = document.createElement('div');
    notAvailable.className = 'empty-state';
    notAvailable.textContent = 'Toe data not available for this pair';
    return notAvailable;
  }

  const toeMismatchStable = pairData.toeMismatch != null && pairData.toeMismatch <= 0.031;
  const toeMismatchClass = toeMismatchStable ? 'match' : 'partial';

  // Bolt labels differ between front and rear suspension
  const frontBoltLabel = 'Camber Bolt';
  const rearBoltLabel = isRear ? 'Toe Bolt' : 'Caster Bolt';

  const card = document.createElement('div');
  card.className = 'symmetry-card';

  card.innerHTML = `
    <div class="title">${title}</div>
    <div class="section-desc">${leftWheel} and ${rightWheel} <span class="metric-toe">toe</span> mismatch: ${(pairData.toeMismatch || 0).toFixed(3)}° (within ±0.031° limit)</div>
    <div class="scenario-grid">
      <div class="scenario-col">
        <div class="scenario-header">${leftWheel}</div>
        <div class="bolt-values-grid">
          <div class="bolts-col">
            <div class="symmetry-metric front-bolt symmetry-metric--compact">
              <span class="label">${frontBoltLabel}</span>
              <span class="value">${_sign(isRear ? pairData.rlPosition.camberBolt : pairData.flPosition.camberBolt)}</span>
            </div>
            <div class="symmetry-metric rear-bolt symmetry-metric--compact">
              <span class="label">${rearBoltLabel}</span>
              <span class="value">${_sign(isRear ? pairData.rlPosition.casterBolt : pairData.flPosition.casterBolt)}</span>
            </div>
          </div>
          <div class="values-col">
            <div class="symmetry-metric toe symmetry-metric--compact">
              <span class="label"><span class="metric-toe">Toe</span></span>
              <span class="value">${(leftToeValue || 0).toFixed(3)}°</span>
            </div>
          </div>
        </div>
      </div>
      <div class="scenario-col scenario-col--right">
        <div class="scenario-header">${rightWheel}</div>
        <div class="bolt-values-grid">
          <div class="bolts-col">
            <div class="symmetry-metric front-bolt symmetry-metric--compact">
              <span class="label">${frontBoltLabel}</span>
              <span class="value">${_sign(isRear ? pairData.rrPosition.camberBolt : pairData.frPosition.camberBolt)}</span>
            </div>
            <div class="symmetry-metric rear-bolt symmetry-metric--compact">
              <span class="label">${rearBoltLabel}</span>
              <span class="value">${_sign(isRear ? pairData.rrPosition.casterBolt : pairData.frPosition.casterBolt)}</span>
            </div>
          </div>
          <div class="values-col">
            <div class="symmetry-metric toe symmetry-metric--compact">
              <span class="label"><span class="metric-toe">Toe</span></span>
              <span class="value">${(rightToeValue || 0).toFixed(3)}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  return card;
}

/**
 * Build Rear Consolidation Table (RL ↔ RR Symmetry Summary)
 */
function _buildRearConsolidationTable(rearSymmetryResult) {
  const div = document.createElement('div');

  if (!rearSymmetryResult || !rearSymmetryResult.recommendation) {
    div.textContent = 'No rear symmetry data available';
    return div;
  }

  const recommendation = rearSymmetryResult.recommendation;
  const hasPair = rearSymmetryResult.camberSymmetricPair !== null;

  const status = document.createElement('div');
  status.className = hasPair ? 'symmetry-status match' : 'symmetry-status partial';
  status.innerHTML = `
    <div class="status-title">${hasPair ? '✓ Rear <span class="metric-camber">Camber</span> Match Found' : '◐ Rear <span class="metric-camber">Camber</span> Approximation'}</div>
    <div class="status-note">${recommendation.note}</div>`;
  div.appendChild(status);

  const table = document.createElement('table');
  table.className = 'symmetry-consolidation-table';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `
    <th>Metric</th>
    <th>Compromise</th>
    <th>RL Bolts</th>
    <th>RR Bolts</th>
  `;
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  const camberRow = document.createElement('tr');
  
  // Safeguard: check if recommendation has the fields
  const rlCamberBoltBolt = recommendation.rlCamberBolt != null ? _sign(recommendation.rlCamberBolt) : '—';
  const rlCasterBoltBolt = recommendation.rlCasterBolt != null ? _sign(recommendation.rlCasterBolt) : '—';
  const rrCamberBoltBolt = recommendation.rrCamberBolt != null ? _sign(recommendation.rrCamberBolt) : '—';
  const rrCasterBoltBolt = recommendation.rrCasterBolt != null ? _sign(recommendation.rrCasterBolt) : '—';
  
  camberRow.innerHTML = `
    <td class="bold-cell"><span class="metric-camber">Camber</span></td>
    <td>${recommendation.camber.toFixed(2)}°</td>
    <td><div>Camber:${rlCamberBoltBolt}</div><div>Toe:${rlCasterBoltBolt}</div></td>
    <td><div>Camber:${rrCamberBoltBolt}</div><div>Toe:${rrCasterBoltBolt}</div></td>
  `;
  tbody.appendChild(camberRow);

  // Add toe row if available
  if (recommendation.rlToe !== undefined && recommendation.rrToe !== undefined) {
    const toeRow = document.createElement('tr');
    const toeLabel = recommendation.toeMismatch !== undefined && recommendation.toeMismatch <= 0.1 
      ? '✓ Toe' 
      : recommendation.toeMismatch !== undefined 
        ? '◐ Toe' 
        : 'Toe';
    toeRow.innerHTML = `
      <td class="bold-cell"><span class="metric-toe">${toeLabel}</span></td>
      <td>${recommendation.rlToe ? recommendation.rlToe.toFixed(3) : '—'}°</td>
      <td colspan="2" class="note-cell">RL: ${recommendation.rlToe ? recommendation.rlToe.toFixed(3) : '—'}° | RR: ${recommendation.rrToe ? recommendation.rrToe.toFixed(3) : '—'}°</td>
    `;
    tbody.appendChild(toeRow);
  }

  table.appendChild(tbody);
  div.appendChild(table);

  return div;
}

function _buildSymmetryPanel(sym) {
  const wrap = document.createElement('div');

  // ── 0. LEGEND (Color Guide) ────────────────────────────────────────────
  const legendContainer = document.createElement('div');
  legendContainer.className = 'legend-container';
  
  const legendTitle = document.createElement('div');
  legendTitle.className = 'label-uppercase';
  legendTitle.textContent = 'Legend';
  legendContainer.appendChild(legendTitle);

  const legendContent = document.createElement('div');
  legendContent.className = 'legend-items';

  // Caster legend item
  const casterItem = document.createElement('div');
  casterItem.className = 'legend-item';
  casterItem.innerHTML = `
    <span class="legend-swatch legend-swatch--caster"></span>
    <span class="legend-label--caster">Caster</span>
  `;
  legendContent.appendChild(casterItem);

  // Camber legend item
  const camberItem = document.createElement('div');
  camberItem.className = 'legend-item';
  camberItem.innerHTML = `
    <span class="legend-swatch legend-swatch--camber"></span>
    <span class="legend-label--camber">Camber</span>
  `;
  legendContent.appendChild(camberItem);

  // Separator text
  const separatorItem = document.createElement('div');
  separatorItem.className = 'legend-item';
  separatorItem.innerHTML = `
    <span class="legend-label--muted bold-cell">|</span>
    <span class="legend-label--muted">Value separator</span>
  `;
  legendContent.appendChild(separatorItem);

  legendContainer.appendChild(legendContent);
  wrap.appendChild(legendContainer);

  // ── 1. FRONT CONSOLIDATION TABLE (FL ↔ FR Symmetry) ─────────────────────
  const frontConsolidationContainer = document.createElement('div');
  frontConsolidationContainer.className = 'consolidation-header';
  frontConsolidationContainer.appendChild(_buildFrontConsolidationTable(sym));
  wrap.appendChild(frontConsolidationContainer);

  // ── 2. CORNER TABLES LAYOUT (Top: FL/FR, Bottom: RL/RR) ──────────────────
  const cornerLayout = document.createElement('div');
  cornerLayout.className = 'corner-layout';

  // Top-left: FL
  const flCornerWrapper = document.createElement('div');
  flCornerWrapper.className = 'corner-wrapper';
  flCornerWrapper.appendChild(_buildCornerTable('FL', sym.recommendation.flCamberBolt, sym.recommendation.flCasterBolt, sym.recommendation.camber, sym.recommendation.caster));
  cornerLayout.appendChild(flCornerWrapper);

  // Top-right: FR
  const frCornerWrapper = document.createElement('div');
  frCornerWrapper.className = 'corner-wrapper';
  frCornerWrapper.appendChild(_buildCornerTable('FR', sym.recommendation.frCamberBolt, sym.recommendation.frCasterBolt, sym.recommendation.camber, sym.recommendation.caster));
  cornerLayout.appendChild(frCornerWrapper);

  // Bottom-left: RL
  const rlCornerWrapper = document.createElement('div');
  rlCornerWrapper.className = 'corner-wrapper';
  if (sym.rear && sym.rear.rl) {
    rlCornerWrapper.appendChild(_buildCornerTable('RL', sym.rear.rl.bestCell.camberBolt, sym.rear.rl.bestCell.casterBolt, sym.rear.rl.bestCell.camber, 'N/A'));
  } else {
    rlCornerWrapper.appendChild(_buildCornerTable('RL', 'N/A', 'N/A', 'N/A', 'N/A'));
  }
  cornerLayout.appendChild(rlCornerWrapper);

  // Bottom-right: RR
  const rrCornerWrapper = document.createElement('div');
  rrCornerWrapper.className = 'corner-wrapper';
  if (sym.rear && sym.rear.rr) {
    rrCornerWrapper.appendChild(_buildCornerTable('RR', sym.rear.rr.bestCell.camberBolt, sym.rear.rr.bestCell.casterBolt, sym.rear.rr.bestCell.camber, 'N/A'));
  } else {
    rrCornerWrapper.appendChild(_buildCornerTable('RR', 'N/A', 'N/A', 'N/A', 'N/A'));
  }
  cornerLayout.appendChild(rrCornerWrapper);

  wrap.appendChild(cornerLayout);

  // ── 4. SYMMETRY STATUS INDICATOR ─────────────────────────────────────
  const statusContainer = document.createElement('div');
  statusContainer.className = 'status-summary';
  statusContainer.appendChild(_buildSymmetryStatus(sym));
  wrap.appendChild(statusContainer);

  // ── 5. Per-Wheel Analysis: Best Camber and Best Caster Separately ─────
  const grid = document.createElement('div');
  grid.className = 'symmetry-grid';

  // Title for Section 1
  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'grid-full-span';
  sectionTitle.innerHTML = `
    <div class="label-uppercase">INDEPENDENT OPTIMIZATION PER WHEEL</div>
    <div class="section-note">Each wheel shows two separate bolt positions: one optimized for camber, one for caster.
      Use the best-camber position if camber accuracy is your priority; use best-caster if caster is.</div>`;
  grid.appendChild(sectionTitle);

  // Per-wheel cards showing both best camber and best caster scenarios
  for (const [wheel, data] of [['FL', sym.fl], ['FR', sym.fr]]) {
    const card = document.createElement('div');
    card.className = 'symmetry-card';

    card.innerHTML = `
      <div class="title">${wheel}</div>
      <div class="scenario-grid">
        <div class="scenario-col">
          <div class="scenario-header">Optimize Camber</div>
          <table class="scenario-table">
            <thead><tr>
              <th class="sct-metric"></th>
              <th class="sct-bolt">Bolt</th>
              <th class="sct-result">Achieved</th>
              <th class="sct-vs">vs Target</th>
            </tr></thead>
            <tbody>
              <tr>
                <td class="sct-metric"><span class="metric-camber">Camber</span></td>
                <td class="sct-bolt">${_sign(data.camberOptCamberBolt)}</td>
                <td class="sct-result">${data.bestCamberValue.toFixed(2)}°</td>
                <td class="sct-vs">Δ ${_delta(data.camberDelta)}°</td>
              </tr>
              <tr class="sct-side-effect">
                <td class="sct-metric"><span class="metric-caster">Caster</span></td>
                <td class="sct-bolt">${_sign(data.camberOptCasterBolt)}</td>
                <td class="sct-result">${data.camberCasterAtBestCamber.toFixed(2)}°</td>
                <td class="sct-vs">side effect</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="scenario-col scenario-col--right">
          <div class="scenario-header">Optimize Caster</div>
          <table class="scenario-table">
            <thead><tr>
              <th class="sct-metric"></th>
              <th class="sct-bolt">Bolt</th>
              <th class="sct-result">Achieved</th>
              <th class="sct-vs">vs Target</th>
            </tr></thead>
            <tbody>
              <tr>
                <td class="sct-metric"><span class="metric-caster">Caster</span></td>
                <td class="sct-bolt">${_sign(data.casterOptCasterBolt)}</td>
                <td class="sct-result">${data.bestCasterValue.toFixed(2)}°</td>
                <td class="sct-vs">Δ ${_delta(data.casterDelta)}°</td>
              </tr>
              <tr class="sct-side-effect">
                <td class="sct-metric"><span class="metric-camber">Camber</span></td>
                <td class="sct-bolt">${_sign(data.casterOptCamberBolt)}</td>
                <td class="sct-result">${data.casterCamberAtBestCaster.toFixed(2)}°</td>
                <td class="sct-vs">side effect</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
    grid.appendChild(card);
  }

  // Add "Symmetric Options" section header
  const optHeaderDiv = document.createElement('div');
  optHeaderDiv.className = 'section-divider-header';
  optHeaderDiv.innerHTML = `
    <div class="label-uppercase">SYMMETRIC OPTIONS</div>
    <div class="section-note">These two options show FL/FR bolts set to match either CAMBER values or CASTER values.</div>`;
  grid.appendChild(optHeaderDiv);

  // ── Option 1: Camber-Symmetric Pair ──────────────────────────────────────
  if (sym.camberSymmetricPair) {
    const cpair = sym.camberSymmetricPair;
    const camberOptCard = document.createElement('div');
    camberOptCard.className = 'symmetry-card';
    camberOptCard.innerHTML = `
      <div class="title">Camber-Symmetric Pair</div>
      <div class="section-desc">FL and FR achieve matching camber (${cpair.flCamber.toFixed(2)}°)</div>
      <div class="scenario-grid">
        <div class="scenario-col">
          <div class="scenario-header">FL</div>
          <div class="bolt-values-grid">
            <div class="bolts-col">
              <div class="symmetry-metric front-bolt symmetry-metric--compact">
                <span class="label">Camber Bolt</span>
                <span class="value">${_sign(cpair.flPosition.camberBolt)}</span>
              </div>
              <div class="symmetry-metric rear-bolt symmetry-metric--compact">
                <span class="label">Caster Bolt</span>
                <span class="value">${_sign(cpair.flPosition.casterBolt)}</span>
              </div>
            </div>
            <div class="values-col">
              <div class="symmetry-metric camber symmetry-metric--compact">
                <span class="label">Camber</span>
                <span class="value">${cpair.flCamber.toFixed(2)}°</span>
              </div>
              <div class="symmetry-metric caster symmetry-metric--compact">
                <span class="label">Resulting Caster</span>
                <span class="value">${cpair.flCasterAtBestCamber.toFixed(2)}°</span>
              </div>
            </div>
          </div>
        </div>
        <div class="scenario-col scenario-col--right">
          <div class="scenario-header">FR</div>
          <div class="bolt-values-grid">
            <div class="bolts-col">
              <div class="symmetry-metric front-bolt symmetry-metric--compact">
                <span class="label">Camber Bolt</span>
                <span class="value">${_sign(cpair.frPosition.camberBolt)}</span>
              </div>
              <div class="symmetry-metric rear-bolt symmetry-metric--compact">
                <span class="label">Caster Bolt</span>
                <span class="value">${_sign(cpair.frPosition.casterBolt)}</span>
              </div>
            </div>
            <div class="values-col">
              <div class="symmetry-metric camber symmetry-metric--compact">
                <span class="label">Camber</span>
                <span class="value">${cpair.frCamber.toFixed(2)}°</span>
              </div>
              <div class="symmetry-metric caster symmetry-metric--compact">
                <span class="label">Resulting Caster</span>
                <span class="value">${cpair.frCasterAtBestCamber.toFixed(2)}°</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    grid.appendChild(camberOptCard);
  }

  // ── Option 2: Caster-Symmetric Pair ──────────────────────────────────────
  if (sym.casterSymmetricPair) {
    const kpair = sym.casterSymmetricPair;
    const casterOptCard = document.createElement('div');
    casterOptCard.className = 'symmetry-card';
    casterOptCard.innerHTML = `
      <div class="title title--success">Caster-Symmetric Pair</div>
      <div class="section-desc">FL and FR achieve matching caster (${kpair.flCaster.toFixed(2)}°)</div>
      <div class="scenario-grid">
        <div class="scenario-col">
          <div class="scenario-header">FL</div>
          <div class="bolt-values-grid">
            <div class="bolts-col">
              <div class="symmetry-metric front-bolt symmetry-metric--compact">
                <span class="label">Camber Bolt</span>
                <span class="value">${_sign(kpair.flPosition.camberBolt)}</span>
              </div>
              <div class="symmetry-metric rear-bolt symmetry-metric--compact">
                <span class="label">Caster Bolt</span>
                <span class="value">${_sign(kpair.flPosition.casterBolt)}</span>
              </div>
            </div>
            <div class="values-col">
              <div class="symmetry-metric caster symmetry-metric--compact">
                <span class="label">Caster</span>
                <span class="value">${kpair.flCaster.toFixed(2)}°</span>
              </div>
              <div class="symmetry-metric camber symmetry-metric--compact">
                <span class="label">Resulting Camber</span>
                <span class="value">${kpair.flCamberAtBestCaster.toFixed(2)}°</span>
              </div>
            </div>
          </div>
        </div>
        <div class="scenario-col scenario-col--right">
          <div class="scenario-header">FR</div>
          <div class="bolt-values-grid">
            <div class="bolts-col">
              <div class="symmetry-metric front-bolt symmetry-metric--compact">
                <span class="label">Camber Bolt</span>
                <span class="value">${_sign(kpair.frPosition.camberBolt)}</span>
              </div>
              <div class="symmetry-metric rear-bolt symmetry-metric--compact">
                <span class="label">Caster Bolt</span>
                <span class="value">${_sign(kpair.frPosition.casterBolt)}</span>
              </div>
            </div>
            <div class="values-col">
              <div class="symmetry-metric caster symmetry-metric--compact">
                <span class="label">Caster</span>
                <span class="value">${kpair.frCaster.toFixed(2)}°</span>
              </div>
              <div class="symmetry-metric camber symmetry-metric--compact">
                <span class="label">Resulting Camber</span>
                <span class="value">${kpair.frCamberAtBestCaster.toFixed(2)}°</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    grid.appendChild(casterOptCard);
  }

  // ── Final Recommendation ─────────────────────────────────────────────
  const rec = sym.recommendation;
  const recHeaderDiv = document.createElement('div');
  recHeaderDiv.className = 'section-divider-header';
  recHeaderDiv.innerHTML = `
    <div class="label-uppercase">RECOMMENDATION</div>
    <div class="section-note">${rec.note}</div>`;
  grid.appendChild(recHeaderDiv);

  const recCard = document.createElement('div');
  recCard.className = 'symmetry-card';
  recCard.classList.add('symmetry-card--full-width');
  recCard.innerHTML = `
    <div class="scenario-grid">
      <div class="scenario-col">
        <div class="scenario-header">FL</div>
        <div class="bolt-values-grid">
          <div class="bolts-col">
            <div class="symmetry-metric front-bolt symmetry-metric--compact">
              <span class="label">Camber Bolt</span>
              <span class="value">${_sign(rec.flCamberBolt)}</span>
            </div>
            <div class="symmetry-metric rear-bolt symmetry-metric--compact">
              <span class="label">Caster Bolt</span>
              <span class="value">${_sign(rec.flCasterBolt)}</span>
            </div>
          </div>
          <div class="values-col">
            <div class="symmetry-metric camber symmetry-metric--compact">
              <span class="label">Camber</span>
              <span class="value">${rec.camber.toFixed(2)}°</span>
            </div>
            <div class="symmetry-metric caster symmetry-metric--compact">
              <span class="label">Caster</span>
              <span class="value">${rec.caster.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>
      <div class="scenario-col scenario-col--right">
        <div class="scenario-header">FR</div>
        <div class="bolt-values-grid">
          <div class="bolts-col">
            <div class="symmetry-metric front-bolt symmetry-metric--compact">
              <span class="label">Camber Bolt</span>
              <span class="value">${_sign(rec.frCamberBolt)}</span>
            </div>
            <div class="symmetry-metric rear-bolt symmetry-metric--compact">
              <span class="label">Caster Bolt</span>
              <span class="value">${_sign(rec.frCasterBolt)}</span>
            </div>
          </div>
          <div class="values-col">
            <div class="symmetry-metric camber symmetry-metric--compact">
              <span class="label">Camber</span>
              <span class="value">${rec.camber.toFixed(2)}°</span>
            </div>
            <div class="symmetry-metric caster symmetry-metric--compact">
              <span class="label">Caster</span>
              <span class="value">${rec.caster.toFixed(2)}°</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  grid.appendChild(recCard);

  wrap.appendChild(grid);
  return wrap;
}

function _buildRearSymmetryPanel(rearSymmetry) {
  const wrap = document.createElement('div');

  const status = document.createElement('div');
  status.className = rearSymmetry.symmetricPair ? 'symmetry-status match' : 'symmetry-status partial';
  status.innerHTML = `
    <div class="status-title">${rearSymmetry.symmetricPair ? '✓ Rear Camber Match Found' : '◐ Rear Camber Approximation'}</div>
    <div class="status-note">${rearSymmetry.recommendation.note}</div>`;
  wrap.appendChild(status);

  const summary = document.createElement('table');
  summary.className = 'symmetry-consolidation-table';
  summary.innerHTML = `
    <thead>
      <tr>
        <th>Metric</th>
        <th>Compromise</th>
        <th>RL Bolts</th>
        <th>RR Bolts</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="bold-cell"><span class="metric-camber">Camber</span></td>
        <td>${rearSymmetry.recommendation.camber.toFixed(2)}°</td>
        <td><div>Toe:${_sign(rearSymmetry.recommendation.leftFront)}</div><div>Camber:${_sign(rearSymmetry.recommendation.leftRear)}</div></td>
        <td><div>Toe:${_sign(rearSymmetry.recommendation.rightFront)}</div><div>Camber:${_sign(rearSymmetry.recommendation.rightRear)}</div></td>
      </tr>
    </tbody>`;
  wrap.appendChild(summary);

  const grid = document.createElement('div');
  grid.className = 'symmetry-grid';

  for (const [wheel, bestCell] of [[rearSymmetry.leftWheel, rearSymmetry.leftBest], [rearSymmetry.rightWheel, rearSymmetry.rightBest]]) {
    const card = document.createElement('div');
    card.className = 'symmetry-card';
    card.innerHTML = `
      <div class="title">${wheel}</div>
      <div class="symmetry-metric front-bolt">
        <span class="label">Best Camber Toe Bolt</span>
        <span class="value">${_sign(bestCell.camberBolt)}</span>
      </div>
      <div class="symmetry-metric rear-bolt">
        <span class="label">Best Camber Camber Bolt</span>
        <span class="value">${_sign(bestCell.casterBolt)}</span>
      </div>
      <div class="symmetry-metric camber">
        <span class="label">Camber</span>
        <span class="value">${bestCell.camber.toFixed(2)}°</span>
        <span class="symmetry-target">Target: ${rearSymmetry.targetCamber.toFixed(2)}° &nbsp; Δ ${_delta(bestCell.camber - rearSymmetry.targetCamber)}°</span>
      </div>
      <div class="symmetry-metric caster symmetry-metric--compact">
        <span class="label">Resulting Caster</span>
        <span class="value">${bestCell.caster.toFixed(2)}°</span>
      </div>`;
    grid.appendChild(card);
  }

  const recommendation = document.createElement('div');
  recommendation.className = 'symmetry-card';
  recommendation.classList.add('grid-full-span');
  recommendation.innerHTML = `
    <div class="title">Rear Axle Recommendation</div>
    <div class="section-desc section-note">${rearSymmetry.recommendation.note}</div>
    <div class="scenario-grid" style="gap:24px;">
      <div>
        <div class="scenario-header">${rearSymmetry.leftWheel}</div>
        <div class="symmetry-metric front-bolt"><span class="label">Toe Bolt</span><span class="value">${_sign(rearSymmetry.recommendation.leftFront)}</span></div>
        <div class="symmetry-metric rear-bolt symmetry-metric--compact"><span class="label">Camber Bolt</span><span class="value">${_sign(rearSymmetry.recommendation.leftRear)}</span></div>
      </div>
      <div>
        <div class="scenario-header">${rearSymmetry.rightWheel}</div>
        <div class="symmetry-metric front-bolt"><span class="label">Toe Bolt</span><span class="value">${_sign(rearSymmetry.recommendation.rightFront)}</span></div>
        <div class="symmetry-metric rear-bolt symmetry-metric--compact"><span class="label">Camber Bolt</span><span class="value">${_sign(rearSymmetry.recommendation.rightRear)}</span></div>
      </div>
    </div>`;
  grid.appendChild(recommendation);

  wrap.appendChild(grid);
  return wrap;
}

/**
 * Determine Front Symmetry Status
 * Returns { status: 'green|orange|red', messages: [...], camberStatus, casterStatus }
 * 
 * Green: Both metrics found within ±0.15° target (ideal)
 * Orange: Metric found but outside ±0.15° tolerance (compromise)
 * Red: Metric not found (one or both metrics have no symmetric pair)
 */
function _determineFrontSymmetryStatus(sym) {
  const greenThreshold = 0.15;  // ±0.15° = green (matches colour-coding thresholds)
  const orangeThreshold = 0.40; // ±0.40° = orange
  
  let overallStatus = 'green';
  const messages = [];
  let camberStatus = 'none';
  let casterStatus = 'none';
  
  // Check Camber
  if (sym.camberSymmetricPair) {
    const camberValue = (sym.camberSymmetricPair.flCamber + sym.camberSymmetricPair.frCamber) / 2;
    const camberDelta = Math.abs(camberValue - TARGET_CAMBER);

    if (camberDelta <= greenThreshold) {
      camberStatus = 'green';
      messages.push(`✓ <span class="metric-camber">Camber</span> match at target (${camberValue.toFixed(2)}°)`);
    } else if (camberDelta <= orangeThreshold) {
      camberStatus = 'orange';
      overallStatus = 'orange';
      messages.push(`◐ <span class="metric-camber">Camber</span> match found (${camberValue.toFixed(2)}°) but Δ${camberDelta.toFixed(2)}° from target`);
    } else {
      camberStatus = 'orange';
      overallStatus = 'orange';
      messages.push(`◐ <span class="metric-camber">Camber</span> match found (${camberValue.toFixed(2)}°) but off-target by Δ${camberDelta.toFixed(2)}°`);
    }
  } else {
    camberStatus = 'red';
    overallStatus = 'red';
    messages.push(`✗ No camber symmetric pair found within ±0.3° tolerance`);
  }
  
  // Check Caster
  if (sym.casterSymmetricPair) {
    const casterValue = (sym.casterSymmetricPair.flCaster + sym.casterSymmetricPair.frCaster) / 2;
    const casterDelta = Math.abs(casterValue - TARGET_CASTER);
    
    if (casterDelta <= greenThreshold) {
      casterStatus = 'green';
      messages.push(`✓ <span class="metric-caster">Caster</span> match at target (${casterValue.toFixed(2)}°)`);
    } else if (casterDelta <= orangeThreshold) {
      casterStatus = 'orange';
      if (overallStatus === 'green') overallStatus = 'orange';
      messages.push(`◐ <span class="metric-caster">Caster</span> match found (${casterValue.toFixed(2)}°) but Δ${casterDelta.toFixed(2)}° from target`);
    } else {
      casterStatus = 'orange';
      if (overallStatus === 'green') overallStatus = 'orange';
      messages.push(`◐ <span class="metric-caster">Caster</span> match found (${casterValue.toFixed(2)}°) but off-target by Δ${casterDelta.toFixed(2)}°`);
    }
  } else {
    casterStatus = 'red';
    if (overallStatus !== 'red') overallStatus = 'orange'; // partial if only caster missing
    messages.push(`◐ No caster symmetric pair found within ±0.3° tolerance`);
  }
  
  return {
    status: overallStatus,
    messages,
    camberStatus,
    casterStatus,
    recommendation: sym.recommendation.note
  };
}

/**
 * Build Front Consolidation Table with Status Indicator
 * Similar to rear, but with front-specific metrics (camber + caster)
 */
function _buildFrontConsolidationTableWithStatus(sym) {
  const div = document.createElement('div');
  
  // Determine status
  const statusInfo = _determineFrontSymmetryStatus(sym);
  
  // Status indicator block
  const statusBlock = document.createElement('div');
  statusBlock.className = `symmetry-status ${statusInfo.status}`;
  
  // Icon + title based on status
  let icon = '◐'; // partial/orange
  let title = 'Front Axle Symmetric Match (Partial)';
  if (statusInfo.status === 'green') {
    icon = '✓';
    title = 'Front Axle Perfect Symmetric Match';
  } else if (statusInfo.status === 'red') {
    icon = '✗';
    title = 'Front Axle No Symmetric Match';
  }
  
  statusBlock.innerHTML = `
    <div class="status-title">${icon} ${title}</div>
    <div class="status-note">${statusInfo.messages.join('<br>')}</div>`;
  div.appendChild(statusBlock);

  // Consolidation table
  const table = document.createElement('table');
  table.className = 'symmetry-consolidation-table';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `
    <th>Metric</th>
    <th>Compromise</th>
    <th>FL Bolts</th>
    <th>FR Bolts</th>
  `;
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');

  const camberFlBolts = sym.camberSymmetricPair
    ? `<div>Camber:${_sign(sym.camberSymmetricPair.flPosition.camberBolt)}</div><div>Caster:${_sign(sym.camberSymmetricPair.flPosition.casterBolt)}</div>`
    : `<div>Camber:${_sign(sym.recommendation.flCamberBolt)}</div><div>Caster:${_sign(sym.recommendation.flCasterBolt)}</div>`;
  const camberFrBolts = sym.camberSymmetricPair
    ? `<div>Camber:${_sign(sym.camberSymmetricPair.frPosition.camberBolt)}</div><div>Caster:${_sign(sym.camberSymmetricPair.frPosition.casterBolt)}</div>`
    : `<div>Camber:${_sign(sym.recommendation.frCamberBolt)}</div><div>Caster:${_sign(sym.recommendation.frCasterBolt)}</div>`;

  const casterFlBolts = sym.casterSymmetricPair
    ? `<div>Camber:${_sign(sym.casterSymmetricPair.flPosition.camberBolt)}</div><div>Caster:${_sign(sym.casterSymmetricPair.flPosition.casterBolt)}</div>`
    : `<div>Camber:${_sign(sym.recommendation.flCamberBolt)}</div><div>Caster:${_sign(sym.recommendation.flCasterBolt)}</div>`;
  const casterFrBolts = sym.casterSymmetricPair
    ? `<div>Camber:${_sign(sym.casterSymmetricPair.frPosition.camberBolt)}</div><div>Caster:${_sign(sym.casterSymmetricPair.frPosition.casterBolt)}</div>`
    : `<div>Camber:${_sign(sym.recommendation.frCamberBolt)}</div><div>Caster:${_sign(sym.recommendation.frCasterBolt)}</div>`;

  // Camber row
  const camberRow = document.createElement('tr');
  const camberCompromise = sym.camberSymmetricPair
    ? ((sym.camberSymmetricPair.flCamber + sym.camberSymmetricPair.frCamber) / 2).toFixed(2)
    : ((sym.fl.bestCamberValue + sym.fr.bestCamberValue) / 2).toFixed(2);
  camberRow.innerHTML = `
    <td class="bold-cell"><span class="metric-camber">Camber</span></td>
    <td>${camberCompromise}°</td>
    <td>${camberFlBolts}</td>
    <td>${camberFrBolts}</td>
  `;
  tbody.appendChild(camberRow);

  // Caster row
  const casterRow = document.createElement('tr');
  const casterCompromise = sym.casterSymmetricPair
    ? ((sym.casterSymmetricPair.flCaster + sym.casterSymmetricPair.frCaster) / 2).toFixed(2)
    : ((sym.fl.bestCasterValue + sym.fr.bestCasterValue) / 2).toFixed(2);
  casterRow.innerHTML = `
    <td class="bold-cell"><span class="metric-caster">Caster</span></td>
    <td>${casterCompromise}°</td>
    <td>${casterFlBolts}</td>
    <td>${casterFrBolts}</td>
  `;
  tbody.appendChild(casterRow);

  table.appendChild(tbody);
  div.appendChild(table);

  return div;
}

/**
 * Build Front Consolidation Table (FL ↔ FR Symmetry Analysis)
 * Displays symmetrical compromise values for front axis.
 */
function _buildFrontConsolidationTable(sym) {
  const div = document.createElement('div');
  div.className = 'consolidation-header';
  
  const title = document.createElement('div');
  title.className = 'label-uppercase';
  title.innerHTML = 'Front Axis Consolidation (FL ↔ FR)';
  div.appendChild(title);

  const table = document.createElement('table');
  table.className = 'symmetry-consolidation-table';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `
    <th>Metric</th>
    <th>Compromise</th>
    <th>FL Bolts</th>
    <th>FR Bolts</th>
  `;
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');

  const camberFlBolts = sym.camberSymmetricPair
    ? `<div>Camber:${_sign(sym.camberSymmetricPair.flPosition.camberBolt)}</div><div>Caster:${_sign(sym.camberSymmetricPair.flPosition.casterBolt)}</div>`
    : `<div>Camber:${_sign(sym.recommendation.flCamberBolt)}</div><div>Caster:${_sign(sym.recommendation.flCasterBolt)}</div>`;
  const camberFrBolts = sym.camberSymmetricPair
    ? `<div>Camber:${_sign(sym.camberSymmetricPair.frPosition.camberBolt)}</div><div>Caster:${_sign(sym.camberSymmetricPair.frPosition.casterBolt)}</div>`
    : `<div>Camber:${_sign(sym.recommendation.frCamberBolt)}</div><div>Caster:${_sign(sym.recommendation.frCasterBolt)}</div>`;

  const casterFlBolts = sym.casterSymmetricPair
    ? `<div>Camber:${_sign(sym.casterSymmetricPair.flPosition.camberBolt)}</div><div>Caster:${_sign(sym.casterSymmetricPair.flPosition.casterBolt)}</div>`
    : `<div>Camber:${_sign(sym.recommendation.flCamberBolt)}</div><div>Caster:${_sign(sym.recommendation.flCasterBolt)}</div>`;
  const casterFrBolts = sym.casterSymmetricPair
    ? `<div>Camber:${_sign(sym.casterSymmetricPair.frPosition.camberBolt)}</div><div>Caster:${_sign(sym.casterSymmetricPair.frPosition.casterBolt)}</div>`
    : `<div>Camber:${_sign(sym.recommendation.frCamberBolt)}</div><div>Caster:${_sign(sym.recommendation.frCasterBolt)}</div>`;

  // Camber row
  const camberRow = document.createElement('tr');
  const camberCompromise = sym.camberSymmetricPair
    ? ((sym.camberSymmetricPair.flCamber + sym.camberSymmetricPair.frCamber) / 2).toFixed(2)
    : ((sym.fl.bestCamberValue + sym.fr.bestCamberValue) / 2).toFixed(2);
  camberRow.innerHTML = `
    <td class="bold-cell"><span class="metric-camber">Camber</span></td>
    <td>${camberCompromise}°</td>
    <td>${camberFlBolts}</td>
    <td>${camberFrBolts}</td>
  `;
  tbody.appendChild(camberRow);

  // Caster row
  const casterRow = document.createElement('tr');
  const casterCompromise = sym.casterSymmetricPair
    ? ((sym.casterSymmetricPair.flCaster + sym.casterSymmetricPair.frCaster) / 2).toFixed(2)
    : ((sym.fl.bestCasterValue + sym.fr.bestCasterValue) / 2).toFixed(2);
  casterRow.innerHTML = `
    <td class="bold-cell"><span class="metric-caster">Caster</span></td>
    <td>${casterCompromise}°</td>
    <td>${casterFlBolts}</td>
    <td>${casterFrBolts}</td>
  `;
  tbody.appendChild(casterRow);

  table.appendChild(tbody);
  div.appendChild(table);
  
  return div;
}

/**
 * Build Simplified Corner Table (3 rows: corner name, values, bolt positions)
 * Used for quick reference in symmetry vehicle diagram
 */
function _buildCornerTable(wheel, camberBolt, casterBolt, camber, caster) {
  const table = document.createElement('table');
  table.className = `symmetry-corner-table wheel-${wheel.toLowerCase()}`;
  table.classList.add('compact-table');

  const tbody = document.createElement('tbody');

  // Row 1: Corner Name
  const nameRow = document.createElement('tr');
  nameRow.innerHTML = `<td class="corner-table-name">${wheel}</td>`;
  tbody.appendChild(nameRow);

  // Row 2: Front Bolt + Camber (Front bolt top per STYLING.md Front/Rear rule)
  const frontRow = document.createElement('tr');
  const camberStr = typeof camber === 'number' ? camber.toFixed(2) + '°' : camber;
  frontRow.innerHTML = `
    <td class="corner-table-cell">
      <div class="corner-value-grid">
        <strong class="corner-bolt-label">Camber: ${_sign(camberBolt)}</strong>
        <span class="corner-separator">|</span>
        <span class="corner-value-camber">${camberStr}</span>
      </div>
    </td>
  `;
  tbody.appendChild(frontRow);

  // Row 3: Rear Bolt + Caster (Rear bolt bottom per STYLING.md Front/Rear rule)
  const rearRow = document.createElement('tr');
  const casterStr = typeof caster === 'number' ? caster.toFixed(2) + '°' : caster;
  rearRow.innerHTML = `
    <td class="corner-table-cell--last">
      <div class="corner-value-grid">
        <strong class="corner-bolt-label">Caster: ${_sign(casterBolt)}</strong>
        <span class="corner-separator">|</span>
        <span class="corner-value-caster">${casterStr}</span>
      </div>
    </td>
  `;
  tbody.appendChild(rearRow);

  table.appendChild(tbody);
  return table;
}

/**
 * Build Empty Corner Table for Rear Wheels (Phase 2 placeholder)
 * Matches the simplified 3-row structure
 */
function _buildEmptyCornerTable(wheel) {
  const table = document.createElement('table');
  table.className = `symmetry-corner-table wheel-${wheel.toLowerCase()}`;
  table.classList.add('compact-table');

  const tbody = document.createElement('tbody');

  // Row 1: Corner Name
  const nameRow = document.createElement('tr');
  nameRow.innerHTML = `<td class="corner-table-name corner-table-name--muted">${wheel}</td>`;
  tbody.appendChild(nameRow);

  // Row 2: Placeholder (empty)
  const valueRow = document.createElement('tr');
  valueRow.innerHTML = `<td class="corner-table-cell note-cell">Phase 2</td>`;
  tbody.appendChild(valueRow);

  // Row 3: Placeholder (empty)
  const boltRow = document.createElement('tr');
  boltRow.innerHTML = `<td class="corner-table-cell--last note-cell">Coming Soon</td>`;
  tbody.appendChild(boltRow);

  table.appendChild(tbody);
  return table;
}

/**
 * Build Symmetry Status Indicator
 */
function _buildSymmetryStatus(sym) {
  const div = document.createElement('div');

  let status, statusClass, message;

  // Determine if both camber and caster are symmetric
  const camberSymmetric = sym.camberSymmetricPair !== null;
  const casterSymmetric = sym.casterSymmetricPair !== null;

  if (camberSymmetric && casterSymmetric) {
    status = '✓ Perfect Symmetry Found';
    statusClass = 'symmetry-status match';
    message = 'Both FL and FR achieve matching camber AND caster values within tolerance (±0.3°).';
  } else if (camberSymmetric || casterSymmetric) {
    status = '◐ Partial Symmetry';
    statusClass = 'symmetry-status partial';
    if (camberSymmetric) {
      message = 'FL and FR achieve matching camber, but caster differs slightly.';
    } else {
      message = 'FL and FR achieve matching caster, but camber differs slightly.';
    }
  } else {
    // Calculate how close we are to symmetry
    const camberDelta = Math.abs(sym.fl.bestCamberValue - sym.fr.bestCamberValue);
    const casterDelta = Math.abs(sym.fl.bestCasterValue - sym.fr.bestCasterValue);
    
    status = '✗ No Symmetric Pair Found';
    statusClass = 'symmetry-status no-match';
    message = `Symmetry tolerance exceeded: Camber Δ = ${camberDelta.toFixed(2)}° (exceeds ±0.3°), Caster Δ = ${casterDelta.toFixed(2)}°.`;
  }

  div.className = statusClass;
  div.innerHTML = `
    <div class="status-title">${status}</div>
    <div class="status-note">${message}</div>
  `;

  return div;
}

// ── Utility ────────────────────────────────────────────────────────────────

function _lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function _rgb(r, g, b)  { return `rgb(${r},${g},${b})`; }
function _delta(d) { return (d >= 0 ? '+' : '') + d.toFixed(2); }

function _showSection(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}

function _hideSection(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ── Theme Change Listener ──────────────────────────────────────────────────

document.addEventListener('themechange', () => {
  _renderMainChart();
});



