/**
 * csv-io.js — Client-side CSV generation and parsing.
 *
 * Generates:  generateCSV(rows, wheel) → triggers file download
 * Parses:     parseCSV(text) → array of measurement objects
 */

const HEADER = 'front_bolt,rear_bolt,camber_360acw,camber_0,camber_360cw,toe';
const LEGACY_HEADER = 'front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20';
const LEGACY_HEADER_WITH_TOE = 'front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20,toe';
const ALT_HEADER = 'front_bolt,rear_bolt,camber_360acw,camber_0,camber_360cw';

/**
 * Build a CSV string from an array of measurement rows (no side effects).
 *
 * @param {Array<{frontBolt:number, rearBolt:number, camberNeg20:number, camber0:number, camberPos20:number, toe?:number|null}>} rows
 * @returns {string}
 */
export function buildCSVString(rows) {
  const sorted = [...rows].sort((a, b) =>
    a.frontBolt !== b.frontBolt ? a.frontBolt - b.frontBolt : a.rearBolt - b.rearBolt
  );
  const lines = [HEADER];
  for (const r of sorted) {
    lines.push(
      [
        r.frontBolt,
        r.rearBolt,
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
 *
 * @param {string} text  Raw CSV text
 * @returns {Array<{frontBolt:number, rearBolt:number, camberNeg20:number, camber0:number, camberPos20:number, toe:number|null}>}
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

  const hasToeColumn = header === expectedHeader || header === expectedLegacyHeaderWithToe;

  if (!hasToeColumn && header !== expectedLegacyHeader && header !== expectedAltHeader) {
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

    const [frontBoltRaw, rearBoltRaw, camberNeg20Raw, camber0Raw, camberPos20Raw, toeRaw = ''] = cols;
    const frontBolt = Number(frontBoltRaw);
    const rearBolt = Number(rearBoltRaw);
    const camberNeg20 = Number(camberNeg20Raw);
    const camber0 = Number(camber0Raw);
    const camberPos20 = Number(camberPos20Raw);
    const toe = toeRaw.trim() === '' ? null : Number(toeRaw);

    if ([frontBolt, rearBolt, camberNeg20, camber0, camberPos20].some(Number.isNaN)) {
      throw new Error(`Row ${i + 1}: non-numeric value.\nRow: "${lines[i]}"`);
    }
    if (toeRaw.trim() !== '' && Number.isNaN(toe)) {
      throw new Error(`Row ${i + 1}: toe must be numeric when provided.\nRow: "${lines[i]}"`);
    }

    if (frontBolt < -6 || frontBolt > 6) {
      throw new Error(`Row ${i + 1}: front_bolt ${frontBolt} is outside −6 to +6 range.`);
    }
    if (rearBolt < -6 || rearBolt > 6) {
      throw new Error(`Row ${i + 1}: rear_bolt ${rearBolt} is outside −6 to +6 range.`);
    }

    results.push({ frontBolt, rearBolt, camberNeg20, camber0, camberPos20, toe });
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
