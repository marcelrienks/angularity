# Tasks: Full E2E Data Integrity Integration Test

**Input**: Design documents from `specs/002-full-e2e-data-integrity/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**User Stories**: US1 (home page, P1), US2 (input data load, P1), US3 (raw table, P1), US4 (chart, P2), US5 (washer, P2)

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Can run in parallel (different files or independent sections)
- **[Story]**: Maps to user story from spec.md (US1–US5)

---

## Phase 1: Setup

**Purpose**: Create the two artefacts needed before any substantive implementation begins.

- [X] T000 [P] Add mandatory file-level comment block to `tests/integration/e2e-data-integrity.mjs` (constitution §Testing requirement 4): include test purpose, scenario outline (home → input → report, sections A–E), success criteria reference (SC-001 through SC-005 and SC-007/SC-008), and expected assertion count — `tests/integration/e2e-data-integrity.mjs`

- [X] T001 [P] Create `scripts/compute-e2e-optima.mjs` with `WHEEL_PARAMS` constant (all four wheels, corners + bulge sign + curvature) and `generateCell(wheel, frontBolt, rearBolt)` bilinear+cross-term formula that outputs `{ neg20, zero, pos20 }` strings to 2 d.p. — `scripts/compute-e2e-optima.mjs`
- [X] T002 [P] Create `tests/integration/e2e-data-integrity.mjs` skeleton: ESM imports (`puppeteer`, `path`, `waitForServer` from `../test-wait-helpers.js`), `WHEELS`, `BOLT_POSITIONS`, `TOLERANCE_RAW = 0`, `TOLERANCE_CHART = 0.05`, pass/fail counters, `main()` scaffold with try/finally browser teardown, `process.exit(failures > 0 ? 1 : 0)` — `tests/integration/e2e-data-integrity.mjs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: FIXTURE constant and shared helper functions. Nothing in Phases 3–7 can be written without these.

**⚠️ CRITICAL**: All user story sections depend on `FIXTURE` and the helpers being complete.

- [X] T003 Extend `scripts/compute-e2e-optima.mjs` to loop all 169 bolt combinations per wheel, call `generateCell()`, collect results into a full `gridData` object, then import and call `processWheel()` from `../../js/report-engine.js` on each wheel's grid to obtain `bestCell`; also compute `cambers[0/6/12]` and `casters[0/6/12]` (front wheels) by averaging rearBolt groups at frontBolt −6/0/+6; print complete JSON per wheel to stdout — `scripts/compute-e2e-optima.mjs`
- [X] T004 Run `node scripts/compute-e2e-optima.mjs` from the repo root and capture the JSON output; record `bestCell` (frontBolt, rearBolt), `washerPositionTexts`, `rotationAngles`, and `expectedChart` (camber/caster first/mid/last + targets) for each of FL, FR, RL, RR — output used in T005
- [X] T005 Embed the `FIXTURE` constant in `tests/integration/e2e-data-integrity.mjs` using the T004 output: four `WheelFixture` objects keyed by wheel name, each containing `gridData` (full 13×13 strings to 2 d.p.), `toe` (null / 0.12 / 0.14), `expectedChart`, and `expectedOptima` (washerPositionTexts + rotationAngles) — `tests/integration/e2e-data-integrity.mjs`
- [X] T006 [P] Implement helper functions in `tests/integration/e2e-data-integrity.mjs`: `setWheelData(page, wheel, gridData)` (writes all 169 cells to localStorage key `mx5-nc1-alignment-${wheel}`), `setToeData(page, wheel, toe)` (writes `mx5-nc1-alignment-toe-${wheel}`), `approxEqual(a, b, tol)`, `assert(condition, label)` (increments pass/fail and prints result) — `tests/integration/e2e-data-integrity.mjs`
- [X] T007 Implement Section A in `main()` in `tests/integration/e2e-data-integrity.mjs`: `puppeteer.launch({ headless: true, args: ['--no-sandbox'] })`, `waitForServer(BASE_URL)`, navigate to `BASE_URL`, `page.evaluate(() => localStorage.clear())`, loop `WHEELS` calling `setWheelData` and (where `toe != null`) `setToeData` for each fixture — `tests/integration/e2e-data-integrity.mjs`

**Checkpoint**: FIXTURE injected, helpers wired, server confirmed reachable. User story sections can now be written.

---

