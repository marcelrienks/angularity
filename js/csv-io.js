/**
 * csv-io.js — Client-side CSV generation and parsing.
 *
 * Generates:  generateCSV(rows, wheel) → triggers file download
 * Parses:     parseCSV(text) → array of measurement objects
 */

const HEADER = 'camber_bolt,caster_bolt,camber_360acw,camber_0,camber_360cw,toe';
const LEGACY_HEADER = 'camber_bolt,caster_bolt,camber_neg20,camber_0,camber_pos20';
const LEGACY_HEADER_WITH_TOE = 'camber_bolt,caster_bolt,camber_neg20,camber_0,camber_pos20,toe';
const ALT_HEADER = 'camber_bolt,caster_bolt,camber_360acw,camber_0,camber_360cw';
const LEGACY_OLD_HEADER = 'front_bolt,rear_bolt,camber_360acw,camber_0,camber_360cw,toe';
const LEGACY_OLD_HEADER_BASE = 'front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20';
const LEGACY_OLD_HEADER_WITH_TOE = 'front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20,toe';
const LEGACY_OLD_ALT_HEADER = 'front_bolt,rear_bolt,camber_360acw,camber_0,camber_360cw';

/**
 * Build a CSV string from an array of measurement rows (no side effects).
 *
 * @param {Array<{camberBolt:number, casterBolt:number, camberNeg20:number, camber0:number, camberPos20:number, toe?:number|null}>} rows
 * @returns {string}
 */
export function buildCSVString(rows) {
  const sorted = [...rows].sort((a, b) =>
    a.camberBolt !== b.camberBolt ? a.camberBolt - b.camberBolt : a.casterBolt - b.casterBolt
  );
  const lines = [HEADER];
  for (const r of sorted) {
    lines.push(
      [
        r.camberBolt,
        r.casterBolt,
        _fmt(r.camberNeg20),
        _fmt(r.camber0),
        _fmt(r.camberPos20),
        r.toe == null || Number.isNaN(Number(r.toe)) ? '' : _fmt(Number(r.toe)),
      ].join(',')
    );
  }
  return lines.join('\n');
}

/**
 * Trigger a browser blob download of a CSV file.
 * Kept for compatibility — prefer buildCSVString() + File System Access API where available.
 *
 * @param {string} csvContent  Result of buildCSVString()
 * @param {string} wheel       e.g. 'FL' or 'FR'
 */
export function downloadCSVBlob(csvContent, wheel) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href     = url;
  a.download = `alignment-${wheel}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @deprecated  Use buildCSVString() + downloadCSVBlob() or File System Access API instead.
 */
export function generateCSV(rows, wheel) {
  downloadCSVBlob(buildCSVString(rows), wheel);
}

/**
 * Parse a CSV string into an array of measurement objects.
 * Only rows with actual measurements are included (no interpolated rows).
 * Supports legacy 'front_bolt,rear_bolt' headers for backward compatibility.
 *
 * @param {string} text  Raw CSV text
 * @returns {Array<{camberBolt:number, casterBolt:number, camberNeg20:number, camber0:number, camberPos20:number, toe:number|null}>}
 * @throws {Error}  Descriptive error on invalid format or data
 */
export function parseCSV(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row.');
  }

  const header = lines[0].toLowerCase().replace(/\s+/g, '');
  const expectedHeader = HEADER.replace(/\s+/g, '');
  const expectedLegacyHeader = LEGACY_HEADER.replace(/\s+/g, '');
  const expectedLegacyHeaderWithToe = LEGACY_HEADER_WITH_TOE.replace(/\s+/g, '');
  const expectedAltHeader = ALT_HEADER.replace(/\s+/g, '');
  const expectedOldHeader = LEGACY_OLD_HEADER.replace(/\s+/g, '');
  const expectedOldLegacyHeader = LEGACY_OLD_HEADER_BASE.replace(/\s+/g, '');
  const expectedOldLegacyHeaderWithToe = LEGACY_OLD_HEADER_WITH_TOE.replace(/\s+/g, '');
  const expectedOldAltHeader = LEGACY_OLD_ALT_HEADER.replace(/\s+/g, '');

  const hasToeColumn = header === expectedHeader || header === expectedLegacyHeaderWithToe || header === expectedOldHeader || header === expectedOldLegacyHeaderWithToe;
  const isLegacyOldFormat = header === expectedOldHeader || header === expectedOldLegacyHeader || header === expectedOldLegacyHeaderWithToe || header === expectedOldAltHeader;

  if (!hasToeColumn && header !== expectedLegacyHeader && header !== expectedAltHeader && header !== expectedOldLegacyHeader && header !== expectedOldAltHeader) {
    throw new Error(
      `Unexpected CSV header.\nExpected: ${HEADER} (or legacy ${LEGACY_HEADER})\nGot: ${lines[0]}`
    );
  }

  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const expectedColumns = hasToeColumn ? 6 : 5;
    if (cols.length !== expectedColumns) {
      throw new Error(`Row ${i + 1}: expected ${expectedColumns} columns, got ${cols.length}.\nRow: "${lines[i]}"`);
    }

    const [boltAraw, boltBraw, camberNeg20Raw, camber0Raw, camberPos20Raw, toeRaw = ''] = cols;
    const camberBolt = Number(boltAraw);
    const casterBolt = Number(boltBraw);
    const camberNeg20 = Number(camberNeg20Raw);
    const camber0 = Number(camber0Raw);
    const camberPos20 = Number(camberPos20Raw);
    const toe = toeRaw.trim() === '' ? null : Number(toeRaw);

    if ([camberBolt, casterBolt, camberNeg20, camber0, camberPos20].some(Number.isNaN)) {
      throw new Error(`Row ${i + 1}: non-numeric value.\nRow: "${lines[i]}"`);
    }
    if (toeRaw.trim() !== '' && Number.isNaN(toe)) {
      throw new Error(`Row ${i + 1}: toe must be numeric when provided.\nRow: "${lines[i]}"`);
    }

    if (camberBolt < -6 || camberBolt > 6) {
      throw new Error(`Row ${i + 1}: camber_bolt ${camberBolt} is outside −6 to +6 range.`);
    }
    if (casterBolt < -6 || casterBolt > 6) {
      throw new Error(`Row ${i + 1}: caster_bolt ${casterBolt} is outside −6 to +6 range.`);
    }

    results.push({ camberBolt, casterBolt, camberNeg20, camber0, camberPos20, toe });
  }

  if (results.length === 0) {
    throw new Error('CSV contains no data rows.');
  }

  return results;
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Format a number for CSV output: up to 4 decimal places, no trailing zeros. */
function _fmt(v) {
  return parseFloat(v.toFixed(4)).toString();
}
