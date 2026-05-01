# Feature Specification: Test Suite Consolidation

**Feature Branch**: `003-test-suite-consolidation`
**Created**: 27 April 2026
**Status**: Complete
**Input**: Analysis of 35 integration test files revealing 7 fully redundant files, 5 consolidation merges (7 source files into 5 destinations), and no single command to run the full suite.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Remove Redundant Tests (Priority: P1)

A developer running the test suite should not have to wade through tests that duplicate assertions already made by other tests, including debug scripts that were never converted into real tests.

**Why this priority**: Redundant tests add noise, increase CI time, and create a false sense of coverage breadth. Removing them is prerequisite to meaningful consolidation.

**Independent Test**: Delete the 7 identified files and confirm the remaining suite still passes in full with no loss of scenario coverage.

**Acceptance Scenarios**:

1. **Given** the 7 redundant files identified in analysis, **When** they are deleted, **Then** every scenario they covered is demonstrably covered by an existing remaining test.
2. **Given** the suite runs after deletion, **When** `npm run test:all` executes, **Then** no test that was previously passing now fails.
3. **Given** check-symmetry-display / display-symmetry / show-symmetry / screenshot-symmetry are deleted, **When** symmetry coverage is reviewed, **Then** `report-symmetry-validation.mjs` covers all real assertions.

---

### User Story 2 — Consolidate Overlapping Tests (Priority: P2)

A developer should be able to read one test file to understand one domain, not discover the same behaviour is split across two or three files with slight variations.

**Why this priority**: Fragmented tests for the same concern multiply maintenance cost. Every production change requires updating multiple test files that should have been one.

**Independent Test**: Each consolidation target can be validated independently — run the destination file and confirm it passes and covers the merged behaviour.

**Acceptance Scenarios**:

1. **Given** `camber-sync.mjs` and `camber-sweep-sync.mjs` are merged into `multi-field-sync.mjs`, **When** `multi-field-sync.mjs` runs, **Then** it asserts all sync behaviours previously split across three files.
2. **Given** `combination-chart-validation.mjs` is merged into `report-chart-interactions.mjs`, **When** `report-chart-interactions.mjs` runs, **Then** all chart feature assertions (dual Y-axes, colours, drop lines, wheel switching) pass from a single file.
3. **Given** `report-rear-axle-validation.mjs` is merged into `rear-axle-symmetry.mjs`, **When** `rear-axle-symmetry.mjs` runs, **Then** all RL/RR-only scenarios pass.
4. **Given** `report-toe-validation.mjs` assertions are merged into `input-csv-operations.mjs`, **When** `input-csv-operations.mjs` runs, **Then** toe display and CSV round-trip assertions pass together.
5. **Given** `input-required-fields-only.mjs` and `report-required-fields-only.mjs` are merged into a single required-fields E2E test, **When** that test runs, **Then** it covers both the input page and report page behaviour with sparse data in a single coherent scenario.

---

### User Story 3 — Single Command Runs Full Suite (Priority: P2)

A developer should be able to run `npm run test:all` (or equivalent) and have every remaining integration test execute in sequence, with clear per-test output and a final summary of pass/fail counts.

**Why this priority**: Without a single entry point the suite is impractical to run in CI or as a pre-commit gate.

**Independent Test**: Run `npm run test:all` from the repo root with the dev server running and confirm every integration test file executes and all pass.

**Acceptance Scenarios**:

1. **Given** the consolidated suite, **When** `npm run test:all` is run, **Then** every remaining integration test file is executed.
2. **Given** all tests pass, **When** `npm run test:all` completes, **Then** exit code is `0`.
3. **Given** any single test file fails, **When** `npm run test:all` completes, **Then** exit code is non-zero and the failing test file is identified by name in the output.
4. **Given** `npm run test:all` runs, **When** output is printed to the terminal, **Then** each test file's name, pass count, and fail count are visible.

---

### User Story 4 — Remaining Tests Produce Valuable Output (Priority: P3)

Each remaining test file should print output that tells a developer exactly what was checked and what failed — no silent passes, no cryptic assertion errors.

**Why this priority**: Tests that don't emit useful output on failure are nearly as bad as no tests. This is a quality gate, not a new feature.

**Independent Test**: Deliberately introduce a regression (e.g., rename a CSS class), run the affected test, and confirm the failure message identifies the specific element and expected vs actual value.

**Acceptance Scenarios**:

1. **Given** any integration test runs, **When** all assertions pass, **Then** each assertion prints a labelled ✓ line with the what was checked.
2. **Given** any integration test runs, **When** an assertion fails, **Then** a ✗ line prints the test name, expected value, and actual value.
3. **Given** any test file completes, **When** output is reviewed, **Then** a summary line "N passed, M failed" appears at the end.

