/**
 * chart-builder.js — Chart.js v4 chart construction helpers.
 *
 * Exported API:
 *   buildMainChart(canvasId, rows169, wheel)          → Chart instance  (Section 2.2)
 *   destroyChart(instance)                             → void
 */

import { BOLT_POSITIONS, COLOURS, TARGET_CAMBER, TARGET_CASTER, REAR_WHEELS } from './constants.js';
import { _sign } from './format-utils.js';

// Number of rear bolt positions in one "front bolt group"
const GROUP_SIZE = BOLT_POSITIONS.length; // 13

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Build the main 169-point camber + caster chart (Section 2.2).
 *
 * @param {string}  canvasId  DOM canvas element id
 * @param {import('./report-engine.js').DerivedRow[]} rows169
 * @param {string}  wheel     Wheel identifier
 * @param {{ camber?: number, caster?: number|null }} [targets]
 * @returns {Chart}
 */
export function buildMainChart(canvasId, rows169, wheel, targets = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const targetCamber = Object.prototype.hasOwnProperty.call(targets, 'camber') ? targets.camber : TARGET_CAMBER;
  const targetCaster = Object.prototype.hasOwnProperty.call(targets, 'caster') ? targets.caster : TARGET_CASTER;
  const showCaster = targetCaster != null;

  // Aggregate rows by front bolt position, keeping best values for each position
  const aggregated = _aggregateByFrontBolt(rows169);
  const labels  = aggregated.map(r => r.camberBolt);
  const cambers = aggregated.map(r => +r.camber.toFixed(3));
  const casters = showCaster ? aggregated.map(r => +r.caster.toFixed(3)) : [];
  const numPoints = aggregated.length;
  const camberCrossing = _findNearestCrossing(cambers, targetCamber);
  const casterCrossing = showCaster ? _findNearestCrossing(casters, targetCaster) : null;

  const chartDebug = {
    wheel,
    camberBolts: labels,
    cambers,
    casters,
    targetCamber,
    targetCaster,
    camberCrossing,
    casterCrossing,
  };

  canvas.dataset.chartDebug = JSON.stringify(chartDebug);
  if (typeof window !== 'undefined') {
    window.__alignmentChartDebug = chartDebug;
  }

  // Build drop lines plugin (vertical lines at intersections with targets)
  const dropLinesPlugin = _buildDropLinesPlugin(cambers, casters, aggregated, { camber: targetCamber, caster: targetCaster });

  const datasets = [
    {
      label: `Camber (${wheel})`,
      data: cambers,
      borderColor: COLOURS.camber,
      backgroundColor: COLOURS.camber,
      pointBackgroundColor: 'transparent',
      pointBorderColor: 'transparent',
      pointRadius: 0,
      pointBorderWidth: 0,
      borderWidth: 1.5,
      tension: 0.2,
      yAxisID: 'yCamber',
      order: 1,
    },
    {
      label: `Camber target (${targetCamber}°)`,
      data: Array(numPoints).fill(targetCamber),
      borderColor: COLOURS.camber,
      borderWidth: 1.5,
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0,
      yAxisID: 'yCamber',
      order: 3,
    },
  ];

  if (showCaster) {
    datasets.splice(1, 0, {
      label: `Caster (${wheel})`,
      data: casters,
      borderColor: COLOURS.caster,
      backgroundColor: COLOURS.caster,
      pointBackgroundColor: 'transparent',
      pointBorderColor: 'transparent',
      pointRadius: 0,
      pointBorderWidth: 0,
      borderWidth: 1.5,
      tension: 0.2,
      yAxisID: 'yCaster',
      order: 2,
    });

    datasets.push({
      label: `Caster target (${targetCaster}°)`,
      data: Array(numPoints).fill(targetCaster),
      borderColor: COLOURS.caster,
      borderWidth: 1.5,
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0,
      yAxisID: 'yCaster',
      order: 4,
    });
  }

  const chart = new Chart(canvas, {
    type: 'line',
    plugins: [dropLinesPlugin],
    data: {
      labels,
      datasets,
    },
    options: _mainChartOptions(aggregated, showCaster, wheel),
  });

  return chart;
}

/**
 * Update the chart note with current target values.
 * Call this after buildMainChart to ensure the displayed targets match the constants.
 */
export function updateChartNote(targets = {}) {
  const targetCamber = Object.prototype.hasOwnProperty.call(targets, 'camber') ? targets.camber : TARGET_CAMBER;
  const targetCaster = Object.prototype.hasOwnProperty.call(targets, 'caster') ? targets.caster : TARGET_CASTER;
  const targetToe = Object.prototype.hasOwnProperty.call(targets, 'toe') ? targets.toe : null;
  const camberSpan = document.getElementById('chart-note-camber');
  const casterSpan = document.getElementById('chart-note-caster');

  if (camberSpan) {
    camberSpan.textContent = `Camber ${targetCamber}°`;
  }
  if (casterSpan) {
    if (targetCaster == null) {
      casterSpan.textContent = targetToe == null ? 'Toe n/a' : `Toe ${targetToe} mm`;
    } else {
      casterSpan.textContent = `Caster ${targetCaster}°`;
    }
  }
}


