/**
 * chart-builder.js — Chart.js v4 chart construction helpers.
 *
 * Exported API:
 *   buildScatterChart(canvasId, rows169, wheel, targets) → Chart instance
 *   updateChartNote(targets)                              → void
 *   destroyChart(instance)                                → void
 */

import { BOLT_POSITIONS, COLOURS, TARGET_CAMBER, TARGET_CASTER, REAR_WHEELS } from './constants.js';
import { _sign } from './format-utils.js';

// Number of rear bolt positions in one "front bolt group"
const GROUP_SIZE = BOLT_POSITIONS.length; // 13

// Diverging cool→warm colour palette for scatter chart grouping (13 entries, centre = neutral)
const _SCATTER_COLOURS = [
  '#7c3aed', '#6366f1', '#818cf8', '#22d3ee', '#67e8f9', '#a3e635', '#fde68a',
  '#fb923c', '#f87171', '#e879f9', '#d946ef', '#a855f7', '#8b5cf6',
];

function _getGroupColour(index, total) {
  if (total === 1) return _SCATTER_COLOURS[6]; // middle colour
  const colorIndex = Math.round((index / (total - 1)) * 12);
  return _SCATTER_COLOURS[Math.max(0, Math.min(12, colorIndex))];
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Build a parametric scatter plot: each measured bolt combination as a 2D point.
 * @param {string} canvasId DOM canvas element id
 * @param {import('./report-engine.js').DerivedRow[]} rows169
 * @param {string} wheel Wheel identifier
 * @param {{ camber?: number, caster?: number|null, toe?: number|null }} [targets]
 * @returns {Chart|null}
 */
export function buildScatterChart(canvasId, rows169, wheel, targets = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const isRearWheel = REAR_WHEELS.includes(wheel);
  const targetCamber = Object.prototype.hasOwnProperty.call(targets, 'camber') ? targets.camber : TARGET_CAMBER;
  const targetCasterOrToe = isRearWheel
    ? (Object.prototype.hasOwnProperty.call(targets, 'toe') ? targets.toe : null)
    : (Object.prototype.hasOwnProperty.call(targets, 'caster') ? targets.caster : TARGET_CASTER);

  // Filter to measured rows only
  const pts = rows169.filter(r => !r.isInterpolated);

  // Group by camberBolt, sort keys ascending
  const groups = {};
  pts.forEach(row => {
    const key = row.camberBolt;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  const camberBoltKeys = Object.keys(groups)
    .map(k => parseInt(k, 10))
    .sort((a, b) => a - b);

  // Helper to extract Y metric based on rear/front wheel
  const getYMetric = (row) => isRearWheel ? row.toe : row.caster;

  // Helper to get glow distance from target
  const getDistFromTarget = (row) => {
    const yMetric = getYMetric(row);
    const tx = targetCamber;
    const ty = targetCasterOrToe;
    return Math.hypot(row.camber - tx, yMetric - ty);
  };

  // Build datasets — one per camber bolt group
  const datasets = camberBoltKeys.map((cb, index) => {
    const group = groups[cb];
    const groupColor = _getGroupColour(index, camberBoltKeys.length);
    const casterOrToeLabel = isRearWheel ? 'Toe Bolt' : 'Caster Bolt';

    // Build point arrays with metadata, marking target-matched points
    const pointData = group.map(row => {
      const dist = getDistFromTarget(row);
      return {
        x: row.camber,
        y: getYMetric(row),
        camberBolt: row.camberBolt,
        casterBolt: row.casterBolt,
        isTargetMatch: dist <= 0.5,
      };
    });

    // Per-point styling
    const pointBgColors = [];
    const pointRadii = [];
    const pointBorders = [];
    pointData.forEach(pt => {
      pointBgColors.push(pt.isTargetMatch ? '#ffffff' : groupColor);
      pointRadii.push(5);
      pointBorders.push(pt.isTargetMatch ? '#ffffff' : groupColor);
    });

    return {
      label: `CmB ${_sign(cb)}`,
      data: pointData,
      borderColor: groupColor,
      backgroundColor: groupColor,
      borderWidth: 1.5,
      pointRadius: pointRadii,
      pointBackgroundColor: pointBgColors,
      pointBorderColor: pointBorders,
      pointBorderWidth: 0.5,
      pointHoverRadius: 9,
      showLine: true,
      borderDash: [3, 3],
      type: 'scatter',
      tension: 0,
    };
  });

  // Halo plugin — draws thin circles around target-matched points
  const haloPlugin = {
    id: 'targetHalo',
    afterDatasetsDraw(chart) {
      const { ctx, data, scales } = chart;
      const xScale = scales.x;
      const yScale = scales.y;

      data.datasets.forEach(dataset => {
        if (!dataset.data) return;
        dataset.data.forEach(pt => {
          if (!pt.isTargetMatch) return;
          const xPx = xScale.getPixelForValue(pt.x);
          const yPx = yScale.getPixelForValue(pt.y);
          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(xPx, yPx, 8, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();
        });
      });
    },
  };

  // Crosshair plugin
  const crosshairPlugin = {
    id: 'scatterCrosshair',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea } = chart;
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const tx = xScale.getPixelForValue(targetCamber);
      const ty = yScale.getPixelForValue(targetCasterOrToe);

      ctx.save();
      ctx.strokeStyle = '#a0a0a0';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(tx, chartArea.top);
      ctx.lineTo(tx, chartArea.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(chartArea.left, ty);
      ctx.lineTo(chartArea.right, ty);
      ctx.stroke();

      // Small circle at intersection
      ctx.fillStyle = '#a0a0a0';
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore();
    },
  };

  const yAxisLabel = isRearWheel ? 'Toe (°)' : 'Caster (°)';

  const config = {
    type: 'scatter',
    plugins: [haloPlugin, crosshairPlugin],
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: 'nearest',
        intersect: false,
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Camber (°)' },
          ticks: {
            color: COLOURS.mutedStrong,
            font: { family: "'Share Tech Mono', monospace", size: 9 },
          },
          grid: { color: COLOURS.border + '33' },
        },
        y: {
          type: 'linear',
          title: { display: true, text: yAxisLabel },
          ticks: {
            color: COLOURS.mutedStrong,
            font: { family: "'Share Tech Mono', monospace", size: 9 },
          },
          grid: { color: COLOURS.border + '33' },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label(context) {
              const pt = context.raw;
              const dist = getDistFromTarget(pts.find(r => r.camber === pt.x && getYMetric(r) === pt.y));
              const camberVal = pt.x.toFixed(2);
              const yVal = pt.y.toFixed(2);
              const casterOrToeLabel = isRearWheel ? 'Toe' : 'Caster';
              return `CmB ${_sign(pt.camberBolt)} / CsB ${_sign(pt.casterBolt)} · ${camberVal}° / ${yVal}° · Δ ${dist.toFixed(2)}°`;
            },
          },
        },
      },
    },
  };

  const chart = new Chart(canvas, config);
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


/**
 * Find the index of the point closest to crossing the target value.
 * Linear interpolation between adjacent points.
 */

// ── Group bands plugin (alternating background per front bolt group) ───────


// ── Utility ────────────────────────────────────────────────────────────────



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
