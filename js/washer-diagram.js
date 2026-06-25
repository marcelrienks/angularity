/**
 * washer-diagram.js — Procedural SVG washer diagrams (Section 2.3).
 *
 * Exported API:
 *   renderWasherSection(containerId, recommendations)
 *
 * recommendations shape:
 *   {
 *     FL?: { camberBolt, casterBolt },
 *     FR?: { camberBolt, casterBolt },
 *     RL?: { camberBolt, casterBolt },
 *     RR?: { camberBolt, casterBolt }
 *   }
 *
 * Each eccentric bolt is drawn as a circular washer with:
 *   - Outer ring
 *   - 13 tick marks at 0 (bottom / 6 o'clock) and ±1…±6
 *   - Lobe (offset circle) rotated to the indicated position
 *   - Position label
 *   - Centre hole
 *
 * Physical reference (from MX5 NC1 Home Alignment.md):
 *   - 0 = 6 o'clock (bottom)
 *   - +6 = 3 o'clock (right)
 *   - −6 = 9 o'clock (left)
 *   - Tick marks span the bottom semicircle (9 o'clock → 3 o'clock)
 */

import { BOLT_POSITIONS, COLOURS, getRequiredPositions, getCurrentMeasurementDensity } from './constants.js';
import { _sign } from './format-utils.js';

const BOLT_MIN = -6;
const BOLT_MAX =  6;

/**
 * Render washer diagrams into containerId with grid layout.
 *
 * Layout structure:
 * ┌─────────────────────────────────────────────────────┐
 * │            FRONT WHEELS (active)                    │
 * ├──────────────────┬──────────────────┤
 * │ Front Left (FL)  │  Front Right (FR) │
 * ├─ Front Bolt     ├─ Front Bolt     │
 * │ (Camber)        │ (Camber)        │
 * ├─ Rear Bolt      ├─ Rear Bolt      │
 * │ (Caster)        │ (Caster)        │
 * ├─────────────────────────────────────────────────────┤
 * │              REAR WHEELS (active)                   │
 * ├──────────────────┬──────────────────┤
 * │  Rear Left (RL)  │   Rear Right (RR) │
 * ├─ Front Bolt     ├─ Front Bolt     │
 * ├─ Rear Bolt      ├─ Rear Bolt      │
 * └─────────────────────────────────────────────────────┘
 *
 * @param {string} containerId
 * @param {{ FL?: { camberBolt:number, casterBolt:number }, FR?: { camberBolt:number, casterBolt:number }, RL?: { camberBolt:number, casterBolt:number }, RR?: { camberBolt:number, casterBolt:number } }} recommendations
 */
