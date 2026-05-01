# Integration Tests

Automated integration tests for the MX5 NC1 wheel alignment system.

## Running Tests

```bash
npm test
```

This runs the full test suite — unit tests then all integration tests — with a live progress summary. Exit code 0 = all passed.

### Other useful scripts

| Command | Purpose |
|---------|---------|
| `npm run test:unit` | Unit tests only (Jest, no browser) |
| `npm run test:unit:watch` | Unit tests in watch mode |
| `npm run test:coverage` | Unit tests with coverage report |
| `npm run test:<name>` | Run a single integration suite (see scripts in package.json) |

## Test Coverage Map

### Home Screen
- **`home-screen-validation.mjs`** - Target display, navigation, edit form

### Input Screen
- **`input-grid-rendering.mjs`** - Grid structure, headers, cell inputs, accessibility
- **`input-wheel-management.mjs`** - Wheel tabs, data isolation, persistence
- **`input-csv-operations.mjs`** - Save/load CSV, file format, validation
- **`camber-sync.mjs`** - Data persistence across pages
- **`camber-sweep-sync.mjs`** - Sweep data and caster calculation
- **`load-sample-data-validation.mjs`** - Sample data generation per wheel

### Report Screen
- **`report-table-rendering.mjs`** - Table structure, focused indicators, color coding
- **`report-chart-interactions.mjs`** - Chart rendering, wheel switching, legend
- **`combination-chart-validation.mjs`** - Chart data mapping, target lines
- **`color-coding-ui.mjs`** - Dynamic color toggle, CSS classes
- **`target-values-validation.mjs`** - Target display in legend
- **`clear-empty-cycle.mjs`** - Empty state transitions
- **`multi-field-sync.mjs`** - Sustained synchronization

## Tests

### Test: Camber Data Synchronization (Input ↔ Report)

**Purpose:** Verify camber measurement data syncs correctly between input and report pages. Also validates that color-coded scenarios (GREEN/ORANGE/RED tiers) work correctly for both initial and modified data. Tests data persistence, not calculations.

**Color Tiers (TARGET_CAMBER = -1.1°):**
- GREEN: ≤±0.15° from target (−1.25° to −0.95°)
- ORANGE: ≤±0.40° from target (−1.50° to −0.70°)
- RED: >±0.40° from target

**Scenario:**
1. Navigate to input page, clear all localStorage
2. Populate storage with color-coded baseline camber values (FL: GREEN, FR: ORANGE, RL/RR: ORANGE)
3. Navigate to report page, verify values retrieved from localStorage match stored values
4. Validate color tier classification for each wheel based on delta from target
5. Return to input page, modify camber values to shift between color tiers (FL: GREEN, FR: ORANGE, RL: RED, RR: ORANGE)
6. Navigate to report page, verify modifications persisted and color tiers recalculated correctly

**Validation Points:**
- localStorage clears correctly
- All wheel data (FL/FR/RL/RR) syncs identically between pages (JSON equality check)
- Camber values correctly classified into GREEN/ORANGE/RED color tiers
- Modifications persist across page navigations with accurate color tier updates
- No calculations tested—only data persistence and color tier classification

**Test Files:**
- `camber-sync.mjs` - Standalone runner

### Test: Camber Sweep Data Synchronization (Input ↔ Report)

**Purpose:** Verify camber sweep readings (±20° steering angles) sync correctly between input and report pages. Also validates that calculated caster values result in correct color-coded scenarios (GREEN/ORANGE/RED). Tests data persistence for values used in downstream caster calculations, not the calculations themselves.

**Caster Calculation & Color Tiers (TARGET_CASTER = 5.0°):**
- Formula: `1.462 × |camberPos20 − camberNeg20|`
- GREEN: ≤±0.25° from target (4.75° to 5.25°)
- ORANGE: ≤±0.60° from target (4.40° to 5.60°)
- RED: >±0.60° from target

**Scenario:**
1. Navigate to input page, clear all localStorage
2. Populate storage with camber sweep readings for front wheels (FL: GREEN caster ~4.87°, FR: ORANGE caster ~5.41°)
3. Navigate to report page, verify sweep data retrieved from localStorage matches stored values
4. Validate calculated caster values and color tier classification for each front wheel
5. Return to input page, modify sweep readings to shift between color tiers (FL: ORANGE ~5.41°, FR: RED ~6.11°)
6. Navigate to report page, verify modifications persisted and caster color tiers recalculated correctly

