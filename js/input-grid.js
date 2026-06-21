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
 *   - CSV load (file input → parseCSV → populate grid, manual override)
 */

import { BOLT_POSITIONS, REQUIRED_POSITIONS, WHEELS, FRONT_WHEELS, REAR_WHEELS, TARGET_TOE_FRONT, TARGET_TOE_REAR } from './constants.js';
function _getDefaultToeTarget(wheel) {
  return FRONT_WHEELS.includes(wheel) ? TARGET_TOE_FRONT : TARGET_TOE_REAR;
}

import { buildCSVString, downloadCSVBlob, parseCSV } from './csv-io.js';
import { generateGrid, generateThreeColorGrid } from './dummy-data-generator.js';

// ── State ─────────────────────────────────────────────────────────────────

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
function _getStorageKey(wheel) {
  return `mx5-nc1-alignment-${wheel}`;
}

function _getToeStorageKey(wheel) {
  return `mx5-nc1-alignment-toe-${wheel}`;
}

/**
 * Per-wheel in-memory grid state.
 * gridState[wheel][frontBolt][rearBolt] = { neg20: string, zero: string, pos20: string }
 */
const gridState = {};
const toeState = {};
for (const w of WHEELS) {
  gridState[w] = {};
  toeState[w] = '';
  for (const f of BOLT_POSITIONS) {
    gridState[w][f] = {};
    for (const r of BOLT_POSITIONS) {
      gridState[w][f][r] = { neg20: '', zero: '', pos20: '' };
    }
  }
}

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
    for (const wheel of WHEELS) {
      const key = _getStorageKey(wheel);
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const saved = JSON.parse(raw);
      for (const f of BOLT_POSITIONS) {
        for (const r of BOLT_POSITIONS) {
          const cell = saved?.[f]?.[r];
          if (!cell) continue;
          gridState[wheel][f][r] = {
            neg20: cell.neg20 ?? '',
            zero:  cell.zero  ?? '',
            pos20: cell.pos20 ?? '',
          };
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

  // CSS grid: 1 row-header column + 13 data columns = 14 columns total
  const colCount = 1 + BOLT_POSITIONS.length;
  grid.style.gridTemplateColumns = `44px repeat(${BOLT_POSITIONS.length}, 120px)`;

  // ── Row 0: corner + column headers (front bolt positions) ──────────────
  const corner = _el('div', 'grid-corner');
  corner.setAttribute('aria-hidden', 'true');
  corner.textContent = 'F→\nR↓';
  grid.appendChild(corner);

  for (const f of BOLT_POSITIONS) {
    const th = _el('div', `grid-col-header${_isRequired(f) ? ' required' : ''}`);
    th.dataset.col = f;
    th.textContent = _sign(f);
    th.setAttribute('aria-label', `Front bolt ${_sign(f)}`);
    grid.appendChild(th);
  }

  // ── Rows 1–13: row header + 13 cells ───────────────────────────────────
  for (const r of BOLT_POSITIONS) {
    // Row header (rear bolt)
    const rh = _el('div', `grid-row-header${_isRequired(r) ? ' required' : ''}`);
    rh.dataset.row = r;
    rh.textContent = _sign(r);
    rh.setAttribute('aria-label', `Rear bolt ${_sign(r)}`);
    grid.appendChild(rh);

    // Data cells (column axis is front bolt)
    for (const f of BOLT_POSITIONS) {
      const cell = _buildCell(f, r);
      grid.appendChild(cell);
    }
  }
}

/** Build a single grid cell with 3 inputs. */
function _buildCell(frontBolt, rearBolt) {
  const isReq = _isRequired(frontBolt) && _isRequired(rearBolt);
  const cell = _el('div', `grid-cell${isReq ? ' required' : ''}`);
  cell.dataset.front = frontBolt;
  cell.dataset.rear  = rearBolt;
  cell.setAttribute('role', 'gridcell');
  cell.setAttribute('aria-label', `Front ${_sign(frontBolt)}, Rear ${_sign(rearBolt)}`);

  // Labels ordered so straight-ahead (0°) is in the middle, ACW/CW sweeps above/below.
  const defs = [
    { key: 'pos20', label: '360° ACW' },
    { key: 'zero',  label: '0°' },
    { key: 'neg20', label: '360° CW' },
  ];

  for (const { key, label } of defs) {
    const wrap = _el('div', 'cell-row');

    const lbl = _el('span', 'cell-label');
    lbl.textContent = label;

    const inp = _el('input', 'cell-input');
    inp.type        = 'text';
    inp.inputMode   = 'decimal';
    inp.placeholder = '—';
    inp.dataset.front = frontBolt;
    inp.dataset.rear  = rearBolt;
    inp.dataset.key   = key;
    inp.setAttribute('aria-label', `${label} steering wheel, front ${_sign(frontBolt)}, rear ${_sign(rearBolt)}`);

    inp.addEventListener('input',   () => _onInputChange(frontBolt, rearBolt));
    inp.addEventListener('focus',   () => _onInputFocus(frontBolt, rearBolt));
    inp.addEventListener('blur',    _onInputBlur);
    inp.addEventListener('keydown', _onKeyDown);

    wrap.appendChild(lbl);
    wrap.appendChild(inp);
    cell.appendChild(wrap);
  }

  return cell;
}

// ── Grid population ───────────────────────────────────────────────────────

/** Write gridState[wheel] values into the DOM inputs. */
function _populateGrid(wheel) {
  for (const f of BOLT_POSITIONS) {
    for (const r of BOLT_POSITIONS) {
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
  // Debug: Log first cell values for each wheel
  if (window.location.pathname.includes('input')) {
    const state0 = gridState[wheel][-6][-6];
    console.log(`[DEBUG] _populateGrid(${wheel}): first cell = ${state0.zero || '(empty)'}`);
  }
}

// ── Event handlers ────────────────────────────────────────────────────────

function _onInputChange(f, r) {
  const values = { neg20: '', zero: '', pos20: '' };
  const inputs = document.querySelectorAll(`input.cell-input[data-front="${f}"][data-rear="${r}"]`);
  inputs.forEach(input => {
    const key = input.dataset.key;
    values[key] = input.value.trim();
  });

  // Rear wheels are camber-at-straight only. Mirror zero to keep pipeline compatible.
  if (_isRearWheel(activeWheel)) {
    values.neg20 = values.zero;
    values.pos20 = values.zero;
  }

  gridState[activeWheel][f][r] = values;
  console.log(`[DEBUG] _onInputChange(${activeWheel}, ${f}, ${r}): saved ${values.zero}`);
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
  document.querySelectorAll(`.grid-cell[data-rear="${r}"]`).forEach(el => el.classList.add('row-highlight'));
  document.querySelectorAll(`.grid-cell[data-front="${f}"]`).forEach(el => el.classList.add('col-highlight'));
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
  const cell = document.querySelector(`.grid-cell[data-front="${f}"][data-rear="${r}"]`);
  if (!cell) return;

  const { neg20, zero, pos20 } = gridState[activeWheel][f][r];
  const filled = [neg20, zero, pos20].filter(v => v !== '').length;

  cell.classList.remove('filled', 'partial');
  if (filled === 3)     cell.classList.add('filled');
  else if (filled > 0)  cell.classList.add('partial');
}

// ── Progress indicator ────────────────────────────────────────────────────

function _updateProgress() {
  let requiredFilled = 0;
  let totalFilled    = 0;

  for (const f of BOLT_POSITIONS) {
    for (const r of BOLT_POSITIONS) {
      const { neg20, zero, pos20 } = gridState[activeWheel][f][r];
      const allFilled = neg20 !== '' && zero !== '' && pos20 !== '';
      if (allFilled) {
        totalFilled++;
        if (_isRequired(f) && _isRequired(r)) requiredFilled++;
      }
    }
  }

  const reqEl   = document.getElementById('required-count');
  const totEl   = document.getElementById('total-count');
  const reqFill = document.getElementById('required-fill');
  const totFill = document.getElementById('total-fill');

  if (reqEl) {
    reqEl.textContent = requiredFilled;
    reqEl.className = 'count' + (requiredFilled >= 25 ? ' complete' : requiredFilled > 0 ? ' partial' : '');
  }
  if (totEl) {
    totEl.textContent = totalFilled;
    totEl.className = 'count' + (totalFilled >= 169 ? ' complete' : totalFilled > 0 ? ' partial' : '');
  }
  if (reqFill) reqFill.style.width = `${(requiredFilled / 25) * 100}%`;
  if (totFill) totFill.style.width = `${(totalFilled / 169) * 100}%`;
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
      _applyWheelInputMode(activeWheel);
      _populateGrid(activeWheel);
      _renderToeInput();
      _updateProgress();
    });
  });

  const toeInput = document.getElementById('toe-input');
  if (toeInput) {
    toeInput.addEventListener('input', e => _onToeInputChange(e.target.value));
  }

  // CSV download
  document.getElementById('btn-download')?.addEventListener('click', _downloadCSV);

  // CSV load
  document.getElementById('csv-upload')?.addEventListener('change', _loadCSV);

  // Load sample data
  document.getElementById('btn-sample')?.addEventListener('click', _loadSampleData);

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
  if (gridState[activeWheel]) {
    const nonEmpty = BOLT_POSITIONS.some(f =>
      BOLT_POSITIONS.some(r => gridState[activeWheel][f][r].neg20 !== '')
    );
    if (nonEmpty && !confirm('Replace current ' + activeWheel + ' data with sample data?')) return;
  }

  // Generate grid using the three-color test scenario
  const generatedGrid = generateThreeColorGrid(activeWheel);

  // Import generated data into gridState
  for (const f of BOLT_POSITIONS) {
    for (const r of BOLT_POSITIONS) {
      const zeroValue = generatedGrid[f][r].zero;
      gridState[activeWheel][f][r] = {
        neg20: _isRearWheel(activeWheel) ? zeroValue : generatedGrid[f][r].neg20,
        zero:  zeroValue,
        pos20: _isRearWheel(activeWheel) ? zeroValue : generatedGrid[f][r].pos20
      };
    }
  }

  // Set toe value with distinct offsets for wheel selection testing
  let toeValue = 0.08;
  // Add distinct offsets for rear wheels during sample data load for testing
  if (activeWheel === 'RL') {
    toeValue = 0.04;
  } else if (activeWheel === 'RR') {
    toeValue = 0.12;
  }
  toeState[activeWheel] = toeValue.toFixed(2);

  _populateGrid(activeWheel);
  _renderToeInput();
  _updateProgress();
  _hideError();
  _hideWarning();
  _saveToStorage();
  _saveToeToStorage();
}