export function renderWasherSection(containerId, recommendations) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  // ── FRONT WHEELS SECTION ─────────────────────────────────────────────────
  const frontSection = document.createElement('div');
  frontSection.className = 'washer-grid-section';
  
  const frontTitle = document.createElement('div');
  frontSection.appendChild(frontTitle);

  const frontGrid = document.createElement('div');
  frontGrid.className = 'washer-grid';

  // Front Left wheel
  const flGroup = document.createElement('div');
  flGroup.className = 'washer-wheel-column';
  const flWheelTitle = document.createElement('div');
  flWheelTitle.className = 'washer-wheel-label sub-header';
  flWheelTitle.textContent = 'Front Left (FL)';
  flGroup.appendChild(flWheelTitle);
  
  if (recommendations.FL) {
    flGroup.appendChild(_makeBoltRow('Camber Bolt', 'Camber', recommendations.FL.camberBolt, COLOURS.blue));
    flGroup.appendChild(_makeBoltRow('Caster Bolt', 'Caster', recommendations.FL.casterBolt, COLOURS.green));
  }
  frontGrid.appendChild(flGroup);

  // Front Right wheel
  const frGroup = document.createElement('div');
  frGroup.className = 'washer-wheel-column';
  const frWheelTitle = document.createElement('div');
  frWheelTitle.className = 'washer-wheel-label sub-header';
  frWheelTitle.textContent = 'Front Right (FR)';
  frGroup.appendChild(frWheelTitle);
  
  if (recommendations.FR) {
    frGroup.appendChild(_makeBoltRow('Camber Bolt', 'Camber', recommendations.FR.camberBolt, COLOURS.blue));
    frGroup.appendChild(_makeBoltRow('Caster Bolt', 'Caster', recommendations.FR.casterBolt, COLOURS.green));
  }
  frontGrid.appendChild(frGroup);

  frontSection.appendChild(frontGrid);
  container.appendChild(frontSection);

  // ── REAR WHEELS SECTION ───────────────────────────────────────────────────
  const rearSection = document.createElement('div');
  const hasRearRecommendations = Boolean(recommendations.RL || recommendations.RR);
  rearSection.className = hasRearRecommendations
    ? 'washer-grid-section'
    : 'washer-grid-section washer-grid-section-placeholder';
  
  const rearTitle = document.createElement('div');
  rearSection.appendChild(rearTitle);

  const rearGrid = document.createElement('div');
  rearGrid.className = 'washer-grid';

  // Rear Left wheel
  const rlGroup = document.createElement('div');
  rlGroup.className = 'washer-wheel-column';
  const rlWheelTitle = document.createElement('div');
  rlWheelTitle.className = 'washer-wheel-label sub-header';
  rlWheelTitle.textContent = 'Rear Left (RL)';
  rlGroup.appendChild(rlWheelTitle);
  if (recommendations.RL) {
    rlGroup.appendChild(_makeBoltRow('Camber Bolt', 'Camber', recommendations.RL.camberBolt, COLOURS.purple));
    rlGroup.appendChild(_makeBoltRow('Caster Bolt', 'Camber Support', recommendations.RL.casterBolt, COLOURS.purple));
  } else {
    rlGroup.appendChild(_makeBlankBoltRow('Camber Bolt'));
    rlGroup.appendChild(_makeBlankBoltRow('Caster Bolt'));
  }
  rearGrid.appendChild(rlGroup);

  // Rear Right wheel
  const rrGroup = document.createElement('div');
  rrGroup.className = 'washer-wheel-column';
  const rrWheelTitle = document.createElement('div');
  rrWheelTitle.className = 'washer-wheel-label sub-header';
  rrWheelTitle.textContent = 'Rear Right (RR)';
  rrGroup.appendChild(rrWheelTitle);
  if (recommendations.RR) {
    rrGroup.appendChild(_makeBoltRow('Camber Bolt', 'Camber', recommendations.RR.camberBolt, COLOURS.purple));
    rrGroup.appendChild(_makeBoltRow('Caster Bolt', 'Camber Support', recommendations.RR.casterBolt, COLOURS.purple));
  } else {
    rrGroup.appendChild(_makeBlankBoltRow('Camber Bolt'));
    rrGroup.appendChild(_makeBlankBoltRow('Caster Bolt'));
  }
  rearGrid.appendChild(rrGroup);

  rearSection.appendChild(rearGrid);
  container.appendChild(rearSection);
}

// ── Bolt row (with label, effect, and SVG) ─────────────────────────────────

/**
 * Create a bolt row with active washer diagram.
 * Shows label, what it affects (Camber/Caster), and the washer SVG.
 */
function _makeBoltRow(boltLabel, effectLabel, position, colour) {
  const row = document.createElement('div');
  row.className = 'washer-bolt-row';

  // Bolt label (e.g., "Front Bolt")
  const labelArea = document.createElement('div');
  labelArea.className = 'washer-bolt-header';
  
  const boltLbl = document.createElement('div');
  boltLbl.className = 'washer-bolt-name';
  boltLbl.textContent = boltLabel;
  labelArea.appendChild(boltLbl);
  
  const effectLbl = document.createElement('div');
  effectLbl.className = 'washer-bolt-effect';
  effectLbl.textContent = `(${effectLabel})`;
  labelArea.appendChild(effectLbl);
  
  row.appendChild(labelArea);

  // SVG washer diagram
  const svg = _buildWasherSVG(position, colour);
  row.appendChild(svg);

  // Position text
  const pos = document.createElement('div');
  pos.className = 'washer-position';
  pos.textContent = `Position: ${_sign(position)}`;
  row.appendChild(pos);

  return row;
}

/**
 * Create a blank bolt row placeholder when no recommendation is available.
 */
