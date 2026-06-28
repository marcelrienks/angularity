# Feature Specification: Parametric Scatter & Bolt Sensitivity Charts

**Feature Branch**: `001-scatter-sensitivity-charts`

**Created**: 2026-06-28

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Identify Best Bolt Combination at a Glance (Priority: P1)

A user loads alignment data for one or more wheels and wants to immediately see which bolt
combination gets closest to their camber and caster targets — without cross-referencing a
table of numbers. The scatter plot shows every measured bolt combination as a point plotted
by its *achieved* camber and caster angles. A target crosshair marks the ideal position.
The user can see at a glance which cluster of points is nearest to that crosshair, and hover
over individual points to confirm exact bolt positions and angles.

**Why this priority**: Identifying the best bolt combination is the primary job of the
report page. The current line chart obscures this by using two separate y-axes at different
scales, requiring mental translation. A scatter eliminates that friction.

**Independent Test**: Load FR data, open report, verify scatter renders with target crosshair
and points highlighted near target. Delivers the core value independently of sensitivity charts.

**Acceptance Scenarios**:

1. **Given** FR data is loaded, **When** the report renders, **Then** a scatter plot appears
   showing one dot per measured bolt combination, plotted at (achieved camber°, achieved caster°)
2. **Given** the scatter renders, **When** the user inspects the chart, **Then** a crosshair
   marks the target camber and caster values, and dots closest to that crosshair are visually
   highlighted
3. **Given** the scatter renders, **When** the user hovers over a dot, **Then** a tooltip
   shows the camber bolt position, caster bolt position, exact camber reading, exact caster
   reading, and distance from target
4. **Given** multiple wheel tabs are available, **When** the user switches to a different
   wheel tab, **Then** the scatter updates to show that wheel's data
5. **Given** a rear wheel tab is selected, **When** the scatter renders, **Then** the
   vertical axis is labelled "Toe (°)" and the crosshair uses the toe target value
6. **Given** dots sharing the same camber bolt value, **When** the scatter renders, **Then**
   those dots are connected by a line and share a distinct colour, so the user can see how
   the caster bolt modifies the result for each camber bolt setting

---

### User Story 2 — Understand Which Bolt Controls Which Angle (Priority: P2)

After identifying the best setting, a user wants to understand the *sensitivity* of each
angle to each bolt — specifically: how much does camber change as the camber bolt sweeps
across its range? How much does caster change as the caster bolt sweeps? This is answered
by four small charts arranged in a 2×2 grid (one per wheel), switchable between Camber
mode and Caster mode.

**Why this priority**: Sensitivity charts add diagnostic insight (bolt independence, cross-
coupling) but are secondary to finding the best combination. They require the scatter to
already be understood.

**Independent Test**: Load any wheel data, switch to Bolt Sensitivity section, toggle between
Camber and Caster modes. Value delivered: clear reading of bolt effect direction and magnitude.

**Acceptance Scenarios**:

1. **Given** data is loaded for at least one wheel, **When** the user views the Bolt
   Sensitivity section, **Then** a 2×2 grid of mini-charts appears (one card per wheel)
2. **Given** Camber mode is active (default), **When** a mini-chart renders, **Then** it
   shows achieved camber° on the y-axis vs camber bolt position on the x-axis, with five
   lines (one per caster bolt value), and a horizontal dashed line at the camber target
3. **Given** the user clicks the "Caster" toggle button, **When** the section updates, **Then**
   all four mini-charts switch to show achieved caster° (or toe° for rear wheels) on the
   y-axis vs caster bolt position on the x-axis, with five lines (one per camber bolt value)
4. **Given** a wheel has no data loaded, **When** its mini-chart card renders, **Then** the
   card shows a placeholder state indicating no data is available

---

### User Story 3 — Compare Sensitivity Across All Four Wheels (Priority: P3)

A user who has loaded data for all four wheels wants to compare the bolt sensitivity profiles
side by side — to see whether FL and FR behave similarly, or whether RL/RR show a different
toe-bolt effect. All four mini-charts are visible simultaneously in the 2×2 grid.

**Why this priority**: Multi-wheel comparison is only possible when all wheels have data.
Single-wheel use is already covered by User Story 2.

**Independent Test**: Load all four wheels' data, verify all four mini-charts populate in
Camber and Caster modes. Value: immediately visible cross-wheel comparison.

**Acceptance Scenarios**:

1. **Given** all four wheels have data loaded, **When** the Bolt Sensitivity section renders,
   **Then** all four mini-chart cards are populated with data (no placeholder cards)
2. **Given** all four charts are visible, **When** the user toggles between Camber and
   Caster modes, **Then** all four charts update simultaneously to the selected mode

---

### Edge Cases

- What happens when only one wheel has data? Scatter shows that wheel; three of the four
  sensitivity mini-charts show placeholder state.
