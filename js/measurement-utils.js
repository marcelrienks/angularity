/**
 * Shared utilities for updating UI text based on measurement mode and density.
 */

function getGridSizeForDensity(density) {
  const d = parseInt(density);
  return { size: d, count: d * d };
}

export function updateMeasurementMethodText(casterInputMode, density = 13) {
  const isRatioMode = casterInputMode === 'steering-ratio';
  const { size, count } = getGridSizeForDensity(density);
  const gridText = `${size}×${size} grid (${count} combinations)`;

  const subtitle = document.getElementById('input-subtitle');
  if (subtitle) {
    subtitle.textContent = isRatioMode
      ? `Enter camber at 360° ACW, 0°, and 360° CW steering wheel positions`
      : `Enter camber at three measurement wheel positions`;
  }

  const inputCardDesc = document.getElementById('input-card-desc');
  if (inputCardDesc) {
    const method = isRatioMode
      ? 'at 360° anti-clockwise steering wheel, 0°, and 360° clockwise steering wheel'
      : 'at three measurement wheel positions';
    inputCardDesc.textContent = `Enter camber readings ${method} for each bolt combination. Covers the full ${gridText} with a minimum of 9 required positions. Download or load CSV files per wheel.`;
  }

  const reportCardDesc = document.getElementById('report-card-desc');
  if (reportCardDesc) {
    reportCardDesc.textContent = `Load CSV files for Front Left and Front Right. View the interpolated ${gridText} summary table, multi-line chart, washer position diagrams, and symmetry analysis — then read off the recommended bolt settings.`;
  }
}

export function getCurrentMeasurementMode() {
  const stored = localStorage.getItem('alignment_constant_caster_input_mode');
  return stored === 'wheel-degrees' ? 'wheel-degrees' : 'steering-ratio';
}

export function getCurrentDensity() {
  const stored = localStorage.getItem('alignment_constant_measurement_density');
  return stored ? parseInt(stored) : 13;
}