/**
 * Safely destroy a Chart.js instance.
 * @param {Chart|null} instance
 */
export function destroyChart(instance) {
  if (instance) {
    try { instance.destroy(); } catch (_) {}
  }
}

// ── Chart options ─────────────────────────────────────────────────────────

function _mainChartOptions(aggregated, showCaster, wheel) {
  const isRearWheel = REAR_WHEELS.includes(wheel);
  const xAxisLabel = isRearWheel ? 'Toe Bolt Position' : 'Camber Bolt Position';

  // Calculate x-axis bounds from actual measured positions (not hardcoded 13)
  const boltPositions = aggregated.map(r => r.camberBolt);
  const xMin = Math.min(...boltPositions);
  const xMax = Math.max(...boltPositions);
  const xPadding = Math.max(1, Math.ceil((xMax - xMin) * 0.1));  // 10% padding

  const scales = {
    x: {
      type: 'linear',
      min: xMin - xPadding,
      max: xMax + xPadding,
      ticks: {
        color: COLOURS.mutedStrong,
        font: { family: "'Share Tech Mono', monospace", size: 9 },
        stepSize: 1,
      },
      grid: { color: COLOURS.border + '33' },
      title: {
        display: true,
        text: xAxisLabel,
        color: COLOURS.muted,
        font: { family: "'Share Tech Mono', monospace", size: 11 },
      },
    },
    yCamber: {
      type: 'linear',
      position: 'left',
      ticks: {
        color: COLOURS.camber,
        font: { family: "'Share Tech Mono', monospace", size: 10 },
      },
      grid: { color: COLOURS.border + '44' },
      title: {
        display: true,
        text: 'Camber (°)',
        color: COLOURS.camber,
        font: { family: "'Share Tech Mono', monospace", size: 11 },
      },
    },
  };

  if (showCaster) {
    scales.yCaster = {
      type: 'linear',
      position: 'right',
      ticks: {
        color: COLOURS.caster,
        font: { family: "'Share Tech Mono', monospace", size: 10 },
      },
      grid: { drawOnChartArea: false },
      title: {
        display: true,
        text: 'Caster (°)',
        color: COLOURS.caster,
        font: { family: "'Share Tech Mono', monospace", size: 11 },
      },
    };
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: COLOURS.muted,
          font: { family: "'Share Tech Mono', monospace", size: 11 },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: COLOURS.panelAlt,
        borderColor: COLOURS.border,
        borderWidth: 1,
        titleColor: COLOURS.subtle,
        bodyColor: COLOURS.muted,
        titleFont: { family: "'Share Tech Mono', monospace", size: 11 },
        bodyFont: { family: "'Share Tech Mono', monospace", size: 10 },
        callbacks: {
          title: ctx => {
            const camberBolt = aggregated[ctx[0].dataIndex].camberBolt;
            return `Camber Bolt: ${_sign(camberBolt)}`;
          },
        },
      },
    },
    scales,
  };
}

// ── Drop lines plugin (vertical lines at target intersections) ────────────

function _buildDropLinesPlugin(cambers, casters, aggregated, targets) {
  return {
    id: 'dropLines',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: { left, right, top, bottom }, scales } = chart;

      // Require x and yCamber; yCaster is optional (null for rear wheels with camber-only)
      if (!scales || !scales.x || !scales.yCamber) {
        return;  // Missing required scales; skip drop-lines
      }

      ctx.save();
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);

      const xScale = scales.x;
      const yCamberScale = scales.yCamber;
      const yCasterScale = scales.yCaster;  // May be null for rear wheels (camber-only)

      // Find closest crossing points
      const camberCrossing = _findNearestCrossing(cambers, targets.camber);
      const casterCrossing = targets.caster == null ? null : _findNearestCrossing(casters, targets.caster);

      // Draw drop line for camber crossing (BLUE)
      if (camberCrossing !== null && camberCrossing !== undefined) {
        // Convert crossing index to actual bolt position
        const xVal = aggregated[Math.floor(camberCrossing)].camberBolt;
        const xPx = xScale.getPixelForValue(xVal);
        
        if (xPx !== undefined && xPx !== null && !isNaN(xPx)) {
          const yPx = yCamberScale.getPixelForValue(targets.camber);
          if (yPx !== undefined && yPx !== null && !isNaN(yPx)) {
            ctx.strokeStyle = COLOURS.camber;
            ctx.beginPath();
            ctx.moveTo(xPx, yPx);
            ctx.lineTo(xPx, bottom);
            ctx.stroke();
          }
        }
      }

      // Draw drop line for caster crossing (GREEN)
      // Only draw if caster target exists and caster scale is available (front wheels only)
      if (targets.caster != null && yCasterScale && casterCrossing !== null && casterCrossing !== undefined) {
        // Convert crossing index to actual bolt position
        const xVal = aggregated[Math.floor(casterCrossing)].camberBolt;
        const xPx = xScale.getPixelForValue(xVal);
        
        if (xPx !== undefined && xPx !== null && !isNaN(xPx)) {
          const yPx = yCasterScale.getPixelForValue(targets.caster);
          if (yPx !== undefined && yPx !== null && !isNaN(yPx)) {
            ctx.strokeStyle = COLOURS.caster;
            ctx.beginPath();
            ctx.moveTo(xPx, yPx);
            ctx.lineTo(xPx, bottom);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    },
  };
}

