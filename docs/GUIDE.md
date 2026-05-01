# GUIDE — How to Use & Develop the Alignment System

**MX-5 NC1 Wheel Alignment System**  
Last updated: April 26, 2026

---

## Quick Navigation

- **I'm a mechanic** → [Using the Tool](#using-the-tool) (10 min)
- **I'm a developer** → [Development Tasks](#development-tasks) (5–30 min)
- **Something's not working** → [Troubleshooting](#troubleshooting) (10 min)

---

## Using the Tool

### Installation (5 minutes)

```bash
git clone https://github.com/marcelrienks/mx5-nc1.git
cd alignment
npm install
```

### Start the Application

```bash
npm run start
# Server running on http://localhost:8080
# Pages available:
#   http://localhost:8080/               (Home - Targets)
#   http://localhost:8080/input.html     (Input - Measurements)
#   http://localhost:8080/report.html    (Report - Analysis)
```

### Workflow: From Measurements to Recommendations

#### Step 1: Set Your Target Alignment (Home Page)

1. Navigate to `http://localhost:8080/`
2. View or edit your target alignment values:
   - Target Camber (default: −1.1°)
   - Target Caster (default: 5.0°)
   - Target Toe (default: 0.10 mm)
3. Click "Save" to persist, or "Reset" to restore defaults
4. Values auto-save to browser localStorage

**Tip**: Target values should match your vehicle's specs or your desired setup. Typical MX-5 targets: Camber −1.1°, Caster 5.0°.

#### Step 2: Enter Measurements (Input Page)

1. Navigate to `http://localhost:8080/input.html`
2. Select your wheel: FL (Front Left), FR (Front Right), RL (Rear Left), RR (Rear Right)
3. Enter camber values in the 13×13 grid:
   - **Rows**: Front bolt position (−6 to +6)
   - **Columns**: Rear bolt position (−6 to +6)
   - **Each cell**: Camber value at 0° steering angle
4. Each cell also requires three steering angle readings:
   - **0° steering**: Your main measurement
   - **−20° steering**: For caster calculation
   - **+20° steering**: For caster calculation

**Example workflow**:
```
1. Set front bolt to position -1, rear bolt to position +2
2. Measure camber at three steering angles:
   - At -20° steering: 1.45°
   - At 0° steering: 1.50°
   - At +20° steering: 1.48°
3. Enter 1.50 in the grid (system uses all three for caster)
4. Press Tab or click next cell to auto-save to localStorage
```

**Grid layout**:
```
           Rear Bolt Position →
           −6  −5  −4  −3  −2  −1   0  +1  +2  +3  +4  +5  +6
Front
Bolt  −6  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
      −5  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
      ...
       0  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [*]  [ ]  [ ]  [ ]  [ ]  [ ]  ← Center
      ...
      +6  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]  [ ]
```

#### Step 3: Import Sample Data (Optional)

1. On Input page, click "Load Sample Data"
2. System pre-populates the grid with realistic measurement patterns
3. Useful for testing without manual entry
4. Can then modify specific cells to experiment

#### Step 4: Export Measurements for Backup

1. On Input page, click "Export to CSV"
2. Browser downloads `alignment-FL.csv` (or FR/RL/RR)
3. Save file locally for backup or sharing
4. Format: `front_bolt, rear_bolt, camber_neg20, camber_0, camber_pos20, toe`

**Example CSV**:
```csv
front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20,toe
-6,-6,-1.50,-1.48,-1.45,
-6,-5,-1.42,-1.40,-1.38,
-6,-4,-1.35,-1.32,-1.30,0.05
...
+6,+6,-0.95,-0.92,-0.90,
```

#### Step 5: Generate Report & Get Recommendations (Report Page)

1. Navigate to `http://localhost:8080/report.html`
2. Report automatically loads your measurements from localStorage
3. System shows:
   - **Raw Data Summary**: All 169 cells in your grid
   - **Data Charts**: Camber and caster curves across bolt positions
   - **Washer Diagram**: Visual representation of your three recommended positions
   - **Symmetry Analysis**: Compare FL ↔ FR alignment (if both wheels measured)

