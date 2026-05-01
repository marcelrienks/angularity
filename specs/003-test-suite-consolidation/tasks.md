# Tasks: Test Suite Consolidation

**Input**: Design documents from `specs/003-test-suite-consolidation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**User Stories**: US1 (delete redundant tests, P1), US2 (consolidate overlapping tests, P2), US3 (single command runner, P2), US4 (valuable output, P3)

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user story from spec.md (US1–US4)

---

## Phase 1: Setup

**Purpose**: Verify baseline — all currently-registered tests pass before any changes.

- [X] T001 Run `npm test` and capture baseline pass/fail counts per integration test so any regression introduced during consolidation can be detected — `tests/test-runner.js` (read-only run)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove the 7 fully-redundant files and their npm scripts before any merge work begins. Nothing in Phases 3–6 depends on these files existing.

**⚠️ CRITICAL**: Delete before merging to prevent confusion between deleted sources and merge sources.

- [X] T002 [P] Delete `tests/integration/check-symmetry-display.mjs` — `tests/integration/check-symmetry-display.mjs`
- [X] T003 [P] Delete `tests/integration/display-symmetry.mjs` — `tests/integration/display-symmetry.mjs`
- [X] T004 [P] Delete `tests/integration/show-symmetry.mjs` — `tests/integration/show-symmetry.mjs`
- [X] T005 [P] Delete `tests/integration/screenshot-symmetry.mjs` — `tests/integration/screenshot-symmetry.mjs`
- [X] T006 [P] Delete `tests/integration/home-screen-validation.mjs` — `tests/integration/home-screen-validation.mjs`
- [X] T007 [P] Delete `tests/integration/report-table-rendering.mjs` — `tests/integration/report-table-rendering.mjs`
- [X] T008 [P] Delete `tests/integration/load-sample-data-validation.mjs` — `tests/integration/load-sample-data-validation.mjs`
- [X] T009 Remove the following npm scripts from `package.json` (deleted files only — merge-source scripts stay until their phase): `test:home`, `test:report-table`, `test:load-sample-data`; also remove any of `test:show-symmetry`, `test:screenshot-symmetry`, `test:check-symmetry`, `test:display-symmetry` if present — `package.json`

**Checkpoint**: 7 redundant files gone. Filesystem clean. All remaining scripts still point to existing files.

---

## Phase 3: User Story 1 — Remove Redundant Tests (Priority: P1) 🎯 MVP

**Goal**: Confirm the suite still runs cleanly after deletions, with `report-symmetry-validation.mjs` and `e2e-data-integrity.mjs` covering what was removed.

**Independent Test**: Remove deleted entries from `test-runner.js` INTEGRATION_TESTS and run `npm test`; all remaining tests pass.

- [X] T010 [US1] Remove `test:home`, `test:report-table`, `test:load-sample-data` from the `INTEGRATION_TESTS` array in `tests/test-runner.js` (the files were deleted in Phase 2) — `tests/test-runner.js`
- [X] T011 [US1] Run `npm test` and confirm exit code 0; record new baseline pass counts; confirm no previously-passing test now fails — `tests/test-runner.js` (run only)

**Checkpoint**: US1 independently verifiable — suite passes with 7 fewer files and zero lost coverage.

---

## Phase 4: User Story 2 — Consolidate Overlapping Tests (Priority: P2)

**Goal**: Merge 5 consolidation pairs. Each merge: extend destination with unique assertions from source, convert destination to `assert()` pattern, delete source file and its npm script.

**Independent Test**: After each merge subtask, run the destination file directly (e.g. `npm run test:multi-field-sync`) and confirm it passes.

### Merge 1 — Sync tests into `multi-field-sync.mjs`

- [X] T012 [US2] Add `passes`/`failures` counters and `assert(condition, label)` helper at module level of `multi-field-sync.mjs`; convert all existing `if (x) { log(green) } else { log(red); throw }` blocks to `assert(x, label)`; add summary print `=== Results: ${passes} passed, ${failures} failed ===` and `process.exit(failures > 0 ? 1 : 0)` at end of `main()` — `tests/integration/multi-field-sync.mjs`
- [X] T013 [US2] Add **Section: 4-wheel camber round-trip** to `multi-field-sync.mjs`: for each of FL/FR/RL/RR inject `{ "0": { "0": { neg20: "-1.10", zero: "-1.10", pos20: "-1.10" } } }` via `page.evaluate` localStorage, reload `/input.html`, read back and assert deep-equal — 4 assertions — `tests/integration/multi-field-sync.mjs`
- [X] T014 [US2] Add **Section: FL/FR sweep round-trip** to `multi-field-sync.mjs`: inject `{ camberPos20: -3.25, camberNeg20: 0.08 }` for FL and `{ camberPos20: -3.55, camberNeg20: 0.15 }` for FR, read back, assert identical to injected values — 2 assertions — `tests/integration/multi-field-sync.mjs`
- [X] T015 [US2] Delete `tests/integration/camber-sync.mjs` and `tests/integration/camber-sweep-sync.mjs`; remove `test:camber-sync` and `test:camber-sweep-sync` from `package.json` — `tests/integration/camber-sync.mjs`, `tests/integration/camber-sweep-sync.mjs`, `package.json`
- [X] T016 [US2] Run `npm run test:multi-field-sync` and confirm exit code 0 with all assertions passing — `tests/integration/multi-field-sync.mjs` (run only)

### Merge 2 — Chart test into `report-chart-interactions.mjs`

- [X] T017 [P] [US2] Add `passes`/`failures` counters and `assert()` helper to `report-chart-interactions.mjs`; convert every conditional `log(red)` + `process.exit(1)` block to `assert(x, label)`; remove debug `log(colors.cyan, 'Debug - ...')` lines; add summary + `process.exit` — `tests/integration/report-chart-interactions.mjs`
- [X] T018 [P] [US2] Delete `tests/integration/combination-chart-validation.mjs`; remove `test:combination-chart` from `package.json` — `tests/integration/combination-chart-validation.mjs`, `package.json`
- [X] T019 [US2] Run `npm run test:report-chart` and confirm exit code 0 — `tests/integration/report-chart-interactions.mjs` (run only)

### Merge 3 — Rear axle report into `rear-axle-symmetry.mjs`

- [X] T020 [P] [US2] Add `passes`/`failures` counters and `assert()` helper to `rear-axle-symmetry.mjs`; convert existing output to `assert()` pattern; add summary + `process.exit` — `tests/integration/rear-axle-symmetry.mjs`
- [X] T021 [P] [US2] Add **Section: Rear-only report** to `rear-axle-symmetry.mjs`: inject only RL and RR localStorage data (using `buildRearStorageGrid` pattern from `report-rear-axle-validation.mjs`), navigate to `/report.html`, assert: (1) visible table tabs === `['RL','RR']`, (2) after clicking `#tab-chart-rl`: `window.__alignmentChartDebug.wheel === 'RL'`, (3) `targetCamber === -1.5`, (4) `targetCaster === null`, (5) `#chart-note-camber` text === `'Camber -1.5°'`, (6) `#chart-note-caster` starts with `'Toe '`, (7) symmetry container includes `'Rear Axle (RL ↔ RR)'`, (8) washer section title includes `'Rear Wheels (RL / RR)'` — 8 assertions — `tests/integration/rear-axle-symmetry.mjs`
- [X] T022 [P] [US2] Delete `tests/integration/report-rear-axle-validation.mjs`; remove `test:report-rear-axle` from `package.json` — `tests/integration/report-rear-axle-validation.mjs`, `package.json`
- [X] T023 [US2] Run `npm run test:rear-axle-symmetry` and confirm exit code 0 — `tests/integration/rear-axle-symmetry.mjs` (run only)