function _makeBlankBoltRow(boltLabel) {
  const row = document.createElement('div');
  row.className = 'washer-bolt-row washer-bolt-row-placeholder';

  // Bolt label
  const labelArea = document.createElement('div');
  labelArea.className = 'washer-bolt-header';
  
  const boltLbl = document.createElement('div');
  boltLbl.className = 'washer-bolt-name';
  boltLbl.textContent = boltLabel;
  labelArea.appendChild(boltLbl);
  
  row.appendChild(labelArea);

  // Placeholder SVG (blank washer outline)
  const svg = _buildBlankWasherSVG();
  row.appendChild(svg);

  // Placeholder text
  const pos = document.createElement('div');
  pos.className = 'washer-position washer-position-placeholder';
  pos.textContent = '(No recommendation yet)';
  row.appendChild(pos);

  return row;
}

// ── SVG washer construction ────────────────────────────────────────────────

const SVG_SIZE = 320;  // increased 100%: 160 * 2 = 320
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const R_OUTER  = 136;  // outer ring radius (washer edge), increased 100%: 68 * 2 = 136
const R_BOLT_HOLE = 42; // bolt hole radius, increased 100%: 21 * 2 = 42
const TICK_OUTER = R_OUTER;
const TICK_INNER = R_OUTER - 20;  // adjusted scale: 10 * 2 = 20
const LABEL_RADIUS = R_OUTER - 36; // adjusted scale: 18 * 2 = 36

/**
 * Build washer SVG with position scale (-6 to +6).
 *
 * Coordinate system:
 *   SVG standard: X right, Y down, angles clockwise from right (0° = right)
 *   Washer layout: 180° arc from 9 o'clock (180°) through 6 o'clock (90°) to 3 o'clock (0°)
 *   13 position markers spanning 180°: 180° / 12 steps = 15° per step
 *
 * Marker angles (before rotation):
 *   Position -6: 180° (9 o'clock, left)
 *   Position 0: 90° (6 o'clock, bottom)
 *   Position +6: 0° (3 o'clock, right)
 *   Step size: 15° = 180° / 12
 *
 * Rotation: washer rotates by (position × 15°) so the marker aligns with 6 o'clock
 *   Position 0: no rotation (marker already at 90°)
 *   Position +6: +90° rotation (marker moves from 0° to 90°)
 *   Position -6: -90° rotation (marker moves from 180° to 90°)
 */
