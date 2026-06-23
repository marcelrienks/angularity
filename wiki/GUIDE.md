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

### Quick Workflow (7 Steps)

1. **Home**: Set target alignment (Camber −1.1°, Caster 5.0°) → Click Save
2. **Input**: Enter camber measurements in 13×13 grid per wheel (FL/FR/RL/RR)
   - Each cell: three steering angles (−20°, 0°, +20°)
   - Auto-saves to localStorage on each entry
3. **Optional**: Load sample data or import CSV for quick testing
4. **Optional**: Export to CSV for backup
5. **Report**: Navigate to report page → system analyzes measurements
6. **Interpret**: Three bolt position recommendations shown (best compromise, best camber, best caster)
7. **Adjust**: Physically adjust bolts to match recommendation, re-measure to verify

For detailed step-by-step instructions, see [ARCHITECTURE.md](ARCHITECTURE.md) § Input/Report Screen Architecture.

**Grid layout**: 13×13 (rows = front bolt −6 to +6, columns = rear bolt −6 to +6)

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

- **System architecture & design**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Algorithm deep-dives**: [INTERNALS.md](INTERNALS.md)
- **Current blockers**: [todo.md](todo.md)