### Merge 4 — Toe report assertion into `input-csv-operations.mjs`

- [X] T024 [P] [US2] Add `passes`/`failures` counters and `assert()` helper to `input-csv-operations.mjs`; convert existing output to `assert()` pattern — `tests/integration/input-csv-operations.mjs`
- [X] T025 [P] [US2] At the end of the existing CSV export section of `input-csv-operations.mjs` (after FL sample data + toe 0.73 is loaded and CSV exported), add: navigate to `/report.html`, `waitForSelector('#section-table', { visible: true })`, read `#toe-summary` text, `assert(toeSummary.includes('FL toe +0.73 mm'), 'report #toe-summary shows FL toe +0.73 mm')` — 1 assertion — `tests/integration/input-csv-operations.mjs`
- [X] T026 [P] [US2] Delete `tests/integration/report-toe-validation.mjs`; remove `test:report-toe` from `package.json` — `tests/integration/report-toe-validation.mjs`, `package.json`
- [X] T027 [US2] Run `npm run test:input-csv` and confirm exit code 0 — `tests/integration/input-csv-operations.mjs` (run only)

### Merge 5 — New `required-fields-e2e.mjs`

- [X] T028 [US2] Create `tests/integration/required-fields-e2e.mjs` with ESM imports (`puppeteer`, `getServerPort`, `waitForServer`), `passes`/`failures` counters, `assert()` helper, and `main()` scaffold with try/finally browser teardown and `process.exit(failures > 0 ? 1 : 0)` — `tests/integration/required-fields-e2e.mjs`
- [X] T029 [US2] Implement **Section A: Setup** in `required-fields-e2e.mjs`: launch browser, `waitForServer`, navigate to `/input.html`, `page.evaluate(() => localStorage.clear())`, click `#wheel-selector button[data-wheel="FL"]` — `tests/integration/required-fields-e2e.mjs`
- [X] T030 [US2] Implement **Section B: Input page required positions** in `required-fields-e2e.mjs`: for each of the 25 positions in `[-6,-3,0,3,6] × [-6,-3,0,3,6]`, assert `input[data-front="${f}"][data-rear="${r}"]` exists and is fillable; assert at least one such input has a CSS class or attribute indicating it is required; fill all 25 with value `"-1.10"`; assert data-sufficiency indicator shows ≥ 25 filled — `tests/integration/required-fields-e2e.mjs`
- [X] T031 [US2] Implement **Section C: Report table with sparse data** in `required-fields-e2e.mjs`: navigate to `/report.html`; `waitForSelector('#table-container', { visible: true })`; click `#tab-table-fl`; assert `#table-container` visible; assert at least 1 `tbody tr td` rendered; assert at least 1 cell has class `required-cell` — 3 assertions — `tests/integration/required-fields-e2e.mjs`
- [X] T032 [US2] Implement **Section D: Report chart with sparse data** in `required-fields-e2e.mjs`: assert `#main-chart` exists; assert `#section-chart` is visible; add summary + `process.exit` — 2 assertions — `tests/integration/required-fields-e2e.mjs`
- [X] T033 [US2] Delete `tests/integration/input-required-fields-only.mjs` and `tests/integration/report-required-fields-only.mjs`; remove `test:input-required-fields` and `test:report-required-fields` from `package.json` — both source files, `package.json`
- [X] T034 [US2] Run `npm run test:required-fields` and confirm exit code 0 — `tests/integration/required-fields-e2e.mjs` (run only)

