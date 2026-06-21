/**
 * report-ui.js — UI rendering layer for the report page
 *
 * Responsibilities:
 *   - Render tables (summary, highlighting, heatmaps)
 *   - Render charts and diagrams
 *   - Render symmetry panels and analysis cards
 *   - Apply styling based on values and targets
 *   - Build DOM elements for report sections
 *
 * Dependencies:
 *   - constants.js (colors, thresholds)
 *   - chart-builder.js (buildMainChart)
 *   - washer-diagram.js (renderWasherSection)
 *   - math-utils.js (calculateCaster, formatAngle)
 */

import { BOLT_POSITIONS, REQUIRED_POSITIONS, WHEELS, FRONT_WHEELS, REAR_WHEELS, 
         WHEEL_LABELS, TARGET_CAMBER, TARGET_CASTER, TARGET_CAMBER_REAR, 
         TARGET_TOE_FRONT, TARGET_TOE_REAR, SYMMETRY_TOLERANCE } from './constants.js';
import { buildMainChart, destroyChart, updateChartNote } from './chart-builder.js';
import { renderWasherSection } from './washer-diagram.js';
import { calculateCaster } from './math-utils.js';

/**
 * Render the summary table for a wheel
 * @param {object} result - Wheel result from report-engine
 * @param {string} wheel - Wheel ID
 * @returns {HTMLElement} Table element
 */
export function renderSummaryTable(result, wheel) {
  const container = document.getElementById('table-container');
  if (!container) return;

  container.innerHTML = '';
  container.appendChild(buildTable(result, wheel));
}

/**
 * Build the summary table for a wheel
 * @param {object} result - Wheel result
 * @param {string} wheel - Wheel ID
 * @returns {HTMLTableElement}
 */
function buildTable(result, wheel) {
  const { grid } = result;
  const isRearWheel = REAR_WHEELS.includes(wheel);
  const steeringRatio = result?.targets?.steeringRatio;
  const measuredToe = Number(result.measuredToe);
  const rearToe = Number.isFinite(measuredToe) ? measuredToe : null;

  const table = document.createElement('table');
  table.className = 'data-table';

  // Build header
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  _th(headerRow, 'F↓/R→', 'col-label-row');
  for (const r of BOLT_POSITIONS) {
    const th = _th(headerRow, _sign(r));
    if (REQUIRED_POSITIONS.includes(r)) th.classList.add('required-header');
  }

  // Build body
  const tbody = table.createTBody();
  for (let fi = 0; fi < BOLT_POSITIONS.length; fi++) {
    const f = BOLT_POSITIONS[fi];
    const tr = tbody.insertRow();

    const rowLbl = tr.insertCell();
    rowLbl.className = 'row-label';
    if (REQUIRED_POSITIONS.includes(f)) rowLbl.classList.add('required-header');
    rowLbl.textContent = _sign(f);

    for (let ri = 0; ri < BOLT_POSITIONS.length; ri++) {
      const r = BOLT_POSITIONS[ri];
      const cell = grid[fi][ri];
      const camber = +cell.zero.toFixed(2);
      const caster = +(calculateCaster(cell.neg20, cell.pos20, { steeringRatio })).toFixed(2);

      const td = tr.insertCell();
      if (cell.isInterpolated) td.classList.add('interpolated');
      if (REQUIRED_POSITIONS.includes(r)) td.classList.add('required-col');

      // Render cell value
      const valueSpan = document.createElement('span');
      valueSpan.className = valueClass(camber, caster, wheel, isRearWheel);
      valueSpan.textContent = isRearWheel ? camber.toFixed(2) : camber.toFixed(2);
      td.appendChild(valueSpan);
    }
  }

  // Add footer note if rear wheel with toe
  if (isRearWheel && rearToe !== null) {
    const tfoot = table.createTFoot();
    const noteRow = tfoot.insertRow();
    const noteCell = noteRow.insertCell();
    noteCell.colSpan = 14;
    noteCell.textContent = `Expected toe: ${rearToe.toFixed(2)} mm`;
    noteCell.style.textAlign = 'center';
    noteCell.style.fontSize = '0.85rem';
    noteCell.style.color = 'var(--muted)';
  }

  return table;
}

/**
 * Render the main chart
 * @param {string} wheel - Wheel ID
 * @param {object} result - Wheel result
 * @returns {void}
 */
export function renderMainChart(wheel, result) {
  const container = document.getElementById('chart-container');
  if (!container) return;

  if (charts.main) destroyChart('chart-main');

  const canvas = document.getElementById('chart-main');
  if (!canvas) return;

  const chartData = buildChartData(result, wheel);
  buildMainChart(canvas, chartData, wheel);
  charts.main = true;
}

/**
 * Build chart data from wheel result
 * @param {object} result - Wheel result
 * @param {string} wheel - Wheel ID
 * @returns {object} Data for chart
 */
function buildChartData(result, wheel) {
  // Implementation depends on chart-builder.js structure
  // Return data formatted for buildMainChart
  return {
    wheel,
    data: result.rows169,
    targets: result.targets,
  };
}

/**
 * Determine CSS class for a cell value based on target closeness
 * @param {number} camber - Camber value
 * @param {number} caster - Caster value
 * @param {string} wheel - Wheel ID
 * @param {boolean} isRearWheel - Whether rear wheel
 * @returns {string} CSS class name
 */
