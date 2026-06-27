# Feature Specification: Generic 4-Wheel Suspension Geometry Tool

**Feature Branch**: `003-generic-suspension-model`

**Created**: 2026-06-26

**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Remove Vehicle-Specific Branding (Priority: P1)

A user opens the tool on any vehicle and sees no references to "Mazda MX5 NC1" or any other specific make/model. All labels, storage keys, and UI text are generic. Existing saved data migrates or is treated as fresh (no corrupt-state errors).

**Why this priority**: Branding a generic tool to one car model is confusing and misleading. This is a prerequisite for all other stories because it affects storage key naming.

**Independent Test**: Load the app in a browser. Search page source and localStorage for "mazda", "mx5", "nc1" (case-insensitive). Zero matches = pass.

**Acceptance Scenarios**:

1. **Given** the app loads, **When** user inspects localStorage keys, **Then** no key contains "mx5", "nc1", or "mazda"
2. **Given** any page is open, **When** user reads all visible text and page title, **Then** no vehicle make/model name appears
3. **Given** old localStorage data exists with "mx5nc1" prefix keys, **When** app loads, **Then** app does not crash (graceful empty-state, not a migration requirement)

---

### User Story 2 — Rear Suspension Grid Captures Camber AND Toe (Priority: P2)

A technician measuring rear suspension takes two readings per bolt combination: camber at straight-ahead (degrees) AND toe at straight-ahead (mm string-box delta — gap from string-box reference line to front rim edge minus gap to rear rim edge). They enter both values into the rear input grid cell. The system converts the mm delta to toe degrees for scoring and report display. When they export to CSV and load the report, both camber and computed toe are used in scoring and displayed.

**Why this priority**: Rear toe is adjustable via eccentric bolt (unlike front toe which uses a threaded rod), so it belongs in the measurement grid. Without this, rear optimisation is incomplete.

**Independent Test**: Open input page → select RL or RR tab → enter camber and toe for the 3×3 minimum measurement set → export CSV → load report → confirm rear toe appears in report scoring and summary.

**Acceptance Scenarios**:

1. **Given** rear wheel tab is active, **When** user views a grid cell, **Then** two input fields appear: one for camber (degrees) and one for toe (mm string-box delta, labelled clearly in mm)
2. **Given** rear toe values are entered, **When** CSV is exported, **Then** toe values appear as a distinct column alongside camber
3. **Given** a rear CSV with toe values is loaded in the report, **When** report renders, **Then** rear toe delta from target is computed and displayed per bolt combination
4. **Given** rear toe and camber targets are set, **When** best cell is selected, **Then** scoring uses both camber AND toe deltas (not camber alone)

---

### User Story 3 — Front Toe Shown as String Box mm Delta in Report (Priority: P2)

A technician has set front caster and camber using the eccentric bolts (guided by the report). Now they need to set front toe using the tie rod. The report shows them: "To achieve target toe of Y° per wheel, set string box gap delta to X mm per side." They measure the gap from a reference string to the front and rear edges of the rim; the difference should equal X mm.

**Why this priority**: Front toe cannot be captured in the grid (threaded rod, not eccentric bolt), but technicians still need quantitative guidance to set it correctly.

**Independent Test**: Set front toe target on index page (e.g. 0.07°) and rim diameter (e.g. 330 mm). Load any front wheel report. Confirm report shows the toe target in degrees AND the corresponding mm delta calculated as `rim_diameter × tan(toe_angle_radians)`.

**Acceptance Scenarios**:

1. **Given** front toe target is set in degrees and rim diameter is configured, **When** front wheel report renders, **Then** report displays: target toe in degrees AND mm delta for string box setup
2. **Given** rim diameter = 330 mm and target toe = 0.07° per wheel, **When** report computes mm delta, **Then** result ≈ 0.40 mm (330 × tan(0.07° × π/180))
3. **Given** front input grid is displayed, **When** user reads the grid instructions, **Then** UI clearly states front toe is NOT an input here (set via tie rod after geometry is fixed)
4. **Given** wheel diameter and rim diameter are both present as configuration fields, **When** user views index page, **Then** both fields are labelled distinctly (wheel diameter = overall incl. tyre; rim diameter = metal rim only, used for string box)

---

### User Story 4 — All 5 Alignment Targets on Index Page (Priority: P3)

