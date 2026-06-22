/**
 * table-builder.js — Reusable table building abstraction
 *
 * Consolidates table rendering logic with consistent styling for:
 *   - Summary tables (13×13 grids)
 *   - Bolt info tables
 *   - Symmetry pair tables
 *
 * Benefits:
 *   - Single source of truth for table styling
 *   - Easier to maintain and update table appearance
 *   - Consistent behavior across report sections
 */

import { BOLT_POSITIONS, REQUIRED_POSITIONS, FRONT_WHEELS, REAR_WHEELS,
         TARGET_CAMBER, TARGET_CASTER, TARGET_CAMBER_REAR, TARGET_TOE_FRONT,
         TARGET_TOE_REAR } from './constants.js';
import { calculateCaster } from './math-utils.js';

/**
 * Build a summary data table for a wheel
 * Shows 13×13 grid with camber readings and target indicators
 *
 * @param {object} result - Wheel result from processWheel()
 * @param {string} wheel - Wheel ID (FL, FR, RL, RR)
 * @param {object} options - Rendering options
 *   - showCaster: bool (show caster in cells instead of camber)
 *   - showInterpolated: bool (highlight interpolated cells)
 *   - topMatches: Map<key, type> (highlight top matches)
 * @returns {HTMLTableElement}
 */
export function buildSummaryTable(result, wheel, options = {}) {
  const { grid } = result;
  const isRearWheel = REAR_WHEELS.includes(wheel);
  const steeringRatio = result?.targets?.steeringRatio;
  const showCaster = options.showCaster || false;
  const showInterpolated = options.showInterpolated !== false;
  const topMatches = options.topMatches || new Map();

  const table = document.createElement('table');
  table.className = 'data-table summary-table';

  // Build header row with rear bolt positions
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  _appendHeaderCell(headerRow, 'F↓/R→', 'col-label-row');

  for (const r of BOLT_POSITIONS) {
    const th = _appendHeaderCell(headerRow, _formatNumber(r));
    if (REQUIRED_POSITIONS.includes(r)) {
      th.classList.add('required-header');
    }
  }

  // Build body rows with front bolt positions
  const tbody = table.createTBody();
  for (let fi = 0; fi < BOLT_POSITIONS.length; fi++) {
    const f = BOLT_POSITIONS[fi];
    const tr = tbody.insertRow();

    // Row header with front bolt position
    const rowHeader = tr.insertCell();
    rowHeader.className = 'row-label';
    if (REQUIRED_POSITIONS.includes(f)) {
      rowHeader.classList.add('required-header');
    }
    rowHeader.textContent = _formatNumber(f);

    // Data cells
    for (let ri = 0; ri < BOLT_POSITIONS.length; ri++) {
      const r = BOLT_POSITIONS[ri];
      const cell = grid[fi][ri];

      const td = tr.insertCell();
      td.className = 'data-cell';

      if (REQUIRED_POSITIONS.includes(r)) {
        td.classList.add('required-col');
      }

      if (showInterpolated && cell.isInterpolated) {
        td.classList.add('interpolated');
      }

      // Add target match indicator
      const key = `${cell.frontBolt},${cell.rearBolt}`;
      if (topMatches.has(key)) {
        const matchType = topMatches.get(key);
        td.classList.add(`best-${matchType}`);
      }

      // Render cell value
      const value = showCaster && !isRearWheel
        ? calculateCaster(cell.neg20, cell.pos20, { steeringRatio })
        : cell.zero;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'cell-value';
      valueSpan.textContent = value.toFixed(2);
      td.appendChild(valueSpan);
    }
  }

  return table;
}

/**
 * Build a symmetry pair table (e.g., FL vs FR at same bolt position)
 * Shows comparison of measurements at a specific bolt combination
 *
 * @param {string} title - Table title
 * @param {object} flCell - FL grid cell
 * @param {object} frCell - FR grid cell
 * @param {string} metric - 'camber' or 'caster'
 * @returns {HTMLElement}
 */