/**
 * Find the index of the point closest to crossing the target value.
 * Linear interpolation between adjacent points.
 */
function _findNearestCrossing(values, target) {
  let bestIdx = null;
  let bestDist = Infinity;

  for (let i = 0; i < values.length - 1; i++) {
    const v0 = values[i];
    const v1 = values[i + 1];
    
    // Check if target is between v0 and v1 (crossing)
    if ((v0 <= target && target <= v1) || (v1 <= target && target <= v0)) {
      // Linear interpolation: find fractional position
      const t = v0 === v1 ? 0.5 : (target - v0) / (v1 - v0);
      const idx = i + t;
      const dist = Math.abs(v0 - target);
      
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    }
  }

  // If no crossing found, find the closest point
  if (bestIdx === null) {
    for (let i = 0; i < values.length; i++) {
      const dist = Math.abs(values[i] - target);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
  }

  return bestIdx;
}

// ── Group bands plugin (alternating background per front bolt group) ───────

function _buildGroupBandsPlugin(rows169) {
  return {
    id: 'groupBands',
    beforeDraw(chart) {
      const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
      if (!x) return;

      ctx.save();
      for (let g = 0; g < BOLT_POSITIONS.length; g++) {
        if (g % 2 === 0) continue;  // Only odd groups get a band

        const startIdx = g * GROUP_SIZE;
        const endIdx   = startIdx + GROUP_SIZE - 1;

        const startPx = x.getPixelForValue(startIdx) ?? left;
        const endPx   = x.getPixelForValue(endIdx)   ?? right;

        ctx.fillStyle = 'rgba(255,255,255,0.015)';
        ctx.fillRect(startPx, top, endPx - startPx, bottom - top);
      }
      ctx.restore();
    },
  };
}

// ── Utility ────────────────────────────────────────────────────────────────

function _comboLabel(f, r) {
  return `${_sign(f)}/${_sign(r)}`;
}


function _delta(d) {
  return (d >= 0 ? '+' : '') + d.toFixed(2);
}

/**
 * Aggregate rows169 by front bolt position using rear bolt = 0 (nominal).
 * This creates smooth curves without jagging from mixing different rear positions.
 *
 * @param {import('./report-engine.js').DerivedRow[]} rows169
 * @returns {{ camberBolt: number, camber: number, caster: number }[]}
 */
function _aggregateByFrontBolt(rows169) {
  const result = [];
  
  // Create a map for fast lookup: map[camberBolt][casterBolt] = row
  const map = {};
  for (const row of rows169) {
    if (!map[row.camberBolt]) map[row.camberBolt] = {};
    map[row.camberBolt][row.casterBolt] = row;
  }

  // For each front bolt position, get the row where rear bolt = 0
  // This gives us the nominal aligned configuration curve
  const frontPositions = Object.keys(map).map(Number).sort((a, b) => a - b);
  
  for (const camberBolt of frontPositions) {
    const rearZeroRow = map[camberBolt][0];
    
    if (rearZeroRow) {
      result.push({
        camberBolt: rearZeroRow.camberBolt,
        camber: rearZeroRow.camber,
        caster: rearZeroRow.caster,
      });
    } else {
      // Fallback: if rear=0 not available, pick the best available row
      const candidates = Object.values(map[camberBolt]);
      const bestRow = candidates.reduce((best, row) =>
        (row.camberDelta ** 2 + row.casterDelta ** 2) <
        (best.camberDelta ** 2 + best.casterDelta ** 2) ? row : best
      );
      result.push({
        camberBolt: bestRow.camberBolt,
        camber: bestRow.camber,
        caster: bestRow.caster,
      });
    }
  }

  return result;
}
