# Quickstart Validation Guide: UI Styling Improvements

## Prerequisites

- Dev server running on port 8080: `npm start`
- Browser open to `http://localhost:8080/site/index.html`
- Browser DevTools available (for inspecting computed styles)

---

## Scenario 1: Paragraph Text Readability

**Validates**: FR-001, SC-001

1. Open `http://localhost:8080/site/index.html`
2. Read the text in the two home cards (Input Sheet / Report descriptions)
3. Read the "Report calculations use stored values only" note below the form
4. **Expected**: Text is comfortably readable at 100% zoom — not tiny
5. Open DevTools → inspect any `.paragraph` element → computed `font-size` should be **14px** (0.875rem at 16px base)
6. Open `http://localhost:8080/site/report.html` (with data loaded or without)
7. Read the sub-section status messages and notes
8. **Expected**: All paragraph text readable without zoom

---

## Scenario 2: Light Theme Border Consistency

**Validates**: FR-002, SC-002

1. Open `http://localhost:8080/site/index.html`
2. Open the Theme menu (top-right nav) → select **Light**
3. Navigate to `http://localhost:8080/site/report.html`
4. Load any CSV file or observe the data table if data is present
5. Inspect the 13×13 data table rows — look at cell dividers
6. **Expected**: Row borders are a light grey (`#D4D4D4`) — NOT dark (`#21262d`)
7. Also inspect the Spec Table on `index.html` (visible under Alignment Configuration section)
8. **Expected**: Table row borders visible with appropriate light contrast

---

## Scenario 3: Form Fieldset Backgrounds

**Validates**: FR-003, FR-004, SC-003

1. Open `http://localhost:8080/site/index.html` in both light and dark themes
2. Navigate to the **Targets** tab in the Alignment Configuration section
3. **Expected**: "Front Axle Targets" and "Rear Axle Targets" fieldsets each have a visible background that groups their contents — no transparent/missing background
4. Navigate to the **Configs** tab
5. **Expected**: "Vehicle Configs" and "Derived / Fixed Configs" fieldsets same treatment
6. Open DevTools → inspect `.form-fieldset` → computed `background` must resolve to a non-transparent color (not `rgba(0,0,0,0)`)

---

## Scenario 4: No Inline Presentational Styles in index.html

**Validates**: FR-005, SC-004

1. Open `site/index.html` source (or use DevTools Elements panel)
2. Search for `style="` in the source
3. **Expected results**:
   - `style="display: none;"` on `#error-banner` — **acceptable** (JS-controlled)
   - `style="display:none;"` on `#configs-panel` — **acceptable** (JS tab toggling)
   - `style="display:none;"` on `#wheel-degrees-group` — **acceptable** (JS radio toggling)
   - **Zero** `style=` attributes containing `padding`, `margin`, `flex`, `gap`, `border`, `background`, or `color`

---

## Scenario 5: Primary Button Visual Prominence

**Validates**: FR-011, SC-006

1. Open `http://localhost:8080/site/index.html`
2. Navigate to Targets tab
3. Compare **Save Targets** button against **Reset Targets** button
4. **Expected**: Save Targets has a filled blue background (`var(--blue)` = `#6ab4ff`); Reset Targets has a border-only danger style
5. Navigate to Configs tab — repeat for Save Configs vs Reset Configs
6. Open `http://localhost:8080/site/input.html`
7. **Expected**: "Save CSV" button has filled blue background

---

## Scenario 6: Read-Only Display Values Visually Distinct

**Validates**: FR-012, SC-008

1. Open `http://localhost:8080/site/index.html` → navigate to Configs tab
2. Find the "Derived / Fixed Configs" fieldset (right column)
3. Observe: "Steering Wheel Sweep", "Effective Wheel Angle", "Caster Multiplier", "Adjustment Bolt Positions", "Minimum Required Washer Points"
4. **Expected**: These display values use muted/italic styling that clearly differs from editable inputs above them
5. Compare against editable inputs like "Steering Ratio" — the read-only values should be visually softer

---

## Scenario 7: Keyboard Focus States

**Validates**: FR-013, SC-009

1. Open `http://localhost:8080/site/index.html`
2. Press **Tab** key to navigate through interactive elements
3. **Expected**: Each focused element (nav links, buttons, inputs, select dropdown) shows a clear blue outline (2px solid `#6ab4ff`)
4. The focused element should be unambiguous without looking at the cursor
5. Click a button with the mouse — **Expected**: focus ring should NOT appear (`:focus-visible` only triggers for keyboard)

---

## Scenario 8: Section Panel Visual Hierarchy (Report Page)

**Validates**: FR-010, SC-007

1. Open `http://localhost:8080/site/report.html`
2. Load a CSV file to generate report sections, OR observe placeholder sections
3. Scroll through chart, heatmap, washer, and symmetry sections
4. **Expected**: Each panel has a visible blue top accent border (3px) that gives it visual presence and entry point
5. Spacing between sections should feel consistent and rhythmic

---

## Scenario 9: Theme Parity (Both Themes Polished)

**Validates**: SC-002, SC-009, User Story 5 acceptance #7

1. Work through Scenarios 1–8 with **Light theme** active
2. Switch to **Dark theme** via the nav Theme menu
3. Repeat visual checks:
   - Fieldset backgrounds visible ✓
   - Table borders correct contrast ✓
   - Primary buttons blue ✓
   - Read-only values muted ✓
   - Focus rings visible ✓
   - Section top accents visible ✓
4. **Expected**: Both themes feel equally complete — neither looks unfinished

---

## Integration Test Verification

**Validates**: SC-005 (constitution requirement III)

```bash
npm run test:all-sync
```

**Expected**: All tests pass. Count at least 149 tests. Zero failures.

If any test fails, check whether the failure is:
- CSS class name changed on an element a test queries by class → fix the class
- Layout change that broke a Puppeteer element selector → adjust selector
- Functional regression (should not happen — no JS or logic changes) → investigate

---

## Quick Smoke Check (all at once)

```bash
# 1. Start server
npm start &

# 2. Run full test suite
npm run test:all-sync

# 3. Visual check: open both themes on all three pages
open http://localhost:8080/site/index.html
open http://localhost:8080/site/input.html
open http://localhost:8080/site/report.html
```
