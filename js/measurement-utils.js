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
    const steeringMethod = isRatioMode
      ? `360° ACW, 0°, and 360° CW steering wheel positions`
      : `three measurement wheel positions`;
    subtitle.textContent = `Front wheels: camber at ${steeringMethod}. Rear wheels: camber at 0° and toe distance (mm)`;
  }

  const inputCardDesc = document.getElementById('input-card-desc');
  if (inputCardDesc) {
    const method = isRatioMode
      ? 'at 360° anti-clockwise steering wheel, 0°, and 360° clockwise steering wheel'
      : 'at three measurement wheel positions';
    inputCardDesc.textContent = `Front: enter camber readings ${method} for each bolt combination. Rear: enter camber at 0° and toe distance (mm). Covers the full ${gridText} with a minimum of 9 required positions. Download or load CSV files per wheel.`;
  }

  const reportCardDesc = document.getElementById('report-card-desc');
  if (reportCardDesc) {
    reportCardDesc.textContent = `Load CSV files for Front Left, Front Right, Rear Left, and Rear Right. View the interpolated ${gridText} summary table, multi-line chart, washer position diagrams, symmetry analysis, and toe alignment status — then read off the recommended bolt settings.`;
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