**Checkpoint**: US2 independently verifiable — each destination file runs and passes; all 5 source pairs deleted; no unique assertion lost.

---

## Phase 5: User Story 3 — Single Command Runs Full Suite (Priority: P2)

**Goal**: `npm run test:all` runs every remaining integration test, aggregates results, exits 0 on all-pass.

**Independent Test**: Run `npm run test:all`; confirm all 21 integration test entries execute and exit code is 0.

- [X] T035 [US3] Add the following to the `scripts` section of `package.json`: `"test:required-fields": "node tests/integration/required-fields-e2e.mjs"`, `"test:all": "node tests/test-runner.js"`, `"test:all-sync": "node tests/test-runner.js"` (constitution-mandated alias), `"test:report-status": "node tests/integration/report-status-scenarios.mjs"`, `"test:report-responsive": "node tests/integration/report-responsive-design.mjs"`, `"test:rear-wheel-heatmaps": "node tests/integration/rear-wheel-heatmaps.mjs"` — `package.json`
- [X] T036 [US3] Update the `INTEGRATION_TESTS` array in `tests/test-runner.js`: remove all 10 deleted/merged script names; add `'test:required-fields'` (after `'test:input-csv'`), `'test:report-status'` and `'test:report-responsive'` (after `'test:report-values-check'`), and `'test:rear-wheel-heatmaps'` (before `'test:data-to-ui'`); final list must match the 22-item ordered list from `data-model.md` — `tests/test-runner.js`
- [X] T037 [US3] Run `npm run test:all` end-to-end with the dev server running; confirm all integration tests execute (22 suites), exit code is 0, and each suite name prints with a pass/fail indicator — `tests/test-runner.js` (run only)