A technician opens the Targets tab on the index page and sees five fields: front camber, front caster, front toe, rear camber, rear toe — all in degrees. They fill in their target values, save, and the report uses those values for all scoring.

**Why this priority**: The report cannot score rear toe until a rear toe target exists; same for front toe mm delta. Both require explicit target values.

**Independent Test**: Open index page Targets tab. Confirm 5 labelled fields exist. Set all 5. Save. Open report. Confirm all 5 targets appear in report scoring logic.

**Acceptance Scenarios**:

1. **Given** Targets tab is open, **When** user views it, **Then** exactly 5 target fields are present: front camber, front caster, front toe, rear camber, rear toe
2. **Given** all 5 targets are saved, **When** localStorage is inspected, **Then** all 5 values are persisted under distinct generic keys
3. **Given** saved targets, **When** page is reloaded, **Then** all 5 values are restored without loss

---

### Edge Cases

- What happens when a rear CSV in old format (camber only, no toe column) is loaded? Report must degrade gracefully: score on camber only, display note that toe data is absent.
- What happens when rim diameter is not set? Front toe mm delta must show a clear "rim diameter required" placeholder rather than NaN or 0.
- What happens when front toe target is zero? Report should display "0.00 mm — no string box correction needed."
- What if a user enters toe as a negative value (toe-out)? System must accept and correctly compute the signed mm delta.

## Clarifications

### Session 2026-06-27

- Q: Rear toe input unit — what does the technician enter into the rear grid cell? → A: mm string-box delta (front rim edge gap minus rear rim edge gap relative to string-box reference line); system back-calculates toe degrees using `arctan(delta_mm / rimDiameter) × 180/π` for scoring and display
- Q: Number of adjustment positions per bolt — fixed 13 or configurable? → A: Already configurable via existing index page dropdown; user selects from 3 positions (−1 to +1) up to 13 positions (−6 to +6); grid dynamically generates N×N cells based on selection; BOTH input grid and report grid already scale with this count — spec 003 must preserve this behaviour for all 4 wheels including rear
- Q: Front measurement angle type — wheel angle, steering angle, or config toggle? → A: Already configurable on index page; user selects wheel degree angles (direct) OR steering wheel degree angles (converted to wheel degrees via steering ratio config); all modes and steering ratio config must be preserved

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All occurrences of "Mazda", "MX5", "NC1", "mx5nc1", "mx5-nc1" MUST be removed from source code, HTML, CSS, localStorage keys, comments, and UI text
- **FR-002**: localStorage prefix MUST change from `mx5nc1_align_v2_` to `align_v2_` (or equivalent generic prefix)
- **FR-003**: localStorage key pattern for grid data MUST change from `mx5-nc1-alignment-{wheel}` to `alignment-{wheel}` (or equivalent generic pattern)
- **FR-004**: Rear input grid cells MUST accept two values: camber (degrees) and toe (mm string-box delta: gap at front rim edge minus gap at rear rim edge, relative to string-box reference line)
- **FR-005**: Rear CSV export format MUST include a toe column per grid cell (stored in mm, matching input units)
- **FR-006**: Rear CSV import MUST parse the toe column (mm) and store it in localStorage per bolt combination
- **FR-007**: Old rear CSVs (camber-only format) MUST be accepted without error; missing toe data treated as absent (not zero)
- **FR-008**: Report scoring for rear wheels MUST convert stored toe mm delta to degrees (`arctan(toe_mm / rim_diameter_mm) × 180/π`) and include that toe-degrees delta from target when toe data is present
- **FR-009**: Best cell selection for rear wheels MUST consider both camber AND toe deltas
- **FR-010**: Index page Targets tab MUST present all 5 target fields: front camber, front caster, front toe, rear camber, rear toe — all in degrees per wheel
- **FR-011**: All 5 target values MUST be persisted to localStorage under distinct generic keys
- **FR-012**: Front wheel report MUST display a "string box setup" section showing target toe in degrees AND the corresponding mm delta
- **FR-013**: mm delta formula: `delta_mm = rim_diameter_mm × tan(target_toe_angle_radians)`
- **FR-014**: Index page configuration MUST include a separate "rim diameter (mm)" field distinct from "wheel diameter (mm)" (wheel diameter = full wheel + tyre, rim diameter = metal rim only)
- **FR-015**: When rim diameter is not set, front toe mm delta display MUST show a descriptive placeholder, not NaN or blank
- **FR-016**: Front input grid UI MUST include a label or tooltip clarifying that front toe is not entered here (adjusted via tie rod separately)
- **FR-017**: Rear report MUST display toe for each cell as both the raw input mm delta AND the computed toe degrees (derived from mm + rim diameter); toe delta from target (in degrees) styled same as camber (heatmap colouring, best-cell highlight)
- **FR-018**: Existing configurable measurement position count (index page dropdown: 3 to 13 positions, i.e. −1/0/+1 through −6/0/+6) MUST be preserved; rear toe input grid MUST scale with the selected position count exactly as camber/caster grids do for front wheels; report grid for all wheels MUST likewise scale with position count
- **FR-019**: Existing measurement angle mode config (index page toggle: wheel degrees direct OR steering wheel degrees converted via steering ratio) MUST be preserved; input grid column/row labels MUST reflect the configured angle mode and values; steering ratio config field MUST remain on index page

