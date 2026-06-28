/**
 * input-grid.js — Main controller for the Input Sheet page (input.html).
 *
 * Responsibilities:
 *   - Build the 13×13 grid dynamically (rows = rear bolt, cols = front bolt)
 *   - 3 inputs per cell: camber at 360° ACW, 0°, 360° CW steering wheel sweep
 *   - Required position cells (bolt values in {−6,−3,0,+3,+6}) visually distinct
 *   - Cell state: empty / partial / filled + border colouring
 *   - Progress indicator: X/25 required, Y/169 total
 *   - Tab navigation through all inputs left→right, top→bottom
 *   - Row/column focus highlight on input focus
 *   - Wheel selector tabs (FL / FR) — saves/restores per-wheel state
 *   - Setup overlay blocks use until user picks the data/ save folder once per session
 *   - Auto-load from data/alignment-{wheel}.csv on page open (via fetch)
 *   - CSV save via showDirectoryPicker (data/ folder, picked once, then silent)
 *   - JSON import (file input → importGridFromJSON → populate all wheels)
 */

import { REQUIRED_POSITIONS, WHEELS, FRONT_WHEELS, REAR_WHEELS, TARGET_TOE_FRONT, TARGET_TOE_REAR, getRequiredPositions, getCurrentMeasurementDensity, getBoltPositions } from './constants.js';
import { exportGridToJSON, importGridFromJSON } from './json-io.js';
import { _sign } from './format-utils.js';
import { _showError, _hideError, _showWarning, _hideWarning } from './error-utils.js';
import { _getStorageKey, _getToeStorageKey } from './localstorage-io.js';
import { generateGrid, generateThreeColorGrid } from './dummy-data-generator.js';

// Helper to get input field labels based on measurement mode
function getInputLabels() {
  const casterInputMode = localStorage.getItem('alignment_constant_caster_input_mode') || 'steering-ratio';
  const wheelDegrees = parseFloat(localStorage.getItem('alignment_constant_caster_wheel_degrees')) || 24;

  if (casterInputMode === 'wheel-degrees') {
    const wheelLabel = `${wheelDegrees.toFixed(0)}°`;
    return [
      { key: 'pos20', label: `−${wheelLabel}` },
      { key: 'zero',  label: '0°' },
      { key: 'neg20', label: `+${wheelLabel}` },
    ];
  } else {
    return [
      { key: 'pos20', label: '360° ACW' },
      { key: 'zero',  label: '0°' },
      { key: 'neg20', label: '360° CW' },
    ];
  }
}

// ── State ─────────────────────────────────────────────────────────────────

function _getDefaultToeTarget(wheel) {
  return FRONT_WHEELS.includes(wheel) ? TARGET_TOE_FRONT : TARGET_TOE_REAR;
}

/** @type {'FL'|'FR'} */
let activeWheel = 'FL';

/**
 * Directory handle for the site's data/ folder.
 * Acquired once via showDirectoryPicker(); all same-session saves write silently.
 * @type {FileSystemDirectoryHandle|null}
 */
let _dirHandle = null;

/**
 * Get the localStorage key for a specific wheel.
 * Uses per-wheel keys so clearing one wheel doesn't affect the other.
 */
/**
 * Per-wheel in-memory grid state.
 * gridState[wheel][frontBolt][rearBolt] = { neg20: string, zero: string, pos20: string }
 */
const gridState = {};
const toeState = {};

/**
 * Initialize grid state based on current bolt positions (dynamic based on measurement density).
 * Rear wheels get an additional 'toe' field per cell.
 */
function _initializeGridState() {
  const boltPositions = getBoltPositions();

  // Clear existing state
  Object.keys(gridState).forEach(key => delete gridState[key]);
  Object.keys(toeState).forEach(key => delete toeState[key]);

  // Reinitialize with current bolt positions
  for (const w of WHEELS) {
    gridState[w] = {};
    toeState[w] = '';
    for (const f of boltPositions) {
      gridState[w][f] = {};
      for (const r of boltPositions) {
        const cellState = { neg20: '', zero: '', pos20: '' };
        if (REAR_WHEELS.includes(w)) {
          cellState.toe = '';
        }
        gridState[w][f][r] = cellState;
      }
    }
  }
}

// Initialize on module load
_initializeGridState();

/** Debounce timer ID for localStorage writes. */
let _saveDebounceTimer = null;

/** Flag to track if there are pending changes to flush. */
let _hasPendingChanges = false;

function _saveToeToStorage() {
  try {
    const raw = toeState[activeWheel];
    if (raw === '' || raw == null) {
      localStorage.removeItem(_getToeStorageKey(activeWheel));
      return;
    }
    localStorage.setItem(_getToeStorageKey(activeWheel), raw);
  } catch (_) {}
}