**Checkpoint**: US3 independently verifiable — `npm run test:all` runs the full consolidated suite and exits 0.

---

## Phase 6: User Story 4 — Valuable Output for All Remaining Tests (Priority: P3)

**Goal**: Every remaining integration test file uses `assert()` pattern. Files not modified in Phases 3–5 that still use the old `throw`/`log` pattern must be converted. Targets T038–T054 are pre-enumerated; if a file already uses `passes`/`failures` counters and `assert()`, skip that task.

**Independent Test**: Run each converted file directly and confirm it prints ✓/✗ per assertion and a `=== Results: N passed, M failed ===` summary.

- [X] T038 [US4] Convert `tests/integration/rear-wheel-heatmaps.mjs` (missed in original inventory): (1) switch from `serverProcess` spawn to `await getServerPort()` singleton; (2) add `passes`/`failures` counters and `assert()` helper; (3) replace all `throw new Error('Test N failed: ...')` blocks with `assert(condition, label)` calls; (4) fix incorrect selectors — `[data-wheel="RL"] canvas` does not match the HTML; use `#camber-heatmap`, `#caster-heatmap`, `#proximity-heatmap` (the actual canvas IDs in `site/report.html`); (5) add summary print + `process.exit(failures > 0 ? 1 : 0)` — `tests/integration/rear-wheel-heatmaps.mjs`
- [X] T040 [P] [US4] Convert `tests/integration/input-grid-rendering.mjs` to `assert()` pattern: add counters and helper, replace all conditional throw/exit blocks, add summary + `process.exit` — `tests/integration/input-grid-rendering.mjs`
- [X] T041 [P] [US4] Convert `tests/integration/input-wheel-management.mjs` to `assert()` pattern — `tests/integration/input-wheel-management.mjs`
- [X] T042 [P] [US4] Convert `tests/integration/clear-empty-cycle.mjs` to `assert()` pattern — `tests/integration/clear-empty-cycle.mjs`
- [X] T043 [P] [US4] Convert `tests/integration/color-coding-ui.mjs` to `assert()` pattern — `tests/integration/color-coding-ui.mjs`
- [X] T044 [P] [US4] Convert `tests/integration/target-values-validation.mjs` to `assert()` pattern — `tests/integration/target-values-validation.mjs`
- [X] T045 [P] [US4] Convert `tests/integration/report-target-sync.mjs` to `assert()` pattern — `tests/integration/report-target-sync.mjs`
- [X] T046 [P] [US4] Convert `tests/integration/report-symmetry-validation.mjs` to `assert()` pattern — `tests/integration/report-symmetry-validation.mjs`
- [X] T047 [P] [US4] Convert `tests/integration/toe-symmetry-validation.mjs` to `assert()` pattern — `tests/integration/toe-symmetry-validation.mjs`
- [X] T048 [P] [US4] Convert `tests/integration/report-washer-validation.mjs` to `assert()` pattern — `tests/integration/report-washer-validation.mjs`
- [X] T049 [P] [US4] Convert `tests/integration/report-oracle-validation.mjs` to `assert()` pattern — `tests/integration/report-oracle-validation.mjs`
- [X] T050 [P] [US4] Convert `tests/integration/report-values-integrity-check.mjs` to `assert()` pattern — `tests/integration/report-values-integrity-check.mjs`
- [X] T051 [P] [US4] Convert `tests/integration/report-status-scenarios.mjs` to `assert()` pattern — `tests/integration/report-status-scenarios.mjs`
- [X] T052 [P] [US4] Convert `tests/integration/report-responsive-design.mjs` to `assert()` pattern — `tests/integration/report-responsive-design.mjs`
- [X] T053 [P] [US4] Convert `tests/integration/data-to-ui-validation.mjs` to `assert()` pattern — `tests/integration/data-to-ui-validation.mjs`
- [X] T054 [P] [US4] Convert `tests/integration/comprehensive-data-validation.mjs` to `assert()` pattern — `tests/integration/comprehensive-data-validation.mjs`
- [X] T055 [US4] Run `npm run test:all` after all conversions; confirm every integration test prints ✓/✗ lines and a `=== Results:` summary; confirm overall exit code 0 — `tests/test-runner.js` (run only)