**Validation Points:**
- Camber sweep data (+20° and -20°) stored and retrieved identically (JSON equality check)
- Front wheels (FL/FR only) tested—these have sweep readings for caster calculation
- Caster values correctly calculated and classified into GREEN/ORANGE/RED color tiers
- Modifications persist across page navigations with accurate caster value and color tier updates
- No raw calculation correctness tested—only sweep data persistence and color tier classification

**Test Files:**
- `camber-sweep-sync.mjs` - Standalone runner

### Test: Color-Coding UI Rendering & Interaction

**Purpose:** Verify that the report page correctly renders DOM elements with color-coded CSS classes based on camber and caster values. Validates that the "Color Coding" toggle (camber vs caster) dynamically updates table cell classes without requiring page reload.

**What This Test Catches:**
- UI rendering bugs where DOM elements don't get correct CSS classes
- Event handling issues with radio button toggles
- State management problems where UI toggle doesn't update display
- CSS class application failures

**Color Tiers (Camber):**
- `target-met`: ≤±0.15° from -1.1° → GREEN
- `near-target`: ≤±0.40° from -1.1° → ORANGE
- `off-target`: >±0.40° from -1.1° → RED

**Color Tiers (Caster):**
- `target-met`: ≤±0.25° from 5.0° → GREEN
- `near-target`: ≤±0.60° from 5.0° → ORANGE
- `off-target`: >±0.60° from 5.0° → RED

**Scenario:**
1. Load data into localStorage with mixed color scenarios
2. Navigate to report page and wait for table to render
3. Query DOM elements to verify they have correct CSS classes for **camber** mode
   - FL with GREEN camber should have `target-met` class
   - FR with ORANGE camber should have `near-target` class
4. Click the "By Caster" radio button
5. Query DOM elements again to verify classes changed for **caster** mode
   - FL with GREEN caster should have `target-met` class (different from camber)
   - FR with RED caster should have `off-target` class
6. Verify that colors actually switched between modes

**Validation Points:**
- Table renders with correct initial CSS classes (camber mode)
- Radio button click event properly registered and updates state
- Table cells re-render with different CSS classes when toggling
- Color changes correspond to correct thresholds for selected mode
- No page reload required—all updates happen dynamically

**Test Files:**
- `color-coding-ui.mjs` - DOM inspection and UI interaction test

### Test: Target Values Validation (Report Page)

**Purpose:** Verify that target camber and caster values are correctly displayed on the report page in multiple locations:
- Chart note text (descriptive paragraph below the main chart)
- Individual target value spans (dynamic elements)
- Chart legend labels (includes actual numeric target values)

This test ensures that target value updates from `constants.js` propagate correctly through the UI and can be visually confirmed.

**What This Test Catches:**
- Target values not being displayed in chart note
- Target values not being displayed in chart legend
- Updated target values not reflecting in the UI
- Dynamic span elements failing to populate
- Disconnect between constants.js values and displayed values