function valueClass(camber, caster, wheel, isRearWheel) {
  // Simplified; would need actual threshold logic
  if (isRearWheel) {
    const delta = Math.abs(camber - TARGET_CAMBER_REAR);
    return delta < 0.15 ? 'target-met' : delta < 0.4 ? 'near-target' : 'off-target';
  }

  const camberDelta = Math.abs(camber - TARGET_CAMBER);
  const casterDelta = Math.abs(caster - TARGET_CASTER);
  const minDelta = Math.min(camberDelta, casterDelta);

  if (minDelta < 0.15) return 'target-met';
  if (minDelta < 0.4) return 'near-target';
  return 'off-target';
}

/**
 * Render symmetry analysis panel
 * @param {object} symmetryResult - Result from symmetryAnalysis()
 * @returns {void}
 */
export function renderSymmetryPanel(symmetryResult) {
  const container = document.getElementById('symmetry-container');
  if (!container) return;

  container.innerHTML = '';
  if (!symmetryResult) return;

  const panel = buildSymmetryPanel(symmetryResult);
  container.appendChild(panel);
}

/**
 * Build symmetry panel element
 * @param {object} sym - Symmetry analysis result
 * @returns {HTMLElement}
 */
function buildSymmetryPanel(sym) {
  const panel = document.createElement('div');
  panel.className = 'symmetry-panel';

  // Add heading
  const heading = document.createElement('h2');
  heading.textContent = 'Symmetry Analysis';
  panel.appendChild(heading);

  // Add recommendation
  if (sym.recommendation) {
    const recCard = buildRecommendationCard(sym.recommendation);
    panel.appendChild(recCard);
  }

  return panel;
}

/**
 * Build recommendation card
 * @param {object} rec - Recommendation data
 * @returns {HTMLElement}
 */
function buildRecommendationCard(rec) {
  const card = document.createElement('div');
  card.className = 'recommendation-card';

  const title = document.createElement('h3');
  title.textContent = 'Recommended Bolt Positions';
  card.appendChild(title);

  const content = document.createElement('div');
  content.innerHTML = `
    <p><strong>Front:</strong> (${rec.flFront}, ${rec.flRear})</p>
    <p><strong>Camber:</strong> ${rec.camber.toFixed(2)}°</p>
    <p><strong>Caster:</strong> ${rec.caster.toFixed(2)}°</p>
    <p>${rec.note || ''}</p>
  `;
  card.appendChild(content);

  return card;
}

/**
 * Render heatmaps
 * @param {object} result - Wheel result
 * @param {string} mode - Heatmap mode ('camber', 'caster', 'proximity')
 * @returns {void}
 */
export function renderHeatmaps(result, mode = 'camber') {
  const container = document.getElementById('heatmap-container');
  if (!container) return;

  const canvasId = `heatmap-${mode}`;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  drawHeatmap(canvas, result, mode);
}

/**
 * Draw heatmap on canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {object} result - Wheel result
 * @param {string} mode - 'camber' or 'caster'
 * @returns {void}
 */
function drawHeatmap(canvas, result, mode = 'camber') {
  const { grid } = result;
  const N = 13;
  const size = canvas.width;
  const cell = size / N;

  const target = mode === 'camber' ? TARGET_CAMBER : TARGET_CASTER;
  const range = mode === 'camber' ? 2 : 3;

  for (let fi = 0; fi < N; fi++) {
    for (let ri = 0; ri < N; ri++) {
      const gridCell = result.grid[fi][ri];
      const value = mode === 'camber'
        ? gridCell.zero
        : calculateCaster(gridCell.neg20, gridCell.pos20, { steeringRatio: result?.targets?.steeringRatio });

      const t = Math.max(0, Math.min(1, (value - (target - range)) / (2 * range)));
      const colour = mode === 'camber'
        ? _camberColour(t)
        : _casterColour(t);

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = colour;
      ctx.fillRect(ri * cell, fi * cell, cell, cell);
    }
  }
}

/**
 * Get camber colour for heatmap
 * @param {number} t - Value 0-1
 * @returns {string} RGB color
 */
function _camberColour(t) {
  // Blue → Green → Red
  if (t < 0.5) {
    const b = 1 - t * 2;
    return _rgb(0, _lerp(100, 200, t * 2), 255);
  }
  const r = (t - 0.5) * 2;
  return _rgb(_lerp(100, 255, r), _lerp(200, 100, r), _lerp(255, 100, r));
}

/**
 * Get caster colour for heatmap
 * @param {number} t - Value 0-1
 * @returns {string} RGB color
 */
function _casterColour(t) {
  // Blue → Green → Red
  return _camberColour(t);
}

/**
 * Helper: Lerp between two values
 * @param {number} a - Start
 * @param {number} b - End
 * @param {number} t - 0-1
 * @returns {number}
 */
function _lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/**
 * Helper: RGB string
 * @param {number} r - Red 0-255
 * @param {number} g - Green 0-255
 * @param {number} b - Blue 0-255
 * @returns {string}
 */
function _rgb(r, g, b) {
  return `rgb(${r},${g},${b})`;
}

/**
 * Helper: Format signed number
 * @param {number} n - Number
 * @returns {string}
 */
function _sign(n) {
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Helper: Table header cell
 * @param {HTMLTableRowElement} row - Row
 * @param {string} text - Text
 * @param {string} extraClass - Extra CSS class
 * @returns {HTMLTableCellElement}
 */
function _th(row, text, extraClass = '') {
  const th = document.createElement('th');
  th.textContent = text;
  if (extraClass) th.className = extraClass;
  row.appendChild(th);
  return th;
}

// Export for testing/debugging
export { valueClass, buildRecommendationCard, buildSymmetryPanel };