---

### Edge Cases

- What if a file to be deleted contains an assertion that exists nowhere else? — Coverage must be verified per-file before deletion proceeds.
- What if consolidating two tests creates timing conflicts (both navigate to the same page)? — Each consolidated test must be validated end-to-end after merge.
- What if `npm run test:all` starts the dev server itself and one test already launched it? — Server lifecycle must be handled by the shared `test-server-singleton.js` pattern already established.
- What if a merged test becomes too large (>600 LOC)? — Split into logical sections with clear section headers, keeping one file per domain.

---

## Requirements *(mandatory)*

### Functional Requirements

**Deletion requirements**

- **FR-001**: The following 7 files MUST be deleted from `tests/integration/`:
  `check-symmetry-display.mjs`, `display-symmetry.mjs`, `show-symmetry.mjs`, `screenshot-symmetry.mjs`, `home-screen-validation.mjs`, `report-table-rendering.mjs`, `load-sample-data-validation.mjs`
- **FR-002**: Every npm script referencing a deleted file MUST be removed from `package.json`.

**Consolidation requirements**

- **FR-003**: `camber-sync.mjs` and `camber-sweep-sync.mjs` MUST be merged into `multi-field-sync.mjs`; both source files deleted after merge.
- **FR-004**: `combination-chart-validation.mjs` MUST be merged into `report-chart-interactions.mjs`; source file deleted after merge.
- **FR-005**: `report-rear-axle-validation.mjs` MUST be merged into `rear-axle-symmetry.mjs`; source file deleted after merge.
- **FR-006**: `report-toe-validation.mjs` assertions MUST be merged into `input-csv-operations.mjs`; source file deleted after merge.
- **FR-007**: `input-required-fields-only.mjs` and `report-required-fields-only.mjs` MUST be merged into a single file named `required-fields-e2e.mjs` that covers both input-page and report-page behaviour with sparse data; both source files deleted after merge.

**Single-command runner requirements**

- **FR-008**: A new npm script `test:all` MUST be added to `package.json` that runs every remaining integration test file in sequence.
- **FR-009**: The runner MUST print the name of each test file before it runs. *(already implemented in `test-runner.js` — verify only)*
- **FR-010**: The runner MUST print a final summary: total files run, total assertions passed, total assertions failed, and overall exit code. *(already implemented in `test-runner.js` — verify only)*
- **FR-011**: If any individual test file exits non-zero, the runner MUST continue running remaining files (not abort) and report all failures at the end. *(already implemented in `test-runner.js` — verify only)*
- **FR-012**: The runner MUST start (or reuse) the dev server using the existing `test-server-singleton.js` pattern; it MUST NOT require the user to manually start the server before running `test:all`. *(already implemented in `test-runner.js` — verify only)*

**Output quality requirements**

- **FR-013**: Every integration test file MUST use the `assert(condition, label)` pattern (already established in `e2e-data-integrity.mjs`) so every assertion emits a ✓ or ✗ line.
- **FR-014**: Files identified in data-model.md as log-only (no real assertions) MUST be deleted. Scope is limited to the specific files listed in data-model.md; no open-ended interpretation.

### Key Entities

- **Integration test file**: A standalone `.mjs` script in `tests/integration/` that launches a browser via Puppeteer, injects state, and asserts UI behaviour.
- **Test runner**: A new script (Node.js `.mjs` or npm `--` chaining) that orchestrates sequential execution of all integration test files and aggregates results.
- **npm script**: An entry in `package.json` `scripts` that exposes a test command to developers and CI.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Integration test file count reduces from 35 to 22 or fewer, with zero loss of scenario coverage.
- **SC-002**: `npm run test:all` executes all remaining integration tests and exits in under 10 minutes on standard hardware.
- **SC-003**: Every remaining integration test file produces at least one labelled assertion line per scenario checked.
- **SC-004**: `npm run test:all` exits with code `0` when all tests pass and non-zero when any fail.
- **SC-005**: No npm script in `package.json` references a deleted or non-existent test file.
- **SC-006**: Any developer can run the full integration suite with a single terminal command, with no manual prerequisite steps (server start, environment setup).

---

## Assumptions

- The existing `test-server-singleton.js` and `test-wait-helpers.js` patterns are reused without modification.
- No production source files (`js/`, `site/`) are modified by this feature.
- The consolidated suite must still pass on the same hardware and Node.js version (18+) as the current suite.
- `npm run test:all` will not replace the existing granular `npm run test:<name>` scripts — those remain for focused debugging.
- Merging tests preserves all original assertions; no assertion is silently dropped during consolidation.
- The dev server is run on port 8080 (existing convention); no port changes required.
