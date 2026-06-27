# Research: Generic 4-Wheel Suspension Geometry Tool

**Feature**: 003-generic-suspension-model | **Date**: 2026-06-26

## Decision Log

---

### R-001: Storage Key Rename Strategy

**Question**: Should old `mx5nc1_align_v2_` / `mx5-nc1-alignment-*` keys be migrated to new generic keys on first load, or should old data be abandoned?

**Decision**: Rename keys; no migration. Old data is abandoned (users start fresh or re-import CSVs).

**Rationale**: The tool is a single-user diagnostic tool. Measurement sessions are short (one alignment job). Stored data has no long-term value — a fresh measurement session takes minutes. Migration code adds complexity and a potential failure path. The spec explicitly calls out that migration is not required.

**Alternatives considered**:
- Auto-migrate on load: reads old keys, writes to new keys, deletes old. Adds ~50 LOC; risk of corrupt state if migration is interrupted; not worth it for ephemeral data.
- Support both key formats indefinitely: rejected — defeats the purpose of the rename.

---

### R-002: Rear CSV Backward Compatibility

**Question**: How should the CSV parser distinguish between old rear CSVs (camber only, 5 columns) and new rear CSVs (camber + toe, 6 columns)?

**Decision**: Detect by column count in the header row. 5 columns = old format (no toe). 6 columns = new format (includes toe). Missing toe treated as absent (not zero).

**Rationale**: Column count is unambiguous. Header names are already fixed. No version field in the CSV today; adding one would be over-engineering.

**Alternatives considered**:
- Add a version column or header comment: more robust for future changes but overkill for a two-state distinction.
- Always require 6 columns: breaks all existing CSVs immediately; rejected per spec requirement for graceful degradation.

---

### R-003: Rear Cell Data Shape

**Question**: Should the rear cell structure change to `{ camber, toe }` (clean), or extend the existing `{ neg20, zero, pos20 }` shape with a `toe` field?

**Decision**: Extend existing shape: `{ neg20, zero, pos20, toe }`. For rear wheels, `neg20 = zero = pos20 = camber_value`; `toe` is separate.

**Rationale**: Preserves pipeline compatibility downstream (interpolation, report-engine, CSV parser all expect the 3-key structure). The camber-mirror logic remains but is now explicit. Changing the shape would require changes across interpolation.js, report-engine.js, csv-io.js, and all tests — a much larger refactor for no functional gain.

**Alternatives considered**:
- Clean `{ camber, toe }` shape for rear only: requires branching logic everywhere the cell is consumed; more total code change; rejected.
- Separate toe grid (parallel 13×13 state): adds a second state object; more complex CSV; rejected.

---

### R-004: Toe Math Functions

**Question**: Should `stringBoxToeToMm` reuse `toeDegreesToResultantMm` (passing rim diameter as the diameter argument), or be a separate function?

**Decision**: Separate function `stringBoxToeToMm(toeDegreesPerWheel, rimDiameterMm)` in `math-utils.js`.

**Rationale**: Both functions use the formula `diameter × tan(θ)` but apply to fundamentally different physical measurements. `toeDegreesToResultantMm` uses overall wheel+tyre diameter to compute the linear offset at the tyre contact patch. `stringBoxToeToMm` uses the metal rim diameter to compute the gap delta measured at the rim edges with a reference string. Merging them under one name invites callers to pass the wrong diameter. Constitution Principle II (Physics-First Correctness) requires the distinction to be explicit.

**Alternatives considered**:
- Reuse with a `diameterType` parameter: adds a flag argument; smells bad; rejected.
- Reuse with a comment: invisible to callers; rejected.

---

### R-005: Rim Diameter Config Location

**Question**: Where should the rim diameter field live in the UI?

**Decision**: Config tab on `index.html`, adjacent to the existing `wheel-diameter-input` field. Stored under key `alignment_constant_rim_diameter` with default 330 mm.

**Rationale**: Wheel diameter and rim diameter are both vehicle-specific measurement setup values. Grouping them together is ergonomically obvious. The Config tab already has other measurement parameters (steering ratio, wheel diameter, measurement density).

**Alternatives considered**:
- Targets tab: targets are alignment angle goals, not measurement setup values; wrong tab.
- Inline on report page: report is read-only output; configuration there is unexpected.

**Default value**: 330 mm chosen as a representative 17-inch rim (common on sporty road cars). User must verify and update for their specific rim.

---

### R-006: Front Toe in Scoring

**Question**: Should front toe target be included in the front wheel Golden Rule score (even though no toe measurement is made in the grid)?

**Decision**: No. Front toe is display-only in the report (string-box section). It does not affect grid scoring.

**Rationale**: The score ranks bolt combinations by their measured effect on camber and caster. Toe is not measured per bolt combination for front wheels — it is set independently via threaded rod after bolt positions are fixed. Including a zero toe-delta in scoring (because we have no measurement) would be misleading and technically incorrect.

---

### R-007: Test Helper Key Updates

**Question**: Do integration test files that hardcode storage keys need to be updated?

**Decision**: Yes. All test helper functions (e.g. `setWheelGridData`) that construct `mx5-nc1-alignment-${wheel}` keys must be updated to `alignment-${wheel}`.

**Scope identified**:
- `tests/integration/*.mjs` — inline `page.evaluate` calls that set localStorage keys
- Pattern: `mx5-nc1-alignment-` → `alignment-`
- Pattern: `startsWith('mx5-nc1')` → `startsWith('alignment-')`