## Phase 3: User Story 1 — Home Page Valid (Priority: P1) 🎯 MVP

**Goal**: Confirm the application loads and is in a ready state before any downstream assertions.

**Independent Test**: Run the test and stop after Section A home page check; it should PASS when the dev server is up.

- [X] T008 [US1] Implement home page validation in `main()` in `tests/integration/e2e-data-integrity.mjs`: after Section A, assert `document.title` contains `'Alignment'` or `'MX-5'`; assert `a[href*="input"]` and `a[href*="report"]` (or equivalent nav links) exist in the DOM; assert page did not navigate to an error page — `tests/integration/e2e-data-integrity.mjs`

**Checkpoint**: US1 independently verifiable — confirms server is up, page loads, navigation is present.

---

## Phase 4: User Story 2 — Input Page DOM Reflects Fixture (Priority: P1)

**Goal**: Confirm the input page grid correctly reads and displays data from localStorage for each wheel.

**Independent Test**: Run through Phase 3 + this phase only; for each wheel the three probe cells must match the fixture.

- [X] T009 [US2] Implement Section B in `main()` in `tests/integration/e2e-data-integrity.mjs`: navigate to `/input.html`, for each wheel in `WHEELS` click `#wheel-selector button[data-wheel="${wheel}"]`, `waitForTimeout(500)`, read three probe cells at `(−6,−6)`, `(0,0)`, `(+6,+6)` via `input.cell-input[data-front="${f}"][data-rear="${r}"][data-key="zero"]`, assert each `.value === FIXTURE[wheel].gridData[f][r].zero` — `tests/integration/e2e-data-integrity.mjs`

**Checkpoint**: US2 independently verifiable — confirms input grid renders localStorage data correctly per wheel.

---

## Phase 5: User Story 3 — Report Raw Data Table Matches Input (Priority: P1)

**Goal**: Confirm every cell in the report's raw data table matches the fixture exactly (zero tolerance).

**Independent Test**: Run Phases 1–4 + this phase; every table cell assertion must pass for all wheels and metrics.

- [X] T010 [US3] Read `js/table-builder.js` and identify the exact DOM selector for rendered table cell values (data attributes such as `[data-front][data-rear]`, class names, or row/col position); note the selector pattern to use in T011 — `js/table-builder.js` (read-only)
- [X] T011 [US3] Implement Section C in `main()` in `tests/integration/e2e-data-integrity.mjs`: navigate to `/report.html`, `waitForSelector('#table-container')`, for each wheel click `#tab-table-${wheel.toLowerCase()}`, `waitForTimeout(800)`, for each applicable metric (`camber` + `caster` front / `camber` + `toe` rear) click `#btn-metric-${metric}`, `waitForTimeout(300)`, read all 169 table cells using the selector confirmed in T010, assert displayed value === expected (camber: `gridData[f][r].zero`; caster: `(1.462 * Math.abs(neg20 - pos20)).toFixed(2)`; toe: `FIXTURE[wheel].toe.toFixed(2)`) — `tests/integration/e2e-data-integrity.mjs`

**Checkpoint**: US3 independently verifiable — all 169 × 2 (front) or 169 × 2 (rear) cells pass for all four wheels.

---

## Phase 6: User Story 4 — Chart Lines Correlate to Input Values (Priority: P2)

**Goal**: Confirm the chart's aggregated line values at boundary and midpoint positions, target lines, and cross-wheel uniqueness.

**Independent Test**: Run Phases 1–5 + this phase; chart debug assertions pass for all wheels.

- [X] T012 [US4] Implement Section D in `main()` in `tests/integration/e2e-data-integrity.mjs`: for each wheel click `#tab-chart-${wheel.toLowerCase()}`, `waitForTimeout(1000)`, parse `JSON.parse(await page.$eval('#main-chart', el => el.dataset.chartDebug))`, assert `debug.wheel === wheel`, `debug.frontBolts.length === 13`, `approxEqual(debug.cambers[0/6/12], FIXTURE[wheel].expectedChart.camber.first/mid/last, 0.05)`, `approxEqual(debug.targetCamber, -1.1, 0.001)`; for front wheels assert `casters[0/6/12]` and `targetCaster`; assert `debug.cambers[0]` is unique across all four wheels — `tests/integration/e2e-data-integrity.mjs`
- [X] T012a [US4] Extend Section D drop-line assertion (FR-012): for each wheel assert `debug.camberCrossing` is a number in range 0–12 and that `debug.frontBolts[debug.camberCrossing] === FIXTURE[wheel].expectedOptima.bestCell.frontBolt`; for front wheels assert the same for `debug.casterCrossing` — `tests/integration/e2e-data-integrity.mjs`