function _saveAllToeToStorage() {
  try {
    for (const wheel of WHEELS) {
      const raw = toeState[wheel];
      if (raw === '' || raw == null) {
        localStorage.removeItem(_getToeStorageKey(wheel));
      } else {
        localStorage.setItem(_getToeStorageKey(wheel), raw);
      }
    }
  } catch (_) {}
}

// ── Persistent storage ───────────────────────────────────────────────────

/**
 * Immediately flush pending changes to localStorage.
 * Called by debounced _saveToStorage() or when switching wheels/closing page.
 */
function _flushStorage() {
  if (!_hasPendingChanges) return;
  try {
    const key = _getStorageKey(activeWheel);
    localStorage.setItem(key, JSON.stringify(gridState[activeWheel]));
  } catch (_) {
    // localStorage unavailable or quota exceeded — fail silently
  }
  _hasPendingChanges = false;
}

function _flushAllWheelsToStorage() {
  try {
    for (const wheel of WHEELS) {
      const key = _getStorageKey(wheel);
      localStorage.setItem(key, JSON.stringify(gridState[wheel]));
    }
  } catch (_) {
    // localStorage unavailable or quota exceeded — fail silently
  }
}

/**
 * Debounced save to localStorage. Accumulates changes and writes every 500ms.
 * Called on every field edit. Dramatically reduces localStorage write frequency.
 */
function _saveToStorage() {
  _hasPendingChanges = true;
  
  // Clear existing timer if any
  if (_saveDebounceTimer !== null) {
    clearTimeout(_saveDebounceTimer);
  }
  
  // Set new timer
  _saveDebounceTimer = setTimeout(() => {
    _flushStorage();
    _saveDebounceTimer = null;
  }, 500);
}

/**
 * Restore gridState from localStorage on page load.
 * Runs before _loadFromDataFiles() so in-progress work takes priority over
 * the last-saved CSV checkpoint.
 * Loads each wheel independently using per-wheel keys.
 */
function _restoreFromStorage() {
  try {
    const boltPositions = getBoltPositions();
    for (const wheel of WHEELS) {
      const key = _getStorageKey(wheel);
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const saved = JSON.parse(raw);
      const isRearWheel = REAR_WHEELS.includes(wheel);
      for (const f of boltPositions) {
        for (const r of boltPositions) {
          const cell = saved?.[f]?.[r];
          if (!cell) continue;
          const restored = {
            neg20: cell.neg20 ?? '',
            zero:  cell.zero  ?? '',
            pos20: cell.pos20 ?? '',
          };
          if (isRearWheel) {
            restored.toe = cell.toe ?? '';
          }
          gridState[wheel][f][r] = restored;
        }
      }

      const toeRaw = localStorage.getItem(_getToeStorageKey(wheel));
      if (toeRaw != null && toeRaw !== '') {
        toeState[wheel] = toeRaw;
      }
    }
  } catch (_) {
    // Corrupt or unrecognised data — start fresh
  }
}

// ── Entry point ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  _buildGrid();
  _restoreFromStorage();
  _applyWheelInputMode(activeWheel);
  _populateGrid(activeWheel);
  _renderToeInput();
  _updateProgress();
  _bindControls();
  // NOTE: Auto-loading CSV files is disabled because:
  // 1. It interferes with test isolation (loads sample data for all wheels)
  // 2. CSV import is documented as manual (button click, file upload)
  // 3. Users work with empty wheels intentionally at start
  // _loadFromDataFiles();
});

// Flush any pending changes before the page unloads
window.addEventListener('beforeunload', () => {
  _flushStorage();
});

// ── Grid construction ─────────────────────────────────────────────────────

/**
 * Build the static DOM structure of the 13×13 grid once.
 * Rows = rear bolt (−6 to +6), Cols = front bolt (−6 to +6).
 * The grid uses CSS Grid layout; all cells are positioned in order.
 */