### Key Entities

- **Wheel Grid Cell (Rear)**: Represents one bolt-combination measurement for a rear wheel; attributes: front-bolt position (−N to +N where N is configured position count), rear-bolt position (same range), camber (degrees), toe_mm (string-box mm delta: front rim edge gap minus rear rim edge gap relative to string-box line; positive = toe-in)
- **Measurement Position Count**: Existing user-configurable setting (index page dropdown); valid values 3, 5, 7, 9, 11, 13 (symmetric range −1/+1 through −6/+6); determines grid dimensions for all 4 wheels (both input and report grids)
- **Angle Mode**: Existing user-configurable setting (index page toggle); two modes: (1) wheel degrees — user enters physical wheel angle directly; (2) steering wheel degrees — user enters steering column angle, system converts to wheel degrees using steering ratio; grid column/row labels update to reflect selected mode
- **Steering Ratio**: Existing configuration value; divisor applied to steering wheel angle to derive wheel angle; stored in localStorage; used only when angle mode = steering wheel degrees
- **Alignment Targets**: Five scalar values stored per session: front camber, front caster, front toe, rear camber, rear toe (all degrees per wheel)
- **Rim Diameter**: Configuration value (mm) representing the metal rim's outer diameter, used for both front toe mm display and rear toe mm-to-degrees conversion
- **String Box Delta (Front)**: Derived display value (mm per wheel); computed from rim diameter and front toe target angle; not stored, recalculated on report render; formula: `rim_diameter × tan(toe_radians)`
- **String Box Delta (Rear)**: Raw input value (mm per wheel) entered by technician per bolt combination; stored in localStorage; converted to toe degrees for scoring/display via `arctan(delta_mm / rim_diameter_mm) × 180/π`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero references to any specific vehicle make or model remain anywhere in the codebase, UI, or stored data keys after implementation
- **SC-002**: A technician can enter camber AND toe measurements for both rear wheels in a single input session without extra steps compared to camber-only entry
- **SC-003**: Report correctly calculates front toe string box mm delta within 0.01 mm of the formula `rim_diameter × tan(toe_radians)` for any valid input
- **SC-004**: All 149 existing integration tests continue to pass (regression floor must not shrink)
- **SC-005**: Report loads and renders without errors when given a rear CSV with toe data present AND when given an old rear CSV without toe data
- **SC-006**: All 5 alignment target values survive a page reload (persist correctly to and from storage)

## Assumptions

- Rim diameter and wheel diameter are both entered in millimetres
- "Rim diameter" means the outer diameter of the metal wheel rim (not the tyre contact patch width, not the overall wheel+tyre diameter)
- Front toe target is per-wheel (not total axle toe); mm delta in report is also per-wheel
- Rear toe is measured at straight-ahead only (0° steering), consistent with how rear camber is currently measured
- Rear toe is entered as a raw mm string-box delta (not degrees); toe degrees are derived from this value and rim diameter during report calculation — technician never enters rear toe in degrees directly
- Negative toe mm delta values represent toe-out (rear rim edge closer to string box than front rim edge)
- No data migration is required for existing localStorage data from the MX5 NC1-prefixed keys; users start fresh or use CSV import
- The existing `toeDegreesToResultantMm` function in `math-utils.js` uses wheel diameter; the new string-box calculation uses rim diameter — these are intentionally separate
- Rear input grid axis labels (which axis = camber bolt, which = toe bolt) match front wheel convention; if the physical hardware differs, labels should be updated to "Camber Bolt" and "Toe Bolt" explicitly