#### Step 6: Interpret the Three Recommendations

The report shows three optimization options:

1. **Best Compromise (bestCell)**
   - Balances camber and caster equally
   - Front bolt position: X
   - Rear bolt position: Y
   - Resulting camber: Z°
   - Resulting caster: W°
   - **Use this if**: You want a balanced setup

2. **Best Camber (bestCamberCell)**
   - Optimizes for camber accuracy
   - Sacrifices some caster accuracy if needed
   - **Use this if**: Tire wear is your priority

3. **Best Caster (bestCasterCell)**
   - Optimizes for caster accuracy
   - Sacrifices some camber accuracy if needed
   - **Use this if**: Handling feel is your priority

**Color coding in charts**:
- 🟢 **Green**: Within target tolerance (good)
- 🟠 **Orange**: Acceptable but off-target (caution)
- 🔴 **Red**: Unacceptable alignment (problem)

#### Step 7: Adjust Bolts Based on Recommendations

1. For each wheel, note the recommended bolt positions
2. Physically adjust the front and rear eccentric bolts to match
3. Re-measure alignment at your chosen position
4. Enter new measurement in the grid to verify

---

## Development Tasks

### Running Tests

```bash
# All tests
npm run test:all-sync        # Runs all 33+ tests (~2-3 min)

# Specific test suites
npm run test:home            # Home page tests
npm run test:input-grid      # Input grid tests
npm run test:input-csv       # CSV import/export tests
npm run test:report-table    # Report table tests
npm run test:report-symmetry # Symmetry analysis tests
npm run test:report-toe      # Toe integration tests
```

### Common Development Tasks

| Task | File(s) | Command |
|------|---------|---------|
| Modify measurement input | `js/input-grid.js` | Edit → `npm run test:input-grid` |
| Change analysis algorithm | `js/report-engine.js` | Edit → `npm run test:report-table` |
| Add UI visual | `site/report.html` + `site/css/shared.css` | Edit → manual browser test |
| Update target values | `js/constants.js` | Edit → `npm run test:home` |
| Add new test | `tests/integration/` | Create file → add npm script → `npm run test:all-sync` |
| Fix error handling | `js/error-handler.js` | Edit → test in browser console |

### Modifying the Algorithm

**File**: `js/report-engine.js`

Key functions:
- `analyzeWheel(gridData)` — Main entry point
- `calculateThreeOptima(gridData)` — Computes best compromise/camber/caster
- `calculateGoldenRuleScore(camberError, casterError)` — Scoring function
- `findSymmetricPair(flData, frData)` — Matches left/right wheels

**Workflow**:
```
1. Edit function in report-engine.js
2. Run related tests: npm run test:report-table
3. If tests pass, manually verify in browser at http://localhost:8080/report.html
4. Check values against test expectations
```

### Adding a New Module

1. Create `js/new-module.js` with exports
2. Add to appropriate layer (see [ARCHITECTURE.md](ARCHITECTURE.md) for layers)
3. Add tests in `tests/integration/` or `tests/unit/`
4. Update [API.md](API.md) with module documentation
5. Update dependency matrix if it adds/removes dependencies
6. Run `npm run test:all-sync` to verify no regressions

### Debugging Common Issues

#### localStorage Not Persisting

**Symptom**: Data disappears when you reload page

**Causes**:
1. Browser privacy mode (incognito) → localStorage disabled
2. Browser storage quota exceeded
3. Browser privacy settings block storage

**Fix**:
1. Try normal (non-incognito) browser window
2. Clear browser cache: DevTools → Application → Storage → Clear site data
3. Check browser console for storage errors: F12 → Console tab

#### CSV Import Failing

**Symptom**: "CSV header is missing required columns" error

**Check**:
1. Verify CSV header matches exactly: `front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20,toe`
2. Check for extra spaces: `front_bolt, rear_bolt` (space after comma) → ❌ Invalid
3. Verify data types:
   - Bolt positions: integers (−6 to +6)
   - Camber values: decimals (−3.0 to +3.0)
   - Toe: decimal or empty