function _buildGrid() {
  const grid = document.getElementById('input-grid');
  const boltPositions = getBoltPositions();
  const isRearWheel = REAR_WHEELS.includes(activeWheel);

  // Bolt labels - keep camber on columns for both front and rear
  // Columns (horizontal): always Camber
  // Rows (vertical): Caster for front, Toe for rear
  const frontBoltLabel = 'Camber Bolt';  // columns are always camber
  const rearBoltLabel = isRearWheel ? 'Toe Bolt' : 'Caster Bolt';  // rows differ
  const frontMetricLabel = 'Camber';  // columns are always camber
  const rearMetricLabel = isRearWheel ? 'Toe' : 'Caster';  // rows differ

  // CSS grid: 1 row-header column + N data columns
  const colCount = 1 + boltPositions.length;
  grid.style.gridTemplateColumns = `85px repeat(${boltPositions.length}, 140px)`;

  // ── Row 0: corner + column headers (front bolt positions) ──────────────
  const corner = _el('div', 'grid-corner sub-header');
  corner.setAttribute('aria-hidden', 'true');
  // Classes based on metric type, not position
  const frontBoltClass = 'metric-camber';  // columns always camber
  const rearBoltClass = isRearWheel ? 'metric-toe' : 'metric-caster';  // rows differ
  corner.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; white-space: nowrap;"><span class="${frontBoltClass}">${frontMetricLabel}</span>→</div><div style="display: flex; align-items: center; justify-content: center; white-space: nowrap;"><span class="${rearBoltClass}">${rearMetricLabel}</span>↓</div>`;
  grid.appendChild(corner);

  for (const f of boltPositions) {
    const th = _el('div', `grid-col-header sub-header${_isRequired(f) ? ' required' : ''}`);
    th.dataset.col = f;
    th.innerHTML = `<span class="${frontBoltClass}">${_sign(f)}</span>`;
    th.setAttribute('aria-label', `${frontBoltLabel} ${_sign(f)}`);
    grid.appendChild(th);
  }

  // ── Rows 1–N: row header + N cells ───────────────────────────────────
  // For rear wheels: swap axes so camber is on columns (same as front)
  // Front: columns=camber, rows=caster
  // Rear: columns=camber, rows=toe (NOT columns=toe, rows=camber)
  if (isRearWheel) {
    // Rear: use r for columns (camber), f for rows (toe)
    for (const f of boltPositions) {
      const rh = _el('div', `grid-row-header sub-header${_isRequired(f) ? ' required' : ''}`);
      rh.dataset.row = f;
      rh.innerHTML = `<span class="${rearBoltClass}">${_sign(f)}</span>`;
      rh.setAttribute('aria-label', `${rearBoltLabel} ${_sign(f)}`);
      grid.appendChild(rh);

      for (const r of boltPositions) {
        const cell = _buildCell(r, f);
        grid.appendChild(cell);
      }
    }
  } else {
    // Front: standard layout (f=columns, r=rows)
    for (const r of boltPositions) {
      const rh = _el('div', `grid-row-header sub-header${_isRequired(r) ? ' required' : ''}`);
      rh.dataset.row = r;
      rh.innerHTML = `<span class="${rearBoltClass}">${_sign(r)}</span>`;
      rh.setAttribute('aria-label', `${rearBoltLabel} ${_sign(r)}`);
      grid.appendChild(rh);

      for (const f of boltPositions) {
        const cell = _buildCell(f, r);
        grid.appendChild(cell);
      }
    }
  }
}

