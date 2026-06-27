# Tasks: Generic 4-Wheel Suspension Geometry Tool

**Input**: Design documents from `specs/003-generic-suspension-model/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Tests**: Integration tests included in Polish phase (Constitution Principle III requires integration test coverage for all new flows).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared state dependencies)
- **[Story]**: User story label (US1–US4)

---

## Phase 1: Foundational — Storage Key Rename

**Purpose**: Rename all MX5/NC1 storage keys and update test helpers. MUST complete before any other phase — all integration tests use these keys.

**⚠️ CRITICAL**: Integration tests cannot pass for any other story until keys are renamed here.

- [x] T001 [P] Rename `LS_PREFIX` from `'mx5nc1_align_v2_'` to `'align_v2_'` in `js/constants.js:246`
- [x] T002 [P] Rename storage key functions in `js/localstorage-io.js`: `_getStorageKey` returns `'alignment-${wheel}'` (was `'mx5-nc1-alignment-${wheel}'`); `_getToeStorageKey` returns `'alignment-toe-${wheel}'` (was `'mx5-nc1-alignment-toe-${wheel}'`); update storage event filter `startsWith('alignment-')` (was `'mx5-nc1'`) at lines 28, 32, 339; update schema comments at lines 10, 12
- [x] T003 Update all integration test files in `tests/integration/*.mjs` — replace every inline `'mx5-nc1-alignment-${wheel}'` localStorage key with `'alignment-${wheel}'` and `startsWith('mx5-nc1')` filter with `startsWith('alignment-')`

**Checkpoint**: Run `npm test` — all 149 existing tests must pass before proceeding.

---

## Phase 2: User Story 1 — Remove Vehicle-Specific Branding (Priority: P1) 🎯 MVP

**Goal**: Zero references to any specific vehicle make or model anywhere in source, UI, or storage.

**Independent Test**: `grep -ri "mx5\|nc1\|mazda" js/ site/ package.json` returns zero matches.

- [x] T004 [P] [US1] Remove vehicle-specific comment on `js/constants.js:2` ("MX5-NC1 Alignment V2 site") — replace with generic description
- [x] T005 [P] [US1] Update `package.json`: change `name` from `"mx5-nc1-alignment-tests"` to `"alignment-tests"`; update `description` at line 4; remove `"mx5"` and `"nc1"` keywords at lines 46, 48
- [x] T006 [P] [US1] Audit `site/index.html`, `site/input.html`, `site/report.html` for any visible vehicle-specific text (page titles, headings, placeholder text) — update to generic wording
- [x] T007 [US1] Verify zero vehicle references remain: run `grep -ri "mx5\|nc1\|mazda" js/ site/ package.json` and confirm empty output (depends on T004–T006)

**Checkpoint**: T007 passes — US1 is complete and independently verifiable.

---

## Phase 3: User Story 2 — Rear Grid Captures Camber AND Toe (Priority: P2)

**Goal**: Rear wheel grid cells accept two values per bolt combination (camber + toe). CSV export includes toe column. Old CSVs load without error.

**Independent Test**: Open `input.html` → RL tab → cell (0,0) shows two inputs. Export CSV → 6 columns in header. Import 5-column old CSV → no error.

### Implementation for User Story 2

- [x] T008 [US2] Extend `_initializeGridState()` in `js/input-grid.js`: for rear wheels (RL, RR) initialize each cell as `{ neg20: '', zero: '', pos20: '', toe: '' }` instead of `{ neg20: '', zero: '', pos20: '' }` (data-model.md: GridCellData rear shape)
- [x] T009 [US2] Update rear wheel cell rendering in `js/input-grid.js` and `site/input.html`: add a second input field per cell labelled "Toe (mm)" alongside the existing camber field; remove the camber-mirror hack at lines 342–345 (keep neg20/pos20 synced to zero programmatically for camber, but toe is now independent)
- [x] T010 [P] [US2] Update CSV export in `js/csv-io.js` for rear wheels: append `,toe` to header and `,$\{cell.toe\}` to each data row when exporting RL/RR; `cell.toe` is in mm (string-box delta) — exported as-is, no unit conversion; new format: 6 columns per contracts/csv-format.md
- [x] T011 [P] [US2] Update CSV import parser in `js/csv-io.js` for rear wheels: detect column count in header — 5 columns = old format (set `toe: null`), 6 columns = new format (parse toe from column 6 as mm string-box delta); no error thrown for old format; note: existing 6-column CSVs from pre-003 code have empty toe field (never populated) — empty string treated as absent (same as null), not zero (contracts/csv-format.md: backward compatibility rule)
- [x] T012 [US2] Update localStorage save/load in `js/localstorage-io.js` for rear wheels: ensure `toe` field is included when serialising/deserialising rear GridState; existing front wheel code path unchanged (depends on T008)
- [x] T030 [P] [US2] Add `stringBoxMmToToeDegrees(deltaMm, rimDiameterMm)` to `js/math-utils.js`: formula `Math.atan(deltaMm / rimDiameterMm) * 180 / Math.PI`; validate inputs (non-finite or non-positive diameter → throw descriptive Error); inverse of `stringBoxToeToMm`; used by report engine to convert raw rear toe mm input to degrees for scoring (spec FR-008); can run parallel with T008–T012 (different file)
- [ ] T013 [US2] Update `report-engine.js` `processWheel()`: for rear wheel calls, accept `targetToeRear` and `rimDiameter` options; read `cell.toe` (mm string-box delta) from each DerivedRow; convert to degrees: `const toe_deg = stringBoxMmToToeDegrees(cell.toe, rimDiameter)`; compute `toeDelta = toe_deg - targetToeRear`; pass toeDelta to `_computeGoldenRuleScore()`; also expose `toe_mm` and `toe_deg` on DerivedRow for report UI dual display (data-model.md: DerivedRow; plan.md: scoring already handles toeDelta at 1.2× weight; depends on T030)
- [ ] T014 [US2] Update `js/report-ui.js` rear wheel rendering: receive `rimDiameter` from report-page; add three toe display columns per cell in rear summary table — (1) "Toe mm" raw input value from `cell.toe_mm`, (2) "Toe °" computed degrees from `cell.toe_deg`, (3) "Toe Δ°" degrees delta from target; apply same green/orange/red heatmap colour logic as camber to "Toe Δ°" column; when toe data absent (old CSV or empty cell), display "—" across all three columns with note "Toe data absent — re-export with new format" (depends on T013)

**Checkpoint**: Enter camber + toe (mm) for RL 3×3 minimum set → export CSV (6 cols) → load in report → three toe columns visible: raw mm, computed °, and Δ° with colour coding.

---

## Phase 4: User Story 3 — Front Toe String-Box Delta in Report (Priority: P2)

**Goal**: Front wheel report displays target toe in degrees AND the mm delta for string-box setup. Rim diameter is a configurable field. Front grid clearly labels toe as not entered here.

**Independent Test**: Set rim diameter = 330 mm, front toe target = 0.07°. Load any FL CSV. Report shows "0.40 mm per side" string-box delta. Front grid shows toe note.

### Implementation for User Story 3

- [ ] T015 [P] [US3] Add `stringBoxToeToMm(toeDegreesPerWheel, rimDiameterMm)` to `js/math-utils.js`: formula `rimDiameterMm * Math.tan(toeDegreesPerWheel * Math.PI / 180)`; validate inputs (non-finite or non-positive diameter → throw descriptive Error); distinct from `toeDegreesToResultantMm` (uses full wheel+tyre diameter) and from `stringBoxMmToToeDegrees` (inverse, added in T030); (research.md: R-004)
- [ ] T016 [P] [US3] Add `rimDiameter` to `CONSTANT_STORAGE` (`'alignment_constant_rim_diameter'`) and `CONSTANT_DEFAULTS` (`330`) in `js/targets-manager.js`; update save and load functions to persist and restore the new field (data-model.md: AlignmentConfig)
- [ ] T017 [P] [US3] Add "Rim Diameter (mm)" input field to Config tab in `site/index.html` adjacent to "Wheel Diameter (mm)" field; label clearly distinguishes the two: "Wheel Diameter (mm) — overall incl. tyre" and "Rim Diameter (mm) — metal rim only, for string-box setup" (quickstart.md: V-002)
- [ ] T018 [US3] Wire rim diameter input to `targets-manager.js` save/load — field reads from and persists to `alignment_constant_rim_diameter` on input/save events (depends on T016, T017)
- [ ] T019 [US3] In `js/report-page.js`, read `rimDiameter` and `toeFront` target from localStorage; pass both to front wheel report render call AND pass `rimDiameter` to rear wheel report render call (needed for mm→degrees conversion in T013/T014); (depends on T016)
- [ ] T020 [US3] In `js/report-ui.js`, add string-box setup section to front (FL/FR) wheel report: if `rimDiameter` is set, display `"Target: Y° per wheel → String gap delta: X mm per side (rim: Zmm)"` computed via `stringBoxToeToMm`; if not set, display `"Rim diameter not configured — set on Config page"`; toe values signed (negative = toe-out) (depends on T015, T019; quickstart.md: V-007)
- [ ] T021 [US3] Add front toe note to FL/FR input tabs in `js/input-grid.js` or `site/input.html`: a brief label or tooltip near the FL/FR grid header stating "Front toe is adjusted via tie rod — not entered here" (spec FR-016; quickstart.md: V-010)

**Checkpoint**: Front report string-box section renders correctly. `330 × tan(0.07° × π/180) ≈ 0.403 mm` confirmed in UI.

---

## Phase 5: User Story 4 — All 5 Targets on Index Page (Priority: P3)

**Goal**: Confirm (and fix if needed) that all 5 target fields exist, are clearly labelled, and persist correctly.

**Independent Test**: Set all 5 targets, reload, verify all 5 restored.

- [x] T022 [P] [US4] Audit `site/index.html` Targets tab: confirm 5 fields exist with labels — "Front Camber (°)", "Front Caster (°)", "Front Toe (° per wheel)", "Rear Camber (°)", "Rear Toe (° per wheel)"; fix any missing or ambiguous labels; add UI note near rear toe target field clarifying "Target in degrees — measurements entered as mm string-box delta"
- [x] T023 [P] [US4] Audit `js/targets-manager.js` `TARGET_STORAGE` object: confirm all 5 keys map correctly (`camber`, `caster`, `toeFront`, `camberRear`, `toeRear`); confirm defaults match spec (`−1.1`, `5.0`, `0.07`, `−1.5`, `0.07`)
- [x] T024 [P] [US4] Audit `js/report-engine.js` and `js/report-page.js`: confirm all 5 targets are loaded from localStorage and passed into `processWheel()` calls for the appropriate wheels (front: camber+caster+toeFront; rear: camberRear+toeRear)
- [x] T031 [P] [FR-018] Verify dynamic position count preserved for rear toe: set measurement density to each valid value (3, 5, 7, 9, 11, 13 positions); confirm rear wheel input grid renders N×N cells with toe input per cell at each density; confirm no hard-coded position indices in rear toe rendering path; `getBoltPositions()` must drive rear grid dimensions exactly as it does front (spec FR-018)
- [x] T032 [P] [FR-019] Verify angle mode preserved for rear wheels: toggle angle mode between "wheel degrees" and "steering wheel degrees" on index page; confirm rear wheel input grid column/row labels update to reflect selected mode and computed angles; steering ratio conversion must apply to rear bolt labels same as front (spec FR-019)

**Checkpoint**: All 5 targets persist through page reload. Report uses all 5 values. Rear grid scales correctly with all valid position counts. Angle mode labels update for rear tabs.

---

## Phase 6: Polish & Integration Tests

**Purpose**: New integration test coverage for all new flows per Constitution Principle III. Full regression verification.

- [x] T025 [P] Write integration test `tests/integration/rear-toe-input.mjs`: enter camber + toe on RL tab → export CSV → verify 6-column format → load in report → verify toe delta column rendered (quickstart.md: V-004, V-005, V-008)
- [x] T026 [P] Write integration test `tests/integration/front-toe-string-box.mjs`: set rim diameter 330 mm + front toe target 0.07° → load FL CSV → verify string-box section shows ≈0.40 mm → verify no section when rim diameter absent (quickstart.md: V-007)
- [x] T027 [P] Write integration test `tests/integration/rear-csv-compat.mjs`: import 5-column (old format) rear CSV → verify no error → verify report renders camber data → verify "Toe data absent" note displayed (quickstart.md: V-006)
- [x] T028 Run full integration test suite `npm test` — all 149+ tests must pass with no regressions (depends on all prior tasks)
- [x] T029 Run all 10 quickstart validation scenarios from `specs/003-generic-suspension-model/quickstart.md` (V-001 through V-010) — confirm each passes

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Foundational)
  └─▶ Phase 2 (US1: Branding) — after T003 + npm test pass
       └─▶ Phase 3 (US2: Rear toe) — after T007
       └─▶ Phase 4 (US3: String-box) — after T007 (parallel with Phase 3)
       └─▶ Phase 5 (US4: Targets) — after T007 (parallel with Phase 3+4)
            └─▶ Phase 6 (Polish) — after all implementation phases
```

### Within-Story Dependencies

```
Phase 3 (US2): T008 → T009 → T012 → T013 → T014
               T010, T011 parallel with each other (same file, different functions)
               T010, T011 after T008
               T030 [P] parallel with T008–T012 (math-utils.js only); MUST complete before T013
               T013 depends on BOTH T012 and T030

Phase 4 (US3): T015 parallel with T016, T017
               T016+T017 → T018 → T019 → T020
               T021 independent (different UI location)

Phase 5 (US4): T022, T023, T024, T031, T032 all parallel
               T031 and T032 depend on T008/T009 (rear grid must have toe input)
```

### Parallel Opportunities

- T001 ‖ T002 (Phase 1: different files)
- T004 ‖ T005 ‖ T006 (Phase 2: different files)
- T010 ‖ T011 (Phase 3: different functions in csv-io.js)
- T030 ‖ T008 ‖ T009 ‖ T010 ‖ T011 (Phase 3: T030 touches math-utils.js only)
- T015 ‖ T016 ‖ T017 (Phase 4: different files)
- T022 ‖ T023 ‖ T024 ‖ T031 ‖ T032 (Phase 5: all read-only audit)
- T025 ‖ T026 ‖ T027 (Phase 6: different test files)
- Phase 3 ‖ Phase 4 ‖ Phase 5 (after Phase 2 complete)

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Foundational key rename
2. Complete Phase 2: US1 branding removal
3. **STOP and VALIDATE**: `grep -ri "mx5\|nc1\|mazda" js/ site/ package.json` returns empty; `npm test` passes
4. Ship: tool is now generic with no vehicle references

### Incremental Delivery

1. Phase 1+2 → generic tool (no vehicle branding) — can ship
2. Phase 3 → rear toe per-cell — expands rear measurement capability
3. Phase 4 → front toe string-box guide — adds actionable front toe setup guidance
4. Phase 5 → target label audit — minor polish
5. Phase 6 → integration test coverage — locks in correctness

### Recommended Sequence (Single Developer)

```
Phase 1 → npm test (confirm green) → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
```

---

## Notes

- [P] = parallelizable — no shared in-progress file dependencies
- No database migrations — localStorage schema changes are additive (old data ignored, not corrupt)
- `stringBoxToeToMm` and `stringBoxMmToToeDegrees` MUST remain separate from `toeDegreesToResultantMm` (different physical measurement, different diameter base); the string-box pair uses rim diameter; `toeDegreesToResultantMm` uses overall wheel+tyre diameter
- Rear CSV backward compatibility is non-negotiable per spec FR-007 — parser must not throw on 5-column files
- Constitution floor: test count must not drop below 149 after T003 (key rename in tests)
