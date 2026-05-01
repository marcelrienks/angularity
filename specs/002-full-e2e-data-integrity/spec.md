# Feature Specification: Full End-to-End Data Integrity Integration Test

**Feature Branch**: `002-full-e2e-data-integrity`
**Created**: 26 April 2026
**Status**: Draft

## Overview

A single, fully automated Puppeteer integration test that walks the complete application pipeline — home page → input page → report page — and verifies with precision that every value rendered in the report originates without error from the data entered at the input stage. The test also validates visual output: chart line geometry and eccentric bolt washer indicator markings.

The test uses purpose-built sample data per wheel designed to have uniquely identifiable values, gently curved (non-linear) response surfaces, and directionally distinct curves for camber vs caster (front wheels) and camber vs toe (rear wheels). This ensures no accidental value coincidences can mask a rendering error.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Home Page Loads and Is Valid (Priority: P1)

The test opens the home (index) page and confirms the application is in a working, expected initial state before proceeding.

**Why this priority**: If the application fails to load, every subsequent step is invalid. This is the entry gate.

**Independent Test**: Navigating to `http://localhost:8080/` and asserting the page title, key UI elements (target value fields, navigation links) are present constitutes a self-contained smoke test.

**Acceptance Scenarios**:

1. **Given** the dev server is running, **When** the test navigates to the home page, **Then** the page loads with HTTP 200 and the page title contains "MX-5" or "Alignment"
2. **Given** the home page has loaded, **When** the test inspects the page, **Then** the target camber, caster, and toe fields are visible and display their default values
3. **Given** the home page has loaded, **When** the test checks navigation, **Then** links to the input page and report page are present and navigable

---

### User Story 2 — Input Page: Load Sample Data Per Wheel (Priority: P1)

The test iterates through all four wheel tabs (FL, FR, RL, RR) on the input page. For each wheel it writes the fixture data directly to localStorage (the equivalent of clicking Clear then Load Sample Data — see research.md Decision 1 for rationale), then confirms the input grid DOM reflects the expected unique values for that wheel.

> **Implementation note**: The test injects data via `page.evaluate(() => localStorage.setItem(...))` rather than clicking the UI buttons. This avoids coupling the test to the dummy data generator's output. The Clear and Load Sample Data buttons' existence is verified as a smoke assertion.

**Why this priority**: This step both prepares the known state for all downstream assertions and validates that the input grid correctly reads and renders localStorage data per wheel without cross-contamination.

**Independent Test**: This can be tested without the report page. Write fixture data for each wheel, read back the grid cell values from the DOM, compare against the known expected values table for each wheel.

**Acceptance Scenarios**:

1. **Given** the test is on the input page with FL tab active, **When** Clear is clicked followed by Load Sample Data, **Then** the grid is populated and each measured cell value matches the FL expected data table
2. **Given** FL data has been loaded, **When** the FR tab is selected, **Then** the FR grid is empty (isolated from FL) until Load Sample Data is clicked for FR
3. **Given** all four wheels have had sample data loaded, **When** the test re-selects any wheel tab, **Then** the grid for that wheel still shows its original loaded values (no cross-contamination between wheels)
4. **Given** a wheel tab is active with pre-existing data, **When** Clear is clicked, **Then** all grid cells are empty before the next load

---

### User Story 3 — Report Page: Raw Data Table Matches Input Exactly (Priority: P1)

The test navigates to the report page, iterates through all four wheel tabs, and for each wheel uses the Camber and Caster (or Camber and Toe for rear wheels) section buttons to view the raw data table. Every displayed value must match exactly what was loaded in User Story 2.

**Why this priority**: This is the core data integrity assertion. Any transformation, rounding error, or cross-wheel data leak between input and report would be caught here.

**Independent Test**: Comparing the raw data table DOM values against the known expected data table per wheel, for both metric sections (Camber/Caster front, Camber/Toe rear).

**Acceptance Scenarios**:

1. **Given** sample data was loaded for all wheels, **When** the report page loads and FL tab is selected with Camber section active, **Then** every cell in the raw data table matches the FL camber values from the input stage to the display precision (±0.001°)
2. **Given** FL camber is validated, **When** the Caster section button is activated for FL, **Then** every cell in the caster raw data table matches the FL caster values from the input stage
3. **Given** FL is fully validated, **When** FR tab is selected and both Camber and Caster sections are validated, **Then** FR values are distinct from FL values and each matches the FR expected data table exactly
4. **Given** front wheels are validated, **When** RL tab is selected, **Then** the section buttons show Camber and Toe (not Caster), and values match the RL expected data table
5. **Given** RL is validated, **When** RR tab is selected, **Then** RR values are distinct from RL and match the RR expected data table
6. **Given** any cell in the raw data table, **When** its displayed value is compared against the known input value, **Then** the difference is zero (exact match at display precision)

---

### User Story 4 — Report Page: Chart Lines Correlate to Input Values (Priority: P2)

For each wheel tab on the report page, the test validates the chart rendering: line start points, midpoints, and end points must correspond to the known input values; target value horizontal lines appear at the correct positions; drop lines descend at the correct data points.

**Why this priority**: The chart is a visual summary. Incorrect rendering does not affect the numerical table but misleads users about the best bolt position. This is a secondary confidence check.

**Independent Test**: For each wheel and each metric (Camber, Caster/Toe), read chart data points from the rendered chart (via DOM data attributes or chart.js dataset inspection), compare against the known expected values at the boundary and midpoint positions.

**Acceptance Scenarios**:

1. **Given** FL chart is rendered with the Camber metric active, **When** the test reads the first, middle, and last data points of the camber line, **Then** they match the FL camber values at the minimum, median, and maximum bolt positions respectively (within ±0.01°)
2. **Given** FL Camber chart is active, **When** the test reads the target camber horizontal line position, **Then** it sits at the configured target camber value (default −1.1°)
3. **Given** FL Camber chart is active, **When** the test identifies the "best" bolt position cell, **Then** a drop line descends from that data point to the x-axis at the correct bolt position
4. **Given** FL Caster chart is active, **When** first, middle, and last data points are read, **Then** they match FL caster values at boundary and median bolt positions
5. **Given** RL/RR chart is active, **When** the Toe section is selected, **Then** chart data points match the rear wheel toe values from the input stage
6. **Given** all four wheels are validated, **When** results are compared across wheels, **Then** no two wheels share identical chart data points at any given position (uniqueness of sample data is confirmed)

---

### User Story 5 — Report Page: Eccentric Bolt Washer Diagrams Are Correct (Priority: P2)

The test validates the rendered eccentric bolt washer SVG (or canvas) diagram for each wheel. The indicator marking on the washer must be positioned at the angle corresponding to the recommended optimal bolt position derived from the loaded sample data.

**Why this priority**: The washer diagram is the final actionable output. An incorrect indicator position would cause the user to adjust their car to the wrong bolt setting.

**Independent Test**: For each wheel, retrieve the recommended bolt position from the raw data table (or known expected optimal), then assert the washer diagram's indicator rotation/angle matches the expected bolt position for both front and rear bolt washers.

**Acceptance Scenarios**:

1. **Given** FL sample data is loaded and the report is rendered, **When** the FL bolt washer diagram is inspected, **Then** the front bolt washer indicator is rotated to the angle corresponding to the FL optimal front bolt position
2. **Given** the FL front bolt washer is validated, **When** the rear bolt washer indicator is inspected, **Then** it is rotated to the angle corresponding to the FL optimal rear bolt position
3. **Given** FL washer is validated, **When** FR washer is inspected, **Then** the FR washer indicator positions differ from FL (different sample data → different optimum)
4. **Given** RL washer is inspected, **When** compared against FL washer, **Then** indicator positions differ significantly (significant difference between front and rear sample data → significantly different optima)
5. **Given** any washer diagram, **When** the indicator angle is read, **Then** it maps to one of the 13 discrete bolt positions (−6 to +6) and not an intermediate value

---

### Edge Cases