/** Build a single grid cell with 3 inputs for front, 2 inputs for rear (camber + toe). */
function _buildCell(camberBolt, casterBolt) {
  const isReq = _isRequired(camberBolt) && _isRequired(casterBolt);
  const cell = _el('div', `grid-cell${isReq ? ' required' : ''}`);
  cell.dataset.camber = camberBolt;
  cell.dataset.caster  = casterBolt;
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('aria-label', `Camber ${_sign(camberBolt)}, Caster ${_sign(casterBolt)}`);

  const isRearWheel = REAR_WHEELS.includes(activeWheel);

  if (isRearWheel) {
    // Rear wheels: camber at 0° + toe (mm)
    const camberWrap = _el('div', 'cell-row');
    const camberLbl = _el('span', 'cell-label');
    camberLbl.textContent = 'Camber';
    const camberInp = _el('input', 'cell-input');
    camberInp.type = 'text';
    camberInp.inputMode = 'decimal';
    camberInp.placeholder = '—';
    camberInp.dataset.front = camberBolt;
    camberInp.dataset.rear = casterBolt;
    camberInp.dataset.key = 'zero';
    camberInp.setAttribute('aria-label', `Camber at 0°, camber bolt ${_sign(camberBolt)}, toe bolt ${_sign(casterBolt)}`);
    camberInp.addEventListener('input', () => _onInputChange(camberBolt, casterBolt));
    camberInp.addEventListener('focus', () => _onInputFocus(camberBolt, casterBolt));
    camberInp.addEventListener('blur', _onInputBlur);
    camberInp.addEventListener('keydown', _onKeyDown);
    camberWrap.appendChild(camberLbl);
    camberWrap.appendChild(camberInp);
    cell.appendChild(camberWrap);

    // Toe input
    const toeWrap = _el('div', 'cell-row');
    const toeLbl = _el('span', 'cell-label');
    toeLbl.textContent = 'Toe (mm)';
    const toeInp = _el('input', 'cell-input');
    toeInp.type = 'text';
    toeInp.inputMode = 'decimal';
    toeInp.placeholder = '—';
    toeInp.dataset.front = camberBolt;
    toeInp.dataset.rear = casterBolt;
    toeInp.dataset.key = 'toe';
    toeInp.setAttribute('aria-label', `Toe mm string-box delta, camber bolt ${_sign(camberBolt)}, toe bolt ${_sign(casterBolt)}`);
    toeInp.addEventListener('input', () => _onInputChange(camberBolt, casterBolt));
    toeInp.addEventListener('focus', () => _onInputFocus(camberBolt, casterBolt));
    toeInp.addEventListener('blur', _onInputBlur);
    toeInp.addEventListener('keydown', _onKeyDown);
    toeWrap.appendChild(toeLbl);
    toeWrap.appendChild(toeInp);
    cell.appendChild(toeWrap);
  } else {
    // Front wheels: camber at three steering angles
    const defs = getInputLabels();
    for (const { key, label } of defs) {
      const wrap = _el('div', 'cell-row');

      const lbl = _el('span', 'cell-label');
      lbl.textContent = label;

      const inp = _el('input', 'cell-input');
      inp.type = 'text';
      inp.inputMode = 'decimal';
      inp.placeholder = '—';
      inp.dataset.front = camberBolt;
      inp.dataset.rear = casterBolt;
      inp.dataset.key = key;
      inp.setAttribute('aria-label', `${label} steering wheel, camber ${_sign(camberBolt)}, caster ${_sign(casterBolt)}`);

      inp.addEventListener('input', () => _onInputChange(camberBolt, casterBolt));
      inp.addEventListener('focus', () => _onInputFocus(camberBolt, casterBolt));
      inp.addEventListener('blur', _onInputBlur);
      inp.addEventListener('keydown', _onKeyDown);

      wrap.appendChild(lbl);
      wrap.appendChild(inp);
      cell.appendChild(wrap);
    }
  }

  return cell;
}

// ── Grid population ───────────────────────────────────────────────────────

/** Write gridState[wheel] values into the DOM inputs. */
function _populateGrid(wheel) {
  const boltPositions = getBoltPositions();
  const isRearWheel = REAR_WHEELS.includes(wheel);

  if (isRearWheel) {
    // Rear wheels: grid axes swapped (camber on columns, toe on rows)
    // Iterate matching _buildGrid(): f=toe (rows), r=camber (columns)
    for (const f of boltPositions) {
      for (const r of boltPositions) {
        const state = gridState[wheel][f][r];
        // Grid built with _buildCell(r, f), so inputs have data-front=r, data-rear=f
        const inputs = _getInputs(r, f);
        if (inputs) {
          inputs.zero.value  = state.zero;
          if (inputs.toe) {
            inputs.toe.value = state.toe || '';
          }
          _updateCellClass(r, f);
        }
      }
    }
  } else {
    // Front wheels: standard iteration
    for (const f of boltPositions) {
      for (const r of boltPositions) {
        const state = gridState[wheel][f][r];
        const inputs = _getInputs(f, r);
        if (inputs) {
          inputs.neg20.value = state.neg20;
          inputs.zero.value  = state.zero;
          inputs.pos20.value = state.pos20;
          _updateCellClass(f, r);
        }
      }
    }
  }
  // Debug: Log first cell values for each wheel (using first bolt position, not hardcoded -6)
  if (window.location.pathname.includes('input') && boltPositions.length > 0) {
    const firstPos = boltPositions[0];
    const state0 = gridState[wheel][firstPos][firstPos];
    console.log(`[DEBUG] _populateGrid(${wheel}): first cell (${firstPos},${firstPos}) = ${state0.zero || '(empty)'}${isRearWheel ? `, toe ${state0.toe || '(empty)'}` : ''}`);
  }
}

// ── Event handlers ────────────────────────────────────────────────────────