**Checkpoint**: US4 independently verifiable — every test emits structured assertion output; full suite exits 0.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — run first
- **Phase 2 (Deletions)**: After T001 baseline captured — **BLOCKS** Phase 3
- **Phase 3 (US1)**: After Phase 2 complete
- **Phase 4 (US2)**: After Phase 3 — each merge is independent of other merges, can be parallelised
- **Phase 5 (US3)**: After all Phase 4 merges complete (T035 and T036 need final file list settled)
- **Phase 6 (US4)**: T038 audit first; T039–T054 [P] parallel after audit; T055 final validation after all conversions

### Parallel Opportunities

```
T001
  ↓
T002–T008 (all parallel) → T009
  ↓
T010 → T011 (baseline confirmed)
  ↓
┌── T012→T013→T014→T015→T016 (merge 1, sequential within merge)
├── T017→T018→T019          (merge 2, parallel to merge 1)  [P within merge]
├── T020→T021→T022→T023     (merge 3, parallel to merges 1&2) [P within merge]
├── T024→T025→T026→T027     (merge 4, parallel to merges 1–3) [P within merge]
└── T028→T029→T030→T031→T032→T033→T034  (merge 5)
  ↓ (all merges done)
T035→T036→T037
  ↓
T038 → T040–T054 (all parallel) → T055
```

### User Story Dependencies

- **US1** must complete before US2 (deleted files shouldn't be in test-runner list)
- **US2** must complete before US3 (test-runner list needs final state)
- **US3** can run in parallel with US4 (different files); US4 final validation T055 needs US3 done for accurate `test:all` run

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3 only)

1. Capture baseline
2. Delete 7 redundant files + remove their scripts
3. Remove deleted entries from `test-runner.js`
4. **VALIDATE**: `npm test` passes
5. **STOP** — US1 complete, suite smaller, zero coverage lost

### Incremental Delivery

1. Foundation + US1 → Validate → Commit
2. + Merge 1 (multi-field-sync) → Validate → Commit
3. + Merges 2–5 in parallel → Validate each → Commit
4. + US3 (test:all wired up) → Validate → Commit → **US2+US3 complete**
5. + US4 (assert() conversions) → Validate → Commit → **Full spec complete**

---

## Notes

- `assert()` pattern (data-model.md template) is the only output standard; no new test framework introduced
- All files converting to `assert()` MUST also switch from `serverProcess` spawn to `getServerPort()` singleton where applicable
- T038 audit may reveal some files already use `assert()` — skip conversion for those
- For merges involving files that spawn their own server, confirm `serverProcess.kill()` is removed and `getServerPort()` import is added before marking that task done
- `test:report-chart` is the npm script name for `report-chart-interactions.mjs` — confirm in `package.json` before T019