// ── CSV download ──────────────────────────────────────────────────────────

function _downloadCSV() {
  const toeRaw = toeState[activeWheel];
  const normalizedToe = toeRaw.replace(',', '.');
  const toeValue = toeRaw === '' ? null : parseFloat(normalizedToe);

  if (toeRaw !== '' && Number.isNaN(toeValue)) {
    _showError('Toe must be a valid number before exporting CSV.');
    return;
  }

  const rows = [];
  for (const f of BOLT_POSITIONS) {
    for (const r of BOLT_POSITIONS) {
      const { neg20, zero, pos20 } = gridState[activeWheel][f][r];
      const exportNeg20 = _isRearWheel(activeWheel) ? zero : neg20;
      const exportPos20 = _isRearWheel(activeWheel) ? zero : pos20;
      if (exportNeg20 !== '' && zero !== '' && exportPos20 !== '') {
        const n20 = parseFloat(exportNeg20);
        const z   = parseFloat(zero);
        const p20 = parseFloat(exportPos20);
        if (!Number.isNaN(n20) && !Number.isNaN(z) && !Number.isNaN(p20)) {
          rows.push({ frontBolt: f, rearBolt: r, camberNeg20: n20, camber0: z, camberPos20: p20, toe: toeValue });
        }
      }
    }
  }

  if (rows.length === 0) {
    _showError('No complete measurements to export. Fill in all 3 readings for at least one cell.');
    return;
  }

  _hideError();

  // Warn if fewer than 25 required cells are complete (interpolation quality suffers)
  const requiredFilled = rows.filter(
    row => REQUIRED_POSITIONS.includes(row.frontBolt) && REQUIRED_POSITIONS.includes(row.rearBolt)
  ).length;
  if (requiredFilled < 25) {
    _showWarning(
      `Only ${requiredFilled}/25 required positions are filled. ` +
      'Interpolation accuracy may be reduced. Required positions: −6, −3, 0, +3, +6 on both axes.'
    );
  } else {
    _hideWarning();
  }

  const csvContent = buildCSVString(rows);
  const wheel      = activeWheel;

  if (_dirHandle) {
    // FSAPI path — write silently into the directory handle acquired at startup.
    (async () => {
      try {
        const fileHandle = await _dirHandle.getFileHandle(`alignment-${wheel}.csv`, { create: true });
        const writable   = await fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();
        _hideError();
      } catch (err) {
        _showError(`Save failed: ${err.message}`);
      }
    })();
  } else {
    // Fallback for browsers without FSAPI (Firefox, Safari) — trigger browser download.
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `alignment-${wheel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── CSV load ──────────────────────────────────────────────────────────────

function _loadCSV(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = evt => {
    _hideError();
    try {
      const rows = parseCSV(evt.target.result);
      _applyCSVToGrid(rows);
    } catch (err) {
      _showError(`CSV error: ${err.message}`);
    }
    // Reset file input so the same file can be re-loaded if needed
    e.target.value = '';
  };
  reader.readAsText(file);
}

function _applyCSVToGrid(rows) {
  // Clear current wheel's grid state first, then apply CSV rows
  for (const f of BOLT_POSITIONS) {
    for (const r of BOLT_POSITIONS) {
      gridState[activeWheel][f][r] = { neg20: '', zero: '', pos20: '' };
    }
  }

  for (const row of rows) {
    const { frontBolt: f, rearBolt: r, camberNeg20, camber0, camberPos20, toe } = row;
    if (gridState[activeWheel][f] && gridState[activeWheel][f][r] !== undefined) {
      const neg20 = _isRearWheel(activeWheel) ? camber0 : camberNeg20;
      const pos20 = _isRearWheel(activeWheel) ? camber0 : camberPos20;
      gridState[activeWheel][f][r] = {
        neg20: String(neg20),
        zero:  String(camber0),
        pos20: String(pos20),
      };
    }
    if (toe != null && !Number.isNaN(Number(toe.toString().replace(',', '.')))) {
      toeState[activeWheel] = Number(toe.toString().replace(',', '.')).toFixed(2);
    }
  }

  _populateGrid(activeWheel);
  _renderToeInput();
  _updateProgress();
  _saveToStorage();
  _saveToeToStorage();
}

// ── Auto-load from data/ folder ───────────────────────────────────────────

/**
 * On page open, fetch both wheel CSVs from ./data/ and populate the grids.
 * Silently skips wheels whose files are absent or unparseable.
 */
async function _loadFromDataFiles() {
  if (location.protocol === 'file:') return; // fetch blocked on file:// — skip silently

  for (const wheel of WHEELS) {
    // Skip fetch if localStorage already has in-progress data for this wheel.
    const hasLocalData = BOLT_POSITIONS.some(f =>
      BOLT_POSITIONS.some(r => {
        const c = gridState[wheel][f][r];
        return c.neg20 !== '' || c.zero !== '' || c.pos20 !== '';
      })
    );
    if (hasLocalData) continue;

    try {
      const res = await fetch(`./data/alignment-${wheel}.csv`);
      if (!res.ok) continue;
      const text = await res.text();
      const rows = parseCSV(text);

      for (const f of BOLT_POSITIONS) {
        for (const r of BOLT_POSITIONS) {
          gridState[wheel][f][r] = { neg20: '', zero: '', pos20: '' };
        }
      }
      for (const row of rows) {
        const { frontBolt: f, rearBolt: r, camberNeg20, camber0, camberPos20, toe } = row;
        if (gridState[wheel][f]?.[r] !== undefined) {
          const neg20 = _isRearWheel(wheel) ? camber0 : camberNeg20;
          const pos20 = _isRearWheel(wheel) ? camber0 : camberPos20;
          gridState[wheel][f][r] = {
            neg20: String(neg20),
            zero:  String(camber0),
            pos20: String(pos20),
          };
        }
        if (toe != null && !Number.isNaN(Number(toe.toString().replace(',', '.')))) {
          toeState[wheel] = Number(toe.toString().replace(',', '.')).toFixed(2);
        }
      }
    } catch (_) {
      // File missing or parse error — leave grid empty
    }
  }

  _populateGrid(activeWheel);
  _renderToeInput();
  _updateProgress();
}

// ── Clear all ─────────────────────────────────────────────────────────────

function _clearAll() {
  if (!confirm(`Clear all ${activeWheel} measurements? This cannot be undone.`)) return;

  for (const f of BOLT_POSITIONS) {
    for (const r of BOLT_POSITIONS) {
      gridState[activeWheel][f][r] = { neg20: '', zero: '', pos20: '' };
    }
  }

  toeState[activeWheel] = '';

  _populateGrid(activeWheel);
  _renderToeInput();
  _updateProgress();
  _hideError();
  
  // Remove only the active wheel from localStorage; other wheels remain unaffected
  try {
    const key = _getStorageKey(activeWheel);
    localStorage.removeItem(key);
    localStorage.removeItem(_getToeStorageKey(activeWheel));
  } catch (_) {
    // localStorage unavailable — fail silently
  }
}

function _renderToeInput() {
  const toeInput = document.getElementById('toe-input');
  const toeTargetLabel = document.getElementById('toe-target-label');
  if (!toeInput || !toeTargetLabel) return;

  toeInput.value = toeState[activeWheel];
  const target = _getDefaultToeTarget(activeWheel);
  toeTargetLabel.textContent = `Target: ${target >= 0 ? '+' : ''}${target.toFixed(2)}° per wheel`;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function _isRequired(pos) {
  return REQUIRED_POSITIONS.includes(pos);
}

function _sign(n) {
  return n > 0 ? `+${n}` : String(n);
}

function _el(tag, className = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  return el;
}

function _getInputs(f, r) {
  const inputs = document.querySelectorAll(`input.cell-input[data-front="${f}"][data-rear="${r}"]`);
  if (inputs.length !== 3) return null;
  const out = { neg20: null, zero: null, pos20: null };
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
    const isZero = input.dataset.key === 'zero';

    if (rearMode && !isZero) {
      row.style.display = 'none';
      input.disabled = true;
      input.tabIndex = -1;
      return;
    }

    row.style.display = '';
    input.disabled = false;
    input.tabIndex = 0;
  });
}

function _showError(msg) {
  const el = document.getElementById('error-banner');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function _hideError() {
  const el = document.getElementById('error-banner');
  if (el) el.classList.remove('visible');
}

function _showWarning(msg) {
  const el = document.getElementById('warning-banner');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function _hideWarning() {
  const el = document.getElementById('warning-banner');
  if (el) el.classList.remove('visible');
}