**Test Scenarios:**
1. Extract expected target values from `constants.js` (TARGET_CAMBER, TARGET_CASTER)
2. Load report page with sample wheel data
3. Verify chart note contains target camber value (e.g., "Camber −1.1°")
4. Verify chart note contains target caster value (e.g., "Caster 5.0°")
5. Verify individual spans (#chart-note-camber, #chart-note-caster) populate correctly
6. Verify chart legend includes target values with degrees symbol

**Validation Points:**
- Chart note paragraph (#chart-note) contains both camber and caster target values
- Individual spans accurately display target values from constants
- Target values format matches expectations (e.g., −1.1°, 5.0°)
- Chart legend labels include target values in parentheses
- All values are dynamically rendered, not hardcoded

**Test Files:**
- `target-values-validation.mjs` - Standalone runner

**Why This Matters:**
When developers update TARGET_CAMBER or TARGET_CASTER in constants.js, this test confirms that:
- The values flow through to all UI locations
- The chart displays the correct targets
- No manual HTML updates are needed
- Visual inspection immediately shows if values were updated successfully

### Test: Home Screen - Target Values & Navigation

**Purpose:** Verify that the home screen displays all alignment targets correctly and provides working navigation to other screens.

**Scenario:**
1. Navigate to home page
2. Verify all 5 target values display (camber, caster, toe-front, camber-rear, toe-rear)
3. Verify target values match constants.js values
4. Verify target values have proper format (numeric with degree/mm symbols)
5. Click edit targets button and verify form shows/hides
6. Verify navigation links to Input and Report pages work correctly
7. Verify navigation between pages maintains state

**Validation Points:**
- All 5 alignment targets display with correct formatting
- Edit form visibility toggles correctly
- Navigation links present and functional
- Home page content loads correctly
- Card-based navigation interface renders properly

**Test Files:**
- `home-screen-validation.mjs` - Standalone runner

### Test: Input Screen - Grid Rendering & Structure

**Purpose:** Verify that the input grid renders correctly with proper structure, headers, and accessibility.

**Scenario:**
1. Navigate to input page
2. Verify 13×13 (169) cells render
3. Verify column headers show bolt positions (-6 to +6)
4. Verify row headers show bolt positions (-6 to +6)
5. Verify required positions (−6, −3, 0, +3, +6) have special styling (25 corner cells)
6. Verify each cell has 3 input fields (zero, pos20, neg20)
7. Verify input fields configured for numeric entry
8. Verify grid has proper ARIA role and semantic structure

**Validation Points:**
- Correct cell count (169)
- Header labels match bolt positions
- Required positions highlighted
- Three numeric inputs per cell
- Accessible grid structure with ARIA labels

**Test Files:**
- `input-grid-rendering.mjs` - Standalone runner

### Test: Input Screen - Wheel Management & Data Isolation

**Purpose:** Verify that wheel selector tabs work correctly and data is properly isolated between wheels.

**Scenario:**
1. Navigate to input page with clean storage
2. Verify FL tab is active by default
3. Enter test data into first cell of FL wheel
4. Switch to FR wheel and verify it's empty (data not shared)
5. Enter different test data into FR wheel
6. Switch back to FL and verify original data intact
7. Switch to FR and verify its data still present
8. Reload page and verify both wheel datasets persist

**Validation Points:**
- Wheel tabs switch active state
- FL data doesn't appear in FR grid
- FR data doesn't appear in FL grid
- Switching preserves previously entered data
- Page reload maintains data integrity

**Test Files:**
- `input-wheel-management.mjs` - Standalone runner

### Test: Input Screen - CSV Operations (Save & Load)

**Purpose:** Verify that CSV save and load operations work correctly for data import/export.

**Scenario:**
1. Load sample data into FL wheel
2. Click Save CSV button and verify file downloads
3. Verify CSV has correct headers (Front, Rear, Zero, Pos20, Neg20)
4. Verify CSV has 169 data rows (13×13 grid)
5. Verify CSV contains numeric values
6. Switch to FR wheel
7. Load the saved CSV file into FR wheel
8. Verify FR data loaded correctly
9. Verify both wheels have independent CSV data

**Validation Points:**
- CSV file downloads successfully
- Headers present and correct
- Row count matches 169 positions
- Data contains numeric measurements
- CSV load populates grid correctly
- Wheels maintain independent datasets

**Test Files:**
- `input-csv-operations.mjs` - Standalone runner

### Test: Report Screen - Raw Data Summary Table Rendering

**Purpose:** Verify that the report table renders correctly with proper structure, styling, and focused target indicators.

**Scenario:**
1. Load sample data for FL wheel
2. Navigate to report page
3. Verify table section is visible
4. Verify table header shows rear bolt positions (-6 to +6)
5. Verify table has 13 rows with 169 cells (13×13)
6. Verify each cell displays camber (top) and caster (bottom) values
7. Verify focused indicators appear (only top 3-5 closest matches per metric)
8. Verify blue boxes for camber best matches only
9. Verify green boxes for caster best matches only
10. Verify mixed gradient for cells meeting both metric targets
11. Verify interpolated cells have visual indicator (italic styling)
12. Verify required position cells have special border
13. Verify color coding toggle (By Camber vs By Caster) is present

**Validation Points:**
- Table renders with correct dimensions
- Headers and data properly aligned
- Dual-value display (camber/caster) per cell
- Focused indicators limited to top matches (~10-15 total, not hundreds)
- Color coding buttons functional
- Interpolated and required cells visually differentiated

**Test Files:**
- `report-table-rendering.mjs` - Standalone runner

### Test: Report Screen - Chart Rendering & Interactions

**Purpose:** Verify that the camber & caster vs bolt combination chart renders correctly and responds to user interactions.

**Scenario:**
1. Load sample data for FL and FR wheels
2. Navigate to report page
3. Verify chart section is visible with canvas element
4. Verify chart legend shows target values (camber and caster) with degrees symbol
5. Verify wheel tabs (FL/FR) present in chart section
6. Click FR tab and verify chart data updates
7. Click back to FL and verify data restores
8. Verify chart canvas has proper dimensions
9. Verify chart contains data for both metrics (dual Y-axes design)
10. Verify chart note describes structure (data points, measured vs interpolated)

**Validation Points:**
- Chart canvas renders with proper size
- Legend displays target values
- Wheel tabs present and clickable
- Chart data changes when switching wheels
- Dual-axis chart structure maintained
- Data points properly mapped
- Legend provides helpful context

**Test Files:**
- `report-chart-interactions.mjs` - Standalone runner

Create a test file following this structure:


```javascript
// Test: [Feature Name]
// Purpose: [What it validates]
// Scenario: [Brief description]

test('scenario name', async () => {
  // Setup
  await navigateTo(page, '/input.html');
  
  // Execute
  await setWheelData(page, 'FL', testData);
  
  // Validate
  const stored = await getWheelData(page, 'FL');
  expect(stored).toEqual(testData);
});
```

## Utilities (`utils.js`)

**Navigation & Storage:**
- `navigateTo(page, path)` - Navigate and wait for load
- `setWheelData(page, wheel, data)` - Set localStorage
- `getWheelData(page, wheel)` - Get localStorage
- `clearStorage(page)` - Clear localStorage

**Interaction:**
- `setInputValue(page, selector, value)` - Set input value
- `getInputValue(page, selector)` - Get input value
- `clickButton(page, selector)` - Click element

**Test Data:**
- `generateRandomCamberValues()` - Create test data
- `formatFieldName(fieldName)` - Format field names

## Commands

```bash
# Original tests (data sync & color coding)
npm run test:camber-sync                 # Run camber data sync test (~10 sec)
npm run test:camber-sweep-sync           # Run camber sweep sync test (~10 sec)
npm run test:color-coding-ui             # Run color-coding UI test (~10 sec)
npm run test:target-values               # Run target values validation test (~10 sec)
npm run test:load-sample-data            # Run sample data generation test (~10 sec)
npm run test:combination-chart           # Run chart validation test (~10 sec)

# New comprehensive tests by screen
npm run test:home                        # Home screen test (~15 sec)
npm run test:input-grid                  # Input grid rendering test (~15 sec)
npm run test:input-wheel                 # Input wheel management test (~15 sec)
npm run test:input-csv                   # Input CSV operations test (~20 sec)
npm run test:report-table                # Report table rendering test (~15 sec)
npm run test:report-chart                # Report chart interactions test (~15 sec)

# Test suites
npm run test:all-sync                    # All data sync tests (~20 sec)
npm run test:all-data                    # All data & sample data tests (~30 sec)
npm run test:all-screens                 # All screen-level tests (~80 sec)
npm run test:all-ui                      # ALL tests (~120 sec)

# General
npm run test:integration                 # Run all via Jest (~45 sec)
npm run test:watch                       # Watch mode
npm start                                # Dev server only
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8080 in use | `lsof -i :8080; kill -9 <PID>` |
| Module not found | `rm -rf node_modules && npm install` |
| Browser won't start | Ensure 300MB free disk space |
| Tests timeout | Increase `testTimeout` in `jest.config.js` |

---

**Status:** ✓ Tests passing  
**Setup:** March 28, 2026