function _buildWasherSVG(position, colour) {
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('viewBox', `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
  svgEl.setAttribute('class', 'washer-svg');
  svgEl.setAttribute('aria-label', `Eccentric bolt position ${_sign(position)}`);

  // Get theme-aware colors from CSS variables
  const rootStyles = getComputedStyle(document.documentElement);
  const panelAltColor = rootStyles.getPropertyValue('--panel-alt').trim();
  const panelDeepColor = rootStyles.getPropertyValue('--panel-deep').trim();
  const borderColor = rootStyles.getPropertyValue('--border').trim();
  const mutedColor = rootStyles.getPropertyValue('--muted').trim();
  const mutedStrongColor = rootStyles.getPropertyValue('--muted-strong').trim();

  // ── Background disc (washer outer ring) ──────────────────────────────────
  svgEl.appendChild(_circle(CX, CY, R_OUTER, panelDeepColor, borderColor, 2.4));  // scaled: 1.2 * 2 = 2.4

  // ── Create rotation group ────────────────────────────────────────────────
  // All washer components (markers, labels, bolt hole) rotate together.
  // Rotation aligns the marker for this position with 6 o'clock (90° angle).
  // Each position step calculated dynamically based on measurement density
  const selectedPositions = getRequiredPositions();
  const numPositions = selectedPositions.length;
  const anglePerPosition = numPositions > 1 ? 180 / (numPositions - 1) : 180;
  const rotationDegrees = position * anglePerPosition;

  const rotationGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  rotationGroup.setAttribute('transform', `rotate(${rotationDegrees} ${CX} ${CY})`);

  // ── Position marking scale (dynamic based on measurement density) ─────────
  // Markers span bottom semicircle (180° arc): 9 o'clock to 3 o'clock via 6 o'clock
  // Marker for position i is at angle: 180 - (i + 6) × anglePerPosition degrees

  // Get measurement density range (e.g., 6 for 13-point, 2 for 5-point)
  const currentDensity = getCurrentMeasurementDensity();
  const densityRange = Math.floor((currentDensity - 1) / 2);

  // Render tick marks for all positions within the current density range
  for (let i = -densityRange; i <= densityRange; i++) {
    // Calculate marker angle for this bolt position
    const markerAngleDeg = 180 - (i + densityRange) * anglePerPosition;
    const markerAngleRad = (markerAngleDeg * Math.PI) / 180;

    // Determine tick hierarchy based on position
    // 0 and ±densityRange (endpoints) → longest/thickest
    // Even positions → medium
    // Odd positions → shortest/thinnest
    const isEndpoint = i === 0 || i === -densityRange || i === densityRange;
    const isEven = i % 2 === 0 && i !== 0;
    const isOdd = i % 2 !== 0;

    let tickLength, tickStrokeWidth, tickColor, fontSize, fontWeight;

    if (isEndpoint) {
      tickLength = 24;
      tickStrokeWidth = 4.2;
      tickColor = mutedColor;
      fontSize = '20';
      fontWeight = '700';
    } else if (isEven) {
      tickLength = 15;
      tickStrokeWidth = 2.8;
      tickColor = mutedColor;
      fontSize = '16';
      fontWeight = '700';
    } else if (isOdd) {
      tickLength = 8;
      tickStrokeWidth = 1.6;
      tickColor = mutedStrongColor;
      fontSize = '13';
      fontWeight = '600';
    }

    // Tick mark: from outer edge inward
    const x1 = CX + TICK_OUTER * Math.cos(markerAngleRad);
    const y1 = CY + TICK_OUTER * Math.sin(markerAngleRad);
    const x2 = CX + (TICK_OUTER - tickLength) * Math.cos(markerAngleRad);
    const y2 = CY + (TICK_OUTER - tickLength) * Math.sin(markerAngleRad);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.setAttribute('stroke', tickColor);
    line.setAttribute('stroke-width', tickStrokeWidth);
    line.setAttribute('stroke-linecap', 'round');
    rotationGroup.appendChild(line);

    // Show labels only for outermost positions (±densityRange) and 0
    const showLabel = isEndpoint || i === 0;
    if (showLabel) {
      // Position label inside washer, above its respective tick mark
      // Labels positioned at different depths based on tick length hierarchy
      // Offset from center accounts for text extent (~10px for endpoints, ~8px for evens, ~6px for odds)
      const labelRadius = isEndpoint ? TICK_OUTER - 44 : isEven ? TICK_OUTER - 36 : TICK_OUTER - 28;
      const lx = CX + labelRadius * Math.cos(markerAngleRad);
      const ly = CY + labelRadius * Math.sin(markerAngleRad);

      // No vertical offset — rely on radial positioning for alignment
      const yOffset = 0;

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', lx.toFixed(2));
      text.setAttribute('y', (ly + yOffset).toFixed(2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', fontSize);
      text.setAttribute('font-weight', fontWeight);
      text.setAttribute('font-family', "'Share Tech Mono', monospace");
      text.setAttribute('fill', isEndpoint ? mutedColor : mutedStrongColor);
      // Rotate text to align with radial direction, then rotate 90° counter-clockwise
      const textRotation = markerAngleDeg - 90;
      text.setAttribute('transform', `rotate(${textRotation} ${lx.toFixed(2)} ${(ly + yOffset).toFixed(2)})`);
      text.textContent = _sign(i);
      rotationGroup.appendChild(text);
    }
  }

  // ── Bolt hole (eccentric marker indicator) ───────────────────────────────
  // Positioned at the top of the washer (12 o'clock = 270° angle).
  // Rotates with the washer, creating the visual illusion of eccentric motion.
  // The bolt hole "orbits" around the washer center as it rotates.
  // Moved down halfway between the edge and the center of the circle.
  const boltAngleRad = (270 * Math.PI) / 180;  // 12 o'clock position
  const boltDistanceFromCenter = R_OUTER / 2;  // halfway between edge and center (34)
  const boltHoleCX = CX + boltDistanceFromCenter * Math.cos(boltAngleRad);
  const boltHoleCY = CY + boltDistanceFromCenter * Math.sin(boltAngleRad);
  
  // Create empty dotted circle for bolt hole
  const boltHoleCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  boltHoleCircle.setAttribute('cx', boltHoleCX.toFixed(2));
  boltHoleCircle.setAttribute('cy', boltHoleCY.toFixed(2));
  boltHoleCircle.setAttribute('r', R_BOLT_HOLE.toFixed(2));
  boltHoleCircle.setAttribute('fill', 'none');
  boltHoleCircle.setAttribute('stroke', colour);
  boltHoleCircle.setAttribute('stroke-width', '3.0');  // scaled: 1.5 * 2 = 3.0
  boltHoleCircle.setAttribute('stroke-dasharray', '4 4');  // scaled: 2 2 * 2 = 4 4
  rotationGroup.appendChild(boltHoleCircle);

  // Add the rotation group to the SVG
  svgEl.appendChild(rotationGroup);

  // ── Fixed chassis indicator line at 6 o'clock (OUTSIDE rotation group) ───
  // This reference mark stays fixed, showing where the position marker should align.
  // Indicates the physical mount point on the vehicle's chassis.
  const chassisLineX = CX;
  const chassisLineY1 = CY + R_OUTER;  // At the edge of the washer
  const chassisLineY2 = CY + R_OUTER + 20;  // Short extension beyond washer
  
  const chassisLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  chassisLine.setAttribute('x1', chassisLineX.toFixed(2));
  chassisLine.setAttribute('y1', chassisLineY1.toFixed(2));
  chassisLine.setAttribute('x2', chassisLineX.toFixed(2));
  chassisLine.setAttribute('y2', chassisLineY2.toFixed(2));
  chassisLine.setAttribute('stroke', '#EF5350');  // Red
  chassisLine.setAttribute('stroke-width', '4.4');
  chassisLine.setAttribute('stroke-linecap', 'round');
  svgEl.appendChild(chassisLine);

  return svgEl;
}

/**
 * Build a blank washer SVG for Phase 2 placeholder sections.
 * Shows only the outer ring and center, with dashed outline and disabled styling.
 */
function _buildBlankWasherSVG() {
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('viewBox', `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
  svgEl.setAttribute('class', 'washer-svg-placeholder');
  svgEl.setAttribute('aria-label', 'Blank washer placeholder (Phase 2)');

  // Get theme-aware colors from CSS variables
  const rootStyles = getComputedStyle(document.documentElement);
  const mutedColor = rootStyles.getPropertyValue('--muted').trim();

  // ── Outer ring (dashed, muted) ──────────────────────────────────────────
  const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  outerCircle.setAttribute('cx', CX.toFixed(2));
  outerCircle.setAttribute('cy', CY.toFixed(2));
  outerCircle.setAttribute('r', R_OUTER.toFixed(2));
  outerCircle.setAttribute('fill', 'none');
  outerCircle.setAttribute('stroke', mutedColor);
  outerCircle.setAttribute('stroke-width', '2.4');  // scaled: 1.2 * 2 = 2.4
  outerCircle.setAttribute('stroke-dasharray', '8 8');  // scaled: 4 4 * 2 = 8 8
  svgEl.appendChild(outerCircle);

  // ── Center hole outline (dashed, muted) ────────────────────────────────
  const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  centerCircle.setAttribute('cx', CX.toFixed(2));
  centerCircle.setAttribute('cy', CY.toFixed(2));
  centerCircle.setAttribute('r', '16');  // scaled: 8 * 2 = 16
  centerCircle.setAttribute('fill', 'none');
  centerCircle.setAttribute('stroke', mutedColor);
  centerCircle.setAttribute('stroke-width', '2.4');  // scaled: 1.2 * 2 = 2.4
  centerCircle.setAttribute('stroke-dasharray', '4 4');  // keep proportional
  svgEl.appendChild(centerCircle);

  // ── "Coming Soon" text overlay ──────────────────────────────────────────
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', CX.toFixed(2));
  text.setAttribute('y', CY.toFixed(2));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute('font-size', '20');  // scaled: 10 * 2 = 20
  text.setAttribute('font-weight', '400');
  text.setAttribute('font-style', 'italic');
  text.setAttribute('fill', mutedColor);
  text.textContent = 'Coming Soon';
  svgEl.appendChild(text);

  return svgEl;
}

// ── SVG helpers ────────────────────────────────────────────────────────────

function _circle(cx, cy, r, fill, stroke, strokeW) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  el.setAttribute('cx', cx.toFixed(2));
  el.setAttribute('cy', cy.toFixed(2));
  el.setAttribute('r',  r.toFixed(2));
  el.setAttribute('fill', fill);
  el.setAttribute('stroke', stroke);
  el.setAttribute('stroke-width', strokeW);
  return el;
}