- What happens when the tab is changed before the chart has finished rendering? (Test must wait for render completion before reading chart values.)
- What happens if localStorage from a previous test run contains stale data? (Test must explicitly clear localStorage or call Clear before each wheel's load.)
- What happens if two wheels' sample data contain identical values at the same cell position? (Sample data design must guarantee uniqueness to avoid false-positive passes.)
- What if the chart uses a canvas element rather than DOM data attributes? (Validation strategy must account for reading chart.js dataset arrays via page evaluation rather than DOM inspection.)
- What happens if the washer indicator uses CSS transform rotation vs SVG transform? (Assertion must target the correct attribute or computed style.)

---

## Sample Data Specification *(mandatory)*

The test requires four unique datasets, one per wheel. Each dataset defines a sparse set of measured grid positions (front bolt × rear bolt) with camber, caster/toe values that produce a gently curved response surface.

### Curve Shape Requirements

**Front wheels (FL, FR) — Camber**:
- High values at front-left of the grid (front bolt −6, rear bolt −6)
- Low values at front-right of the grid (front bolt +6, rear bolt +6)
- Gentle arc: the midpoint camber value is NOT the arithmetic midpoint of the extremes; it bends toward one corner
- FL: midpoint bends toward the upper-right corner (peak above the diagonal)
- FR: midpoint bends toward the lower-left corner (trough below the diagonal)

**Front wheels (FL, FR) — Caster**:
- High values at front-right of the grid (front bolt −6, rear bolt +6)
- Low values at front-left of the grid (front bolt +6, rear bolt −6)
- Mirror direction to camber: starts top-right, slopes to bottom-left
- FL: midpoint bends toward the lower-right corner
- FR: midpoint bends toward the upper-left corner

**Rear wheels (RL, RR) — Camber**:
- Same directional pattern as front camber (top-left to bottom-right slope)
- RL: midpoint bends toward the upper-right corner
- RR: midpoint bends toward the lower-left corner

**Rear wheels (RL, RR) — Toe**:
- Same directional pattern as front caster (top-right to bottom-left slope)
- RL: midpoint bends toward the lower-right corner
- RR: midpoint bends toward the upper-left corner

### Value Range Requirements

| Wheel | Camber Range | Caster Range | Toe Range | Notes |
|-------|-------------|--------------|-----------|-------|
| FL    | −0.7° to −1.5° | 4.6° to 5.4° | — | Front-left |
| FR    | −0.6° to −1.4° | 4.7° to 5.3° | — | Subtle diff from FL |
| RL    | −1.4° to −2.2° | — | 0.08 mm to 0.16 mm | Significant diff from front |
| RR    | −1.3° to −2.1° | — | 0.09 mm to 0.17 mm | Subtle diff from RL |

- Front vs rear camber ranges differ by ≥ 0.6° (significant, detectable)
- FL vs FR camber ranges overlap but shift by ~0.1° (subtle, distinguishable)
- RL vs RR ranges shift by ~0.1° (subtle, distinguishable)
- All values must produce unique cell readings: no two adjacent measured cells should share the same value

### Minimum Measurement Density

Each wheel dataset must include at least 9 measured bolt position combinations (a 3×3 sparse grid or equivalent), so bilinear interpolation produces a smooth, non-trivial surface. The 9 positions should be distributed across the grid — not clustered at one corner — to create a meaningful curve across the full bolt range.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test MUST open the home page and assert it is in a valid, ready state before proceeding
- **FR-002**: The test MUST navigate to the input page and select each of the four wheel tabs (FL, FR, RL, RR) in turn
- **FR-003**: For each wheel, the test MUST ensure no stale data contaminates the test. Implementation approach: direct localStorage write (equivalent to Clear + Load Sample Data) established in research.md Decision 1; the Clear button existence is verified as a smoke assertion
- **FR-004**: For each wheel, the test MUST write the fixture data to localStorage and assert grid cells in the DOM contain the expected values from the wheel's defined sample dataset
- **FR-005**: The sample dataset for each wheel MUST be defined as a fixed, deterministic lookup table in the test fixture so assertions are exact, not approximate
- **FR-006**: The four wheel datasets MUST satisfy the curve shape and value range requirements defined in the Sample Data Specification section
- **FR-007**: The test MUST navigate to the report page after all four wheels have had sample data loaded
- **FR-008**: On the report page, the test MUST iterate through all four wheel tabs and for each wheel validate the raw data table for all applicable metric sections (Camber + Caster for front; Camber + Toe for rear)
- **FR-009**: Each raw data table cell value displayed on the report page MUST exactly match the corresponding cell in the wheel's sample dataset (zero tolerance for transformation errors at display precision)
- **FR-010**: The test MUST validate chart data for each wheel: the first data point, the median bolt position data point, and the last data point of each metric line MUST match the expected sample values within ±0.05° (the chart aggregates 13 rearBolt values per frontBolt position; this tolerance accounts for that aggregation spread while still catching genuine pipeline errors)
- **FR-011**: The test MUST validate that the target value horizontal line on each chart is positioned at the configured target value for that metric
- **FR-012**: The test MUST validate that drop lines on the chart appear at the bolt position corresponding to the recommended optimal cell for that wheel
- **FR-013**: The test MUST validate the eccentric bolt washer diagram for each wheel by reading the indicator angle/position and asserting it corresponds to the recommended optimal bolt position
- **FR-014**: The test MUST be structured as a loop (or parameterized) over wheels, not as four independent copy-pasted blocks
- **FR-015**: The test MUST use `await page.waitFor*` guards before reading any value that depends on asynchronous rendering (chart draw, tab switch, page navigation)
- **FR-016**: The test MUST clean up localStorage at the start of the test run (or rely on Clear per-wheel) to guarantee isolation from prior runs
- **FR-017**: The test MUST be added to the existing Jest + Puppeteer test suite and executable via a named npm script

### Key Entities

- **Wheel Dataset**: Fixed lookup table of (frontBolt, rearBolt, neg20, zero, pos20, toe) tuples per wheel. Single source of truth for all assertions in the test.
- **Grid Cell**: One (frontBolt, rearBolt) combination with measured camber sweep values and optionally toe. Identified in the DOM by data attributes or input cell position.
- **Optimal Cell**: The (frontBolt, rearBolt) combination identified by the report engine as bestCell for a given wheel. Drives both the raw table highlight and the washer diagram indicator.
- **Chart Data Point**: A (boltPosition, alignmentValue) pair rendered on the chart for a given wheel and metric. Readable via chart.js dataset inspection through Puppeteer's `page.evaluate`.
- **Washer Indicator**: The visual marker on the rendered eccentric bolt washer SVG/canvas that shows the recommended bolt rotation angle. Angle maps one-to-one to a bolt position (−6 to +6).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Test runs to completion without manual intervention on a fresh server start (zero human steps after `npm run test:<script>`)
- **SC-002**: All four wheels' raw data table values on the report page match the loaded sample data with zero discrepancies at display precision
- **SC-003**: Chart line boundary points (first, median, last) for all four wheels and all applicable metrics match expected values within ±0.01°
- **SC-004**: Target value lines on all charts appear at the correct value positions
- **SC-005**: All four bolt washer diagram indicators point to the correct optimal bolt position for their respective wheel
- **SC-006**: Any introduced data transformation error (a single incorrect value passing through the pipeline) causes at least one assertion to fail, confirming the test has sufficient coverage to detect real regressions
- **SC-007**: The test completes within 3 minutes on standard developer hardware
- **SC-008**: The test produces clear, actionable failure messages that identify which wheel, which metric, and which cell/data point failed

---

## Assumptions

- Puppeteer v20+ is already installed and the test infrastructure (Jest runner, dev server singleton, test helpers) matches the existing integration test patterns in `tests/integration/`
- The "Load Sample Data" button on the input page triggers `dummy-data-generator.js`, which will need to be updated (or supplemented) to produce the uniquely curved, per-wheel datasets described in the Sample Data Specification; the test fixture stores the expected output values as a static lookup
- The report page chart is implemented with chart.js and its dataset arrays are accessible via `page.evaluate(() => Chart.instances[...].data.datasets[...].data)` or equivalent
- The washer diagram indicator exposes its bolt position as a `data-position` attribute, a CSS transform rotation, or an SVG transform attribute that can be read programmatically
- Front wheels (FL, FR) use Camber and Caster sections; rear wheels (RL, RR) use Camber and Toe sections
- The "Camber" and "Caster"/"Toe" section buttons on the report page already exist as clickable UI controls that switch the raw data table and chart between metrics
- Display precision for camber and caster values is two decimal places (e.g., −1.10°); toe display precision is two decimal places in mm
- The test does not need to cover the symmetry analysis panel (FL vs FR comparison) — that is out of scope for this feature
- Mobile/responsive layout testing is out of scope; the test runs in a standard desktop viewport