function _onInputChange(f, r) {
  const isRearWheel = REAR_WHEELS.includes(activeWheel);
  const values = isRearWheel
    ? { neg20: '', zero: '', pos20: '', toe: '' }
    : { neg20: '', zero: '', pos20: '' };

  const inputs = document.querySelectorAll(`input.cell-input[data-front="${f}"][data-rear="${r}"]`);
  inputs.forEach(input => {
    const key = input.dataset.key;
    values[key] = input.value.trim();
  });

  // Rear wheels are camber-at-straight only. Mirror zero to keep pipeline compatible.
  if (isRearWheel) {
    values.neg20 = values.zero;
    values.pos20 = values.zero;
  }

  gridState[activeWheel][f][r] = values;
  console.log(`[DEBUG] _onInputChange(${activeWheel}, ${f}, ${r}): saved ${values.zero}${isRearWheel ? `, toe ${values.toe}` : ''}`);
  _updateCellClass(f, r);
  _updateProgress();
  _saveToStorage();
}

function _onToeInputChange(value) {
  toeState[activeWheel] = value.trim();
  _saveToeToStorage();
}

function _onInputFocus(f, r) {
  // Highlight row headers and column headers
  document.querySelectorAll('.grid-row-header, .grid-col-header').forEach(el => {
    el.classList.remove('row-highlight', 'col-highlight');
  });
  document.querySelectorAll('.grid-cell').forEach(el => {
    el.classList.remove('row-highlight', 'col-highlight');
  });

  const rowHeader = document.querySelector(`.grid-row-header[data-row="${r}"]`);
  const colHeader = document.querySelector(`.grid-col-header[data-col="${f}"]`);
  if (rowHeader) rowHeader.classList.add('row-highlight');
  if (colHeader) colHeader.classList.add('col-highlight');

  // Highlight cells in same row/col
  document.querySelectorAll(`.grid-cell[data-caster="${r}"]`).forEach(el => el.classList.add('row-highlight'));
  document.querySelectorAll(`.grid-cell[data-camber="${f}"]`).forEach(el => el.classList.add('col-highlight'));
}

function _onInputBlur() {
  // Remove highlights after a brief delay so clicking another input doesn't flicker
  setTimeout(() => {
    if (!document.activeElement?.classList.contains('cell-input')) {
      document.querySelectorAll('.grid-row-header, .grid-col-header, .grid-cell').forEach(el => {
        el.classList.remove('row-highlight', 'col-highlight');
      });
    }
  }, 80);
}

/** Tab custom navigation: move to next input in reading order. */
function _onKeyDown(e) {
  if (e.key !== 'Tab') return;
  e.preventDefault();

  const allInputs = Array.from(document.querySelectorAll('#input-grid .cell-input'));
  const idx = allInputs.indexOf(e.target);
  if (idx === -1) return;

  const next = e.shiftKey
    ? allInputs[idx - 1]
    : allInputs[idx + 1];

  if (next) {
    next.focus();
    next.select();
  }
}

// ── Cell class management ─────────────────────────────────────────────────

function _updateCellClass(f, r) {
  const cell = document.querySelector(`.grid-cell[data-camber="${f}"][data-caster="${r}"]`);
  if (!cell) return;

  const { neg20, zero, pos20 } = gridState[activeWheel][f][r];
  const filled = [neg20, zero, pos20].filter(v => v !== '').length;

  cell.classList.remove('filled', 'partial');
  if (filled === 3)     cell.classList.add('filled');
  else if (filled > 0)  cell.classList.add('partial');
}

// ── Progress indicator ────────────────────────────────────────────────────

function _updateProgress() {
  // Progress bar removed
}


// ── Wheel selector ────────────────────────────────────────────────────────

function _bindControls() {
  // Wheel tabs
  document.querySelectorAll('#wheel-selector button').forEach(btn => {
    btn.addEventListener('click', () => {
      const wheel = btn.dataset.wheel;
      if (wheel === activeWheel) return;

      // Flush any pending changes before switching wheels
      _flushStorage();

      document.querySelectorAll('#wheel-selector button').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });

      activeWheel = wheel;

      // Rebuild grid for new wheel type (front wheels don't have toe, rear wheels do)
      const gridContainer = document.getElementById('input-grid');
      gridContainer.innerHTML = '';
      _buildGrid();

      _applyWheelInputMode(activeWheel);
      _populateGrid(activeWheel);
    });
  });

  // JSON export
  document.getElementById('btn-download')?.addEventListener('click', _exportJSON);

  // JSON import
  document.getElementById('csv-upload')?.addEventListener('change', _importJSON);

  // Load sample data
  const sampleBtn = document.getElementById('btn-sample');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', _loadSampleData);
  }

  // Clear all
  document.getElementById('btn-clear')?.addEventListener('click', _clearAll);
}

// ── Sample data ───────────────────────────────────────────────────────────

/**
 * Fills the active wheel's grid with three-color test scenario data.
 * Demonstrates all status indicator colors:
 * - FL/FR: GREEN camber (perfect match at target)
 * - FR: ORANGE caster (off-target)
 * - RL/RR: RED (no symmetric match)
 */