- What happens when the target crosshair falls outside the measured data range? Crosshair
  renders at its correct position outside the visible data cluster; no error.
- What happens when all measured points are equidistant from target? All are unhighlighted
  (or all highlighted if within tolerance) — no arbitrary selection.
- What happens when a user switches wheel tabs while hovering over a scatter point? Tooltip
  dismisses and scatter redraws for the new wheel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The current dual-y-axis line chart MUST be replaced by a parametric scatter
  plot as the primary chart in the alignment chart section
- **FR-002**: The scatter plot MUST plot each measured bolt combination as a point at
  coordinates (achieved camber°, achieved caster°)
- **FR-003**: Points sharing the same camber bolt value MUST be connected by a line and
  rendered in a shared distinct colour, producing five coloured groups across the five
  camber bolt positions
- **FR-004**: The scatter plot MUST display a crosshair marker at the configured camber
  and caster target values
- **FR-005**: Points within a defined tolerance of the target MUST receive a visual
  highlight (glow or distinct marker) to identify near-optimal combinations at a glance
- **FR-006**: Hovering over any scatter point MUST show a tooltip containing: camber bolt
  position, caster bolt position, achieved camber reading, achieved caster reading, and
  distance from target
- **FR-007**: The scatter plot MUST respond to wheel tab selection and display only the
  selected wheel's data, consistent with how all other report sections respond to tabs
- **FR-008**: For rear wheels (RL, RR), the caster axis MUST be labelled "Toe (°)" and
  the target crosshair MUST use the toe target value in place of the caster target
- **FR-009**: A new "Bolt Sensitivity" section MUST appear below the scatter plot section
- **FR-010**: The Bolt Sensitivity section MUST contain a 2×2 grid of mini-charts, one
  card per wheel (FL, FR, RL, RR), visible simultaneously
- **FR-011**: The Bolt Sensitivity section MUST include toggle buttons to switch between
  "Camber" mode and "Caster" mode; Camber mode MUST be the default
- **FR-012**: In Camber mode, each mini-chart MUST plot achieved camber° (y-axis) against
  camber bolt position (x-axis), with one series per caster bolt value and a horizontal
  dashed line at the camber target
- **FR-013**: In Caster mode, each mini-chart MUST plot achieved caster° or toe° (y-axis)
  against caster bolt position (x-axis), with one series per camber bolt value and a
  horizontal dashed line at the caster or toe target
- **FR-014**: Switching between Camber and Caster modes MUST update all four mini-charts
  simultaneously
- **FR-015**: A mini-chart card for a wheel with no loaded data MUST show a placeholder
  state, not an empty or broken chart

### Key Entities

- **Bolt Combination**: A measured pairing of (camber bolt position, caster bolt position)
  that yields a specific (camber°, caster°) result; the atomic unit of the scatter plot
- **Camber Bolt Group**: The set of bolt combinations sharing one camber bolt value;
  rendered as a single coloured line in the scatter plot
- **Sensitivity Series**: A set of data points with one bolt position held constant while
  the other sweeps its full range; each series becomes one line in a mini-chart
- **Target Zone**: The point (target camber°, target caster°) that the user wants to
  achieve; visualised as a crosshair in the scatter and as dashed reference lines in
  mini-charts

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can identify the bolt combination closest to their targets by looking
  at the scatter plot alone, without consulting the raw data table
- **SC-002**: A user can determine the primary direction of each bolt's effect (which angle
  it moves and by how much) from the sensitivity charts in under 30 seconds
- **SC-003**: Switching wheel tabs or sensitivity modes completes visually within one second
  on the reference device (no perceptible lag)
- **SC-004**: All values displayed in scatter tooltips and sensitivity charts are numerically
  consistent with the values shown in the raw data table for the same bolt combination
- **SC-005**: The parametric scatter plot and sensitivity charts pass all integration tests
  added as part of this feature, and no existing integration tests regress

## Assumptions

- The measured data for each wheel consists of at most 25 bolt combinations (the required
  5×5 grid); the scatter plot is designed for this scale and may become dense if the full
  13×13 grid is used in future
- The existing `rows169` data structure provides all fields needed (camber bolt position,
  caster bolt position, achieved camber, achieved caster) without schema changes
- Colour assignment to camber bolt groups is cosmetic and may be chosen freely, provided
  five distinct colours are used and they are consistent between the scatter and any
  future references to those groups
- The current wheel tab UI component is reused as-is; no changes to tab behaviour are
  in scope
- The sensitivity mini-charts are read-only — no interaction beyond hover tooltip is
  required for this feature
- Rear wheel toe handling reuses the same detection logic already present in the codebase
  (REAR_WHEELS constant)
- Integration tests must be written for the new chart components; the 149-test baseline
  must not shrink