export function buildSymmetryTable(title, flCell, frCell, metric = 'camber') {
  const container = document.createElement('div');
  container.className = 'symmetry-table-container';

  const heading = document.createElement('h4');
  heading.textContent = title;
  container.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'symmetry-table';

  // Header
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  _appendHeaderCell(headerRow, 'Wheel');
  _appendHeaderCell(headerRow, metric === 'camber' ? 'Camber (°)' : 'Caster (°)');
  _appendHeaderCell(headerRow, 'Difference (°)');

  // Body
  const tbody = table.createTBody();

  const flValue = metric === 'camber' ? flCell.zero : calculateCaster(flCell.neg20, flCell.pos20);
  const frValue = metric === 'camber' ? frCell.zero : calculateCaster(frCell.neg20, frCell.pos20);
  const difference = Math.abs(flValue - frValue);

  // FL row
  let row = tbody.insertRow();
  row.insertCell().textContent = 'Front Left';
  row.insertCell().textContent = flValue.toFixed(2);
  row.insertCell().textContent = '—';

  // FR row
  row = tbody.insertRow();
  row.insertCell().textContent = 'Front Right';
  row.insertCell().textContent = frValue.toFixed(2);
  row.insertCell().textContent = '—';

  // Difference row
  row = tbody.insertRow();
  row.className = difference < 0.1 ? 'symmetric' : 'asymmetric';
  row.insertCell().textContent = 'Difference';
  row.insertCell().textContent = '—';
  row.insertCell().textContent = difference.toFixed(2);

  container.appendChild(table);
  return container;
}

/**
 * Build a bolt info table
 * Shows nearby bolt positions and their values
 *
 * @param {object} grid - 13×13 grid of cells
 * @param {number} centerFront - Center front bolt position
 * @param {number} centerRear - Center rear bolt position
 * @param {number} radius - How many bolts away to show (e.g., 1 = 3×3 grid)
 * @returns {HTMLTableElement}
 */
export function buildBoltInfoTable(grid, centerFront, centerRear, radius = 1) {
  const table = document.createElement('table');
  table.className = 'bolt-info-table';

  // Header
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  _appendHeaderCell(headerRow, '');
  for (let fr = centerRear - radius; fr <= centerRear + radius; fr++) {
    _appendHeaderCell(headerRow, _formatNumber(fr));
  }

  // Body
  const tbody = table.createTBody();
  for (let ff = centerFront - radius; ff <= centerFront + radius; ff++) {
    const row = tbody.insertRow();
    _appendHeaderCell(row, _formatNumber(ff));

    for (let fr = centerRear - radius; fr <= centerRear + radius; fr++) {
      const cell = grid[ff + 6]?.[fr + 6]; // Convert to grid indices
      const td = row.insertCell();

      if (!cell) {
        td.textContent = '—';
        td.className = 'unavailable';
      } else {
        td.textContent = cell.zero.toFixed(2);
        td.className = ff === centerFront && fr === centerRear ? 'center' : '';
      }
    }
  }

  return table;
}

/**
 * Build an empty state table (for when no data is available)
 * @param {number} rows - Number of rows (default 13)
 * @param {number} cols - Number of columns (default 13)
 * @returns {HTMLTableElement}
 */
export function buildEmptyTable(rows = 13, cols = 13) {
  const table = document.createElement('table');
  table.className = 'data-table empty-table';

  const tbody = table.createTBody();
  for (let fi = 0; fi < rows; fi++) {
    const tr = tbody.insertRow();
    for (let ri = 0; ri < cols; ri++) {
      const td = tr.insertCell();
      td.textContent = '—';
      td.className = 'empty-cell';
    }
  }

  return table;
}

/**
 * Add table to a container with common styling
 * @param {HTMLElement} container - Target container
 * @param {HTMLTableElement} table - Table to add
 * @param {object} options - Styling options
 *   - showBorder: bool (add border)
 *   - highlight: bool (add highlight class)
 * @returns {void}
 */
export function addTableToContainer(container, table, options = {}) {
  if (options.showBorder) {
    table.classList.add('bordered');
  }
  if (options.highlight) {
    table.classList.add('highlighted');
  }
  container.appendChild(table);
}

/**
 * Helper: Format a number for display (add + sign for positive)
 * @param {number} n - Number to format
 * @returns {string}
 */
function _formatNumber(n) {
  return n > 0 ? `+${n}` : String(n);
}

/**
 * Helper: Create and append a header cell
 * @param {HTMLTableRowElement} row - Table row
 * @param {string} text - Cell text
 * @param {string} className - CSS class
 * @returns {HTMLTableCellElement}
 */
function _appendHeaderCell(row, text, className = '') {
  const cell = document.createElement('th');
  cell.textContent = text;
  if (className) cell.className = className;
  row.appendChild(cell);
  return cell;
}