function _loadSampleData() {
  console.log('_loadSampleData called for wheel:', activeWheel);

  // Check if there's existing data BEFORE changing config
  // Save current bolt positions for the check
  const currentBoltPositions = getBoltPositions();
  const hasAnyData = WHEELS.some(wheel => {
    if (gridState[wheel]) {
      return currentBoltPositions.some(f =>
        currentBoltPositions.some(r => gridState[wheel][f][r].neg20 !== '')
      );
    }
    return false;
  });

  // Show modal as confirmation dialog (replaces native confirm)
  // Modal will handle setting config and loading data if user confirms
  _showSampleDataConfirmModal(hasAnyData);
}

// ── Sample data confirmation modal ────────────────────────────────────────

function _showSampleDataConfirmModal(hasExistingData) {
  // Remove existing modal if present
  const existingModal = document.getElementById('sample-data-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const replacementWarning = hasExistingData
    ? '<p style="margin: 16px 0; line-height: 1.6; color: var(--warning); font-weight: bold;">⚠️ This will replace all existing measurement data across all wheels (FL, FR, RL, RR).</p>'
    : '';

  const modalHTML = `
    <div id="sample-data-modal" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: 'Share Tech Mono', monospace;
    ">
      <div style="
        background-color: var(--bg);
        color: var(--text);
        padding: 32px;
        border-radius: 4px;
        border: 1px solid var(--border);
        max-width: 500px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="margin-top: 0; color: var(--accent); font-size: 18px;">Load Sample Data</h2>
        <p style="margin: 16px 0; line-height: 1.6;">
          Sample data will be loaded with measurement points set to <strong>13×13</strong> (maximum).
        </p>
        <p style="margin: 16px 0; line-height: 1.6;">
          This demonstrates a complete measurement grid with all 169 positions populated with synthetic data across all four wheels (FL, FR, RL, RR).
        </p>
        ${replacementWarning}
        <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
          <button id="sample-data-modal-cancel" style="
            background-color: var(--panel-alt);
            color: var(--text);
            border: 1px solid var(--border);
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Share Tech Mono', monospace;
            font-size: 14px;
          ">Cancel</button>
          <button id="sample-data-modal-confirm" style="
            background-color: var(--accent);
            color: var(--bg);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Share Tech Mono', monospace;
            font-size: 14px;
          ">Load Sample Data</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('sample-data-modal');
  const confirmBtn = document.getElementById('sample-data-modal-confirm');
  const cancelBtn = document.getElementById('sample-data-modal-cancel');

  function closeModal() {
    modal.remove();
  }

  function proceedWithSampleData() {
    closeModal();

    // NOW set config to 13x13 (after user confirmed)
    localStorage.setItem('alignment_measurement_density', '13');

    // Update density selector UI if it exists (on settings page)
    const densitySelect = document.getElementById('measurement-density-select');
    if (densitySelect) {
      densitySelect.value = '13';
    }

    // Reinitialize gridState with NEW 13x13 structure
    _initializeGridState();

    // Rebuild grid HTML to match new 13x13 structure (was built with 5x5)
    const gridContainer = document.getElementById('input-grid');
    gridContainer.innerHTML = '';
    _buildGrid();

    // Get bolt positions with new config
    const boltPositions = getBoltPositions();

    // Load sample data
    _loadSampleDataIntoGrid(boltPositions);
  }

  confirmBtn.addEventListener('click', proceedWithSampleData);
  cancelBtn.addEventListener('click', closeModal);

  // Close modal if clicking outside the dialog
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Close on Escape key
  const closeOnEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', closeOnEscape);
    }
  };
  document.addEventListener('keydown', closeOnEscape);
}

// ── Load sample data into grid (called after confirmation) ──────────────────

function _loadSampleDataIntoGrid(boltPositions) {
  // Load sample data for all wheels
  for (const wheel of WHEELS) {
    console.log('Generating sample data for wheel:', wheel);
    const generatedGrid = generateThreeColorGrid(wheel, boltPositions);

    const isRearWheel = _isRearWheel(wheel);

    // Rear wheel toe at center bolt position (matches generateThreeColorGrid model)
    const centerToeBase = wheel === 'RL' ? 0.15 : wheel === 'RR' ? 0.17 : 0;

    for (const f of boltPositions) {
      for (const r of boltPositions) {
        const cell = generatedGrid[f][r];
        const zeroValue = cell.zero;
        gridState[wheel][f][r] = {
          neg20: isRearWheel ? zeroValue : cell.neg20,
          zero:  zeroValue,
          pos20: isRearWheel ? zeroValue : cell.pos20
        };

        // Use toe from generated grid if available, otherwise compute from model
        if (isRearWheel) {
          gridState[wheel][f][r].toe = cell.toe !== undefined
            ? cell.toe
            : Math.max(0.05, centerToeBase - 0.015 * r).toFixed(2);
        }
      }
    }

    // Global toe: value at center bolt position (CsB=0)
    toeState[wheel] = isRearWheel ? centerToeBase.toFixed(2) : '';
  }

  _populateGrid(activeWheel);
  _renderToeInput();
  _updateProgress();
  _hideError();
  _hideWarning();
  _flushAllWheelsToStorage();
  _saveAllToeToStorage();
}

// ── JSON export ───────────────────────────────────────────────────────────

function _exportJSON() {
  const boltPositions = getBoltPositions();
  const hasAnyData = WHEELS.some(wheel =>
    boltPositions.some(f =>
      boltPositions.some(r => {
        const c = gridState[wheel][f][r];
        return c.neg20 !== '' || c.zero !== '' || c.pos20 !== '';
      })
    )
  );

  if (!hasAnyData) {
    _showError('No measurements to export. Fill in at least one cell.');
    return;
  }

  _hideError();

  // Warn if any wheel has incomplete required positions
  const requiredPos = getRequiredPositions();
  const minRequiredCount = requiredPos.length * requiredPos.length;
  const incompleteWheels = WHEELS.filter(wheel => {
    let filled = 0;
    for (const f of requiredPos) {
      for (const r of requiredPos) {
        const c = gridState[wheel][f]?.[r];
        if (c && c.zero !== '') filled++;
      }
    }
    return filled < minRequiredCount;
  });

  if (incompleteWheels.length > 0) {
    const posLabels = requiredPos.map(p => (p > 0 ? '+' : '') + p).join(', ');
    _showWarning(
      `Wheels ${incompleteWheels.join(', ')} have incomplete required positions. ` +
      `Interpolation accuracy may be reduced. Required positions: ${posLabels} on both axes.`
    );
  } else {
    _hideWarning();
  }

  const settings = {
    measurementMode: localStorage.getItem('alignment_constant_caster_input_mode') || 'steering-ratio',
    measurementDensity: parseInt(localStorage.getItem('alignment_measurement_density')) || 5,
  };
  const jsonContent = exportGridToJSON(gridState, toeState, settings);

  if (_dirHandle) {
    (async () => {
      try {
        const fileHandle = await _dirHandle.getFileHandle('alignment.json', { create: true });
        const writable   = await fileHandle.createWritable();
        await writable.write(jsonContent);
        await writable.close();
        _hideError();
      } catch (err) {
        _showError(`Export failed: ${err.message}`);
      }
    })();
  } else {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'alignment.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── JSON import ───────────────────────────────────────────────────────────

function _importJSON(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    _hideError();
    try {
      const { gridState: importedGrid, toeState: importedToe, settings } = importGridFromJSON(evt.target.result);
      if (settings) _applyImportedSettings(settings);
      _applyJSONToGrid(importedGrid, importedToe);
    } catch (err) {
      _showError(`Import error: ${err.message}`);
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

function _applyImportedSettings(settings) {
  const currentMode    = localStorage.getItem('alignment_constant_caster_input_mode') || 'steering-ratio';
  const currentDensity = parseInt(localStorage.getItem('alignment_measurement_density')) || 5;
  let needsRebuild = false;

  if (settings.measurementMode && settings.measurementMode !== currentMode) {
    localStorage.setItem('alignment_constant_caster_input_mode', settings.measurementMode);
    needsRebuild = true;
  }
  if (settings.measurementDensity && settings.measurementDensity !== currentDensity) {
    localStorage.setItem('alignment_measurement_density', String(settings.measurementDensity));
    needsRebuild = true;
  }

  if (needsRebuild) {
    _initializeGridState();
    const gridContainer = document.getElementById('input-grid');
    if (gridContainer) {
      gridContainer.innerHTML = '';
      _buildGrid();
    }
  }
}

function _applyJSONToGrid(importedGrid, importedToe) {
  const boltPositions = getBoltPositions();

  for (const wheel of WHEELS) {
    const isRearWheel = REAR_WHEELS.includes(wheel);

    // Reset all cells for this wheel
    for (const f of boltPositions) {
      for (const r of boltPositions) {
        gridState[wheel][f][r] = isRearWheel
          ? { neg20: '', zero: '', pos20: '', toe: '' }
          : { neg20: '', zero: '', pos20: '' };
      }
    }
    toeState[wheel] = '';

    // Apply imported cell data (JSON keys are strings; JS numeric keys coerce automatically)
    const wheelGrid = importedGrid[wheel];
    if (wheelGrid) {
      for (const f of boltPositions) {
        for (const r of boltPositions) {
          const cell = wheelGrid[f]?.[r];
          if (!cell) continue;
          const target = gridState[wheel][f][r];
          if (cell.neg20 !== undefined) target.neg20 = String(cell.neg20);
          if (cell.zero  !== undefined) target.zero  = String(cell.zero);
          if (cell.pos20 !== undefined) target.pos20 = String(cell.pos20);
          if (isRearWheel && cell.toe !== undefined) target.toe = String(cell.toe);
        }
      }
    }

    if (importedToe[wheel] !== undefined) toeState[wheel] = String(importedToe[wheel]);
  }

  _populateGrid(activeWheel);
  _renderToeInput();
  _updateProgress();
  _flushAllWheelsToStorage();
  _saveAllToeToStorage();
}

// ── Auto-load from data/ folder ───────────────────────────────────────────

/**
 * On page open, fetch alignment.json from ./data/ and populate all wheel grids.
 * Silently skips if the file is absent, unparseable, or localStorage already has data.
 */
async function _loadFromDataFiles() {
  const boltPositions = getBoltPositions();
  if (location.protocol === 'file:') return;

  // Skip fetch if localStorage already has in-progress data for any wheel
  const hasLocalData = WHEELS.some(wheel =>
    boltPositions.some(f =>
      boltPositions.some(r => {
        const c = gridState[wheel][f][r];
        return c.neg20 !== '' || c.zero !== '' || c.pos20 !== '';
      })
    )
  );
  if (hasLocalData) return;

  try {
    const res = await fetch('./data/alignment.json');
    if (!res.ok) return;
    const text = await res.text();
    const { gridState: importedGrid, toeState: importedToe, settings } = importGridFromJSON(text);
    if (settings) _applyImportedSettings(settings);
    _applyJSONToGrid(importedGrid, importedToe);
  } catch (_) {
    // File missing or parse error — leave grid empty
  }
}

// ── Clear all ─────────────────────────────────────────────────────────────

function _clearAll() {
  const boltPositions = getBoltPositions();
  if (!confirm('Clear ALL wheel measurements? This cannot be undone.')) return;

  for (const wheel of WHEELS) {
    for (const f of boltPositions) {
      for (const r of boltPositions) {
        gridState[wheel][f][r] = { neg20: '', zero: '', pos20: '' };
      }
    }
    toeState[wheel] = '';
  }

  _populateGrid(activeWheel);
  _renderToeInput();
  _updateProgress();
  _hideError();

  try {
    for (const wheel of WHEELS) {
      localStorage.removeItem(_getStorageKey(wheel));
      localStorage.removeItem(_getToeStorageKey(wheel));
    }
  } catch (_) {
    // localStorage unavailable — fail silently
  }
}

function _renderToeInput() {
  // Toe input removed
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _isRequired(pos) {
  return getRequiredPositions().includes(pos);
}

function _el(tag, className = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function _getInputs(f, r) {
  const inputs = document.querySelectorAll(`input.cell-input[data-front="${f}"][data-rear="${r}"]`);
  const isRearWheel = REAR_WHEELS.includes(activeWheel);
  const expectedCount = isRearWheel ? 2 : 3;
  if (inputs.length !== expectedCount) return null;
  const out = { neg20: null, zero: null, pos20: null };
  if (isRearWheel) out.toe = null;
  inputs.forEach(input => {
    out[input.dataset.key] = input;
  });
  return out;
}

function _isRearWheel(wheel) {
  return REAR_WHEELS.includes(wheel);
}

function _applyWheelInputMode(wheel) {
  const rearMode = _isRearWheel(wheel);
  document.querySelectorAll('#input-grid .cell-row').forEach(row => {
    const input = row.querySelector('input.cell-input');
    if (!input) return;
    const key = input.dataset.key;
    const isZero = key === 'zero';
    const isToe = key === 'toe';

    if (rearMode) {
      // Rear wheels: show zero (camber) and toe, hide pos20/neg20
      if (isZero || isToe) {
        row.style.display = '';
        input.disabled = false;
        input.tabIndex = 0;
      } else {
        row.style.display = 'none';
        input.disabled = true;
        input.tabIndex = -1;
      }
    } else {
      // Front wheels: show all (pos20, zero, neg20)
      row.style.display = '';
      input.disabled = false;
      input.tabIndex = 0;
    }
  });
}