**Example Valid CSV**:
```csv
front_bolt,rear_bolt,camber_neg20,camber_0,camber_pos20,toe
-1,+2,1.45,1.50,1.48,0.05
0,-1,1.35,1.40,1.38,
```

#### Report Page Blank or "Error Loading Report"

**Symptom**: Report page shows nothing or error message

**Causes**:
1. No measurements entered yet → grid is empty
2. localStorage corrupted → data unreadable
3. Browser console has JavaScript errors

**Fix**:
1. Go to Input page and enter some measurements
2. Clear browser cache and reload
3. Check browser console (F12 → Console) for errors
4. If errors present, report them (see [Troubleshooting](#troubleshooting))

---

## Troubleshooting

### Tests Hang or Timeout

**Symptom**: `npm run test:all-sync` runs but seems frozen for > 30 seconds

**Causes**:
1. Port 8080 in use by another process
2. Jest timeout too short
3. Disk I/O slow (network drive, external USB)

**Fix**:
```bash
# Check if port 8080 is in use
lsof -i :8080

# Kill process using port 8080
kill -9 <PID>

# Or change port in jest-puppeteer.config.js:
# serverOptions: { port: 9000 }

# Increase Jest timeout in jest.config.js:
# testTimeout: 60000  // 60 seconds
```

### Tests Pass Locally, Fail in CI/CD

**Causes**:
1. Node version mismatch (CI uses different version)
2. Missing dependencies (npm install didn't run)
3. Different environment (Linux vs macOS vs Windows)

**Fix**:
```bash
# Verify node version matches CI config
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run tests again
npm run test:all-sync
```

### Chart Not Rendering

**Symptom**: Report page shows empty chart area

**Causes**:
1. Chart.js library not loaded
2. Browser canvas not supported
3. Data missing or malformed

**Fix**:
1. Check browser console (F12) for errors
2. Verify Chart.js is loaded: DevTools → Network tab → search "chart"
3. Check that measurements exist: navigate to Input page, verify data present

### Symmetry Panel Shows "No Symmetric Pair Found"

**Symptom**: Report shows "FL/FR values do not match within tolerance"

**Causes**:
1. Wheels have different measurement quality (one more complete than other)
2. Wheels genuinely don't match (different suspension, damage, or targets)
3. Measurements incomplete for one wheel

**Fix**:
1. Verify both wheels have at least 10–15 measurements entered
2. Check target values are reasonable (see [Using the Tool](#using-the-tool))
3. Enter additional measurements to improve grid density
4. Re-export and re-import data to ensure consistency

### "Storage Quota Exceeded" Error

**Symptom**: localStorage save fails with quota error

**Causes**:
1. Browser localStorage quota (typically 5–10 MB) exceeded
2. Too many other sites' data stored in same browser

**Fix**:
```bash
# Clear site data
# In browser: DevTools → Application → Storage → Select your origin → Clear site data

# Or reduce data:
# - Export measurements to CSV and clear old sessions
# - Use separate browser profile for different projects
```

---

## Keyboard Shortcuts & Tips

### Input Grid Shortcuts

| Key | Action |
|-----|--------|
| **Tab** | Move to next cell, auto-save |
| **Shift+Tab** | Move to previous cell, auto-save |
| **Arrow keys** | Navigate between cells |
| **Enter** | Save cell and move down |
| **Escape** | Cancel edit, discard changes |

### Browser DevTools Tips

| Task | How |
|------|-----|
| **Inspect localStorage** | F12 → Application → Storage → localStorage → select origin |
| **View network requests** | F12 → Network → perform action → see requests |
| **Debug JavaScript** | F12 → Sources → set breakpoint → reload |
| **Monitor console** | F12 → Console → watch for errors |
| **Check performance** | F12 → Performance → record → perform action → analyze |

---

## Related Documentation

- **Module reference & APIs**: [API.md](API.md)
- **System architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Production deployment**: [OPERATIONS.md](OPERATIONS.md)
- **Testing standards**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Algorithm details**: [INTERNALS.md](INTERNALS.md)