**Checkpoint**: US4 independently verifiable — chart line geometry, targets, and cross-wheel distinctness all confirmed.

---

## Phase 7: User Story 5 — Washer Diagrams Are Correct (Priority: P2)

**Goal**: Confirm the eccentric bolt washer position texts reflect the optimal bolt position from the fixture.

**Independent Test**: Run Phases 1–6 + this phase; all 8 washer position text assertions pass.

- [X] T013 [US5] Implement Section E in `main()` in `tests/integration/e2e-data-integrity.mjs`: `waitForSelector('.washer-bolt-row')`, collect all 8 `.washer-position` text strings via `page.evaluate(() => Array.from(document.querySelectorAll('.washer-position')).map(el => el.textContent.trim()))`, for each wheel at index `i` assert `allPositions[i * 2] === FIXTURE[wheel].expectedOptima.washerPositionTexts.frontBolt` and `allPositions[i * 2 + 1] === FIXTURE[wheel].expectedOptima.washerPositionTexts.rearBolt`; optionally assert SVG `<g>` `transform` attributes match `rotationAngles` — `tests/integration/e2e-data-integrity.mjs`

**Checkpoint**: US5 independently verifiable — all 8 washer indicator texts match expected optimal bolt positions.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T014 [P] Add `"test:e2e-data-integrity": "node tests/integration/e2e-data-integrity.mjs"` to the `scripts` section of `package.json` — `package.json`
- [X] T015 Run `npm run test:e2e-data-integrity` end-to-end with the dev server running; confirm all five sections print PASS and exit code is 0; diagnose and fix any failures (selector mismatches, timeout races, optima value drifts) — `tests/integration/e2e-data-integrity.mjs`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately, T000, T001 and T002 in parallel
- **Foundational (Phase 2)**: T003 → T004 (run script) → T005 (embed output); T006 parallel with T005; T007 after T005+T006 — **BLOCKS all user story phases**
- **US1 (Phase 3)**: After T007
- **US2 (Phase 4)**: After T008 (navigates from home page state)
- **US3 (Phase 5)**: T010 parallel with T009; T011 after both T009 and T010
- **US4 (Phase 6)**: After T011 (already on report page)
- **US5 (Phase 7)**: After T012a (already on report page)
- **Polish (Phase 8)**: T014 can run any time after T002; T015 after T013+T014

### User Story Dependencies

- **US1** → **US2** → **US3** → **US4** → **US5** (sequential, all in one test file)
- US3, US4, US5 all operate on the same open report page (no re-navigation needed between them)

### Parallel Opportunities

```
T000 ─────┐
T001 ─────┤                     (different file from T002)
T002 ─────┤─→ T003 → T004 → T005 ─┐
          |                         ├→ T007 → T008 → T009 → T010─┐→ T011 → T012 → T012a → T013 → T015
          └──────────────── T006 ─┘               (T010 parallel with T009)              ↑
T014 ──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3 only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003–T007)
3. Complete Phase 3: US1 (T008)
4. Add npm script T014
5. **STOP and VALIDATE**: `npm run test:e2e-data-integrity` should reach the home page assertions and pass
6. MVP scope: confirms server + app boots cleanly

### Incremental Delivery

1. Foundation → US1 → Validate → Commit
2. + US2 (input page) → Validate → Commit
3. + US3 (raw table, P1 complete) → Validate → Commit → **P1 MVP complete**
4. + US4 (chart) → Validate → Commit
5. + US5 (washer) → Validate → Commit → **All stories complete**

---

## Notes

- [P] tasks = different files or independent sections, no blocking dependencies
- Table cell selector (T010) is a read-only investigation that MUST precede T011 — do not guess the selector
- `scripts/compute-e2e-optima.mjs` is a one-time development tool; once T004 output is frozen into `FIXTURE` in T005, the script can be kept for documentation but is not part of the test run
- No existing production files (`js/`, `site/`) are modified by any task in this list
- All `waitForTimeout` durations are starting estimates; adjust in T015 if timing failures occur
