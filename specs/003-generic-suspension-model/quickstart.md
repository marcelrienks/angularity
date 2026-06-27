# Quickstart Validation Guide: Generic 4-Wheel Suspension Geometry Tool

**Feature**: 003-generic-suspension-model | **Date**: 2026-06-26

## Prerequisites

- Node.js (ES modules support)
- `npm install` completed
- Dev server running: `node js/server.js` (port 8080)
- Browser open at `http://localhost:8080`

## Validation Scenarios

---

### V-001: No Vehicle References Remain

**Goal**: Confirm all MX5/NC1 branding is gone.

**Steps:**
1. Open browser DevTools → Application → Local Storage
2. Trigger fresh page load; enter any value in FL grid and save
3. Inspect all localStorage keys

**Expected**: Zero keys containing "mx5", "nc1" (case-insensitive). Keys follow pattern `alignment-{wheel}` for grid data.

**CLI equivalent:**
```bash
# Search source for vehicle references
grep -ri "mx5\|nc1\|mazda" js/ site/ package.json
# Expected: zero matches
```

---

### V-002: Rim Diameter Config Field

**Goal**: Rim diameter can be set and persists.

**Steps:**
1. Open `http://localhost:8080` → Config tab
2. Locate "Rim Diameter (mm)" field — should appear near "Wheel Diameter (mm)"
3. Clear the field; enter `330`; click Save (or Tab away to trigger autosave)
4. Reload the page

**Expected**:
- Field shows `330` after reload
- localStorage contains key `alignment_constant_rim_diameter` with value `330`

---

### V-003: All 5 Targets Present and Persist

**Goal**: Targets tab has 5 fields; all save and reload.

**Steps:**
1. Open `http://localhost:8080` → Targets tab
2. Confirm these 5 fields exist with distinct labels:
   - Front Camber (°)
   - Front Caster (°)
   - Front Toe (° per wheel)
   - Rear Camber (°)
   - Rear Toe (° per wheel)
3. Set: camber = −1.2, caster = 5.5, toeFront = 0.10, camberRear = −1.6, toeRear = 0.05
4. Save; reload page
5. Return to Targets tab

**Expected**: All 5 values restored exactly as entered.

---

### V-004: Rear Grid Accepts Camber and Toe

**Goal**: Each rear grid cell accepts two values.

**Steps:**
1. Open `http://localhost:8080/input.html`
2. Click RL tab (Rear Left)
3. Locate any grid cell at bolt positions (0, 0)
4. Confirm two input fields visible: one labelled "Camber (°)" and one labelled "Toe (°)"
5. Enter camber = −1.5 and toe = 0.06
6. Tab to next cell; verify values saved (check localStorage or CSV export)

**Expected**:
- Two distinct input fields per rear cell
- Values stored in `alignment-RL` under `[toeBolt][camberBolt]` as `{ zero: "-1.5", neg20: "-1.5", pos20: "-1.5", toe: "0.06" }`
- Front tabs (FL, FR) show only the existing 3 steering-angle inputs (ACW, 0°, CW) — no toe field

---

### V-005: Rear CSV Export Includes Toe Column

**Goal**: Exported rear CSV has 6 columns.

**Steps:**
1. Enter minimum measurement set (3×3 or denser) on RL tab with both camber and toe values
2. Click "Export CSV" on the RL tab
3. Open exported file in a text editor

**Expected column header:**
```
frontBolt,rearBolt,neg20,zero,pos20,toe
```
Each data row has 6 comma-separated values. Toe values match what was entered.

---

### V-006: Old Rear CSV Loads Without Error

**Goal**: Rear CSV with only 5 columns loads gracefully.

**Steps:**
1. Create a test CSV with 5 columns (no toe column):
   ```
   frontBolt,rearBolt,neg20,zero,pos20
   -1,-1,-1.4,-1.4,-1.4
   -1,0,-1.5,-1.5,-1.5
   -1,1,-1.6,-1.6,-1.6
   0,-1,-1.4,-1.4,-1.4
   0,0,-1.5,-1.5,-1.5
   0,1,-1.6,-1.6,-1.6
   1,-1,-1.4,-1.4,-1.4
   1,0,-1.5,-1.5,-1.5
   1,1,-1.6,-1.6,-1.6
   ```
2. Import it on the RL or RR tab
3. Open `report.html`, load the CSV there

**Expected**:
- No errors thrown; CSV loads successfully
- Report renders rear camber data
- Report displays a note: "Toe data absent — upgrade to new CSV format for toe scoring"
- No NaN or undefined values in report

---

### V-007: Front Report Shows String-Box Section

**Goal**: Front wheel report displays toe target and mm delta.

**Prerequisites**: Rim diameter set to 330 mm (V-002); front toe target set to 0.07° (V-003).

**Steps:**
1. Open `report.html`
2. Load any valid FL CSV
3. Scroll to the string-box / front toe section of the report

**Expected output section:**
```
STRING BOX SETUP — FRONT TOE
Target: 0.07° per wheel
String gap delta: 0.40 mm per side (rim diameter: 330 mm)
Note: Front toe is set via tie rod after eccentric bolt geometry is fixed.
```

**Calculation check**: `330 × tan(0.07 × π/180) = 330 × 0.001222 ≈ 0.403 mm`

If rim diameter is not set:
```
STRING BOX SETUP — FRONT TOE
Target: 0.07° per wheel
String gap delta: configure rim diameter on Settings page
```

---

### V-008: Rear Report Scores Toe

**Goal**: Rear report shows toe delta and best-cell reflects toe in scoring.

**Prerequisites**: Rear toe target set to 0.07° (V-003); rear CSV with toe column loaded.

**Steps:**
1. Load a rear CSV that includes varied toe values across cells
2. Open `report.html` and load it for RL or RR
3. Inspect summary table

**Expected**:
- Summary table has a "Toe" column showing measured toe per bolt combination
- A "Toe Δ" column shows delta from target (colour coded green/orange/red)
- Best cell takes toe into account — a cell with camber near target but toe far off should not rank above a cell with both near target

---

### V-009: Regression — All Existing Tests Pass

**Goal**: No regressions in existing 149 tests.

**Steps:**
```bash
npm test
```

**Expected**: All 149 (or more) tests pass. Zero failures.

---

### V-010: Front Grid Has No Toe Input (Clarity Check)

**Goal**: UI correctly signals that front toe is not entered in the grid.

**Steps:**
1. Open `input.html` → FL tab
2. Inspect any grid cell

**Expected**:
- Cell shows 3 inputs for the steering sweep (ACW, 0°, CW) — no toe field
- Grid header or instruction text near the FL/FR tabs contains a note such as: "Front toe is adjusted via tie rod — not entered here"

