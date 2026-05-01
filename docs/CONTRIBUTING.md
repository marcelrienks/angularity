# CONTRIBUTING — Development Standards & Testing

**MX-5 NC1 Wheel Alignment System**  
Last updated: April 26, 2026

Development setup, testing standards, code style, and contribution guidelines.

---

## Quick Start for Contributors

```bash
# Clone and install
git clone https://github.com/marcelrienks/mx5-nc1.git
cd alignment
npm install

# Run all tests
npm run test:all-sync

# Start dev server
npm run start

# Verify everything works
# ✓ All tests pass
# ✓ Server runs on http://localhost:8080
# → You're ready to code!
```

---

## Test Suite

### Running Tests

```bash
# All tests (33+)
npm run test:all-sync              # ~2-3 min, sequential

# By category
npm run test:home                  # Home page (targets)
npm run test:input-grid            # Input grid rendering
npm run test:input-csv             # CSV import/export
npm run test:report-table          # Report table & charts
npm run test:report-symmetry       # Symmetry analysis
npm run test:report-toe            # Toe integration
npm run test:report-rear-axle      # Rear wheel support
```

### Test Coverage Matrix

| Feature | Tests | Status |
|---------|-------|--------|
| **Home** | Display targets, edit, reset | ✅ Complete |
| **Input** | Grid structure, sample data, isolation | ✅ Complete |
| **CSV** | Export, import, round-trip | ✅ Complete |
| **Report** | Page load, sections, data accuracy | ✅ Complete |
| **Symmetry** | FL/FR matching, tolerance checking | ✅ Complete |
| **Four-Wheel** | FL/FR/RL/RR independence | ✅ Complete |
| **Persistence** | localStorage, page reload survival | ✅ Complete |

### Test Architecture

```
Puppeteer (headless browser automation)
    ↓
Dev Server (localhost:8080)
    ├─ Load pages
    ├─ Interact (click, type)
    ├─ Read DOM elements
    ├─ Inspect localStorage
    └─ Take screenshots
    ↓
Jest Framework
    Assertions validate:
    ├─ DOM structure
    ├─ Element visibility
    ├─ localStorage content
    ├─ Numeric accuracy (±0.01°)
    ├─ Color classes (green/orange/red)
    ├─ File I/O (CSV)
    └─ Cross-page persistence
```

### Configuration

| Setting | Value | Location |
|---------|-------|----------|
| **Server Port** | 8080 | jest-puppeteer.config.js |
| **Browser** | Headless Chrome | jest.config.js |
| **Timeout per test** | 60 seconds | jest.config.js |
| **Navigation timeout** | 30 seconds | jest.config.js |

### Troubleshooting Tests

| Problem | Solution |
|---------|----------|
| Tests hang (30+ sec) | Increase timeout in jest.config.js; verify port 8080 free |
| localStorage not persisting | Verify key names match; check save timing in test |
| Tests pass locally, fail in CI | Ensure node_modules installed; check node version match |
| Chart not rendering | Wait longer for Chart.js initialization; verify script loaded |

---

## Code Style & Conventions

### JavaScript Style

**Use**: ES6+ (const/let, arrow functions, template literals, destructuring)

**Example**:
```javascript
// ✓ Good
const calculateScore = (camberError, casterError) => {
  const weights = { camber: 1.5, caster: 1.0 };
  return (weights.camber * Math.abs(camberError)) + 
         (weights.caster * Math.abs(casterError));
};

// ✗ Avoid
var calculateScore = function(camberError, casterError) {
  return (1.5 * Math.abs(camberError)) + (1.0 * Math.abs(casterError));
};
```

### Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| **Modules** | kebab-case.js | report-engine.js |
| **Functions** | camelCase | calculateScore, loadGrid |
| **Constants** | UPPER_SNAKE_CASE | DEFAULT_CAMBER_TARGET, GRID_SIZE |
| **Classes** | PascalCase | GridCell, MeasurementSet |
| **Private methods** | _camelCase | _validateInput, _buildGrid |
| **Booleans** | is*, has*, can* | isInterpolated, hasData |

### Export Style

```javascript
// ✓ Named exports (preferred)
export function analyzeWheel(data) { ... }
export const DEFAULT_TARGET = -1.1;

// ✗ Default exports (avoid, unless single export)
export default class ReportEngine { ... }
```

### Comment Style

```javascript
// ✓ Meaningful comments (why, not what)
// Use bilinear interpolation to fill sparse grid
// (nearest-neighbor would create discontinuities)
const grid = interpolateGrid(measurements);

// ✗ Obvious comments (what, not why)
// Set grid to interpolateGrid result
const grid = interpolateGrid(measurements);
```

### Error Messages

```javascript
// ✓ Clear, actionable
return {
  error: 'CSV_INVALID_HEADER',
  message: 'CSV header is missing required columns. Expected: front_bolt, rear_bolt, camber_neg20, camber_0, camber_pos20, toe',
  recovery: 'user'
};

// ✗ Vague
return { error: 'ERROR' };
```

---

## Styling & Visual Design

### Color Palette (Semantic)

| Status | Color | Hex | CSS Class | Usage |
|--------|-------|-----|-----------|-------|
| ✓ Green (Good) | Bright Green | #4CAF50 | `.target-met` | Within tolerance |
| ⚠ Orange (Caution) | Amber | #FFA726 | `.near-target` | Acceptable, off-target |
| ✗ Red (Problem) | Bright Red | #EF5350 | `.off-target` | Unacceptable |
| Neutral (UI) | Light Gray | #F5F5F5 | `.bg-neutral` | Backgrounds, borders |
| Text (Dark) | Dark Gray | #333333 | — | Primary text |
| Accent (Link) | Blue | #2196F3 | `.accent` | Links, buttons |

### Display Thresholds (UI Color-Coding)

**Camber** (TARGET = −1.1°):
- 🟢 GREEN: −1.25° to −0.95° (±0.15°)
- 🟠 ORANGE: −1.50° to −0.70° (±0.40°)
- 🔴 RED: Outside ORANGE range

**Caster** (TARGET = 5.0°):
- 🟢 GREEN: 4.75° to 5.25° (±0.25°)
- 🟠 ORANGE: 4.40° to 5.60° (±0.60°)
- 🔴 RED: Outside ORANGE range

**Symmetry** (FL ↔ FR matching):
- 🟢 GREEN: Camber ±0.3° AND Caster ±0.3° (symmetric)
- 🔴 RED: Exceeds symmetry tolerance

### Typography

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333333;
}

h1 { font-size: 28px; font-weight: 600; }  /* Page title */
h2 { font-size: 18px; font-weight: 600; }  /* Section header */
h3 { font-size: 16px; font-weight: 600; }  /* Subsection |
label { font-size: 12px; font-weight: 500; }  /* Form labels */
code { font-size: 12px; font-family: monospace; }  /* Bolt positions */
```

### Layout Patterns

```css
/* Grid page structure */
#page-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

#header { height: 60px; }  /* Navigation */
#main { flex: 1; overflow-y: auto; }  /* Content */
#footer { height: 40px; }  /* Attribution */
```

---

## Module Documentation Checklist

When adding a new module, document with:

- [ ] **Responsibility** (1-2 sentences, purpose)
- [ ] **Inputs** (what data/events accepted)
- [ ] **Outputs** (what results/side-effects produced)
- [ ] **Dependencies** (list of module imports)
- [ ] **Public API** (all exported functions/methods)
- [ ] **Usage Example** (runnable code snippet)
- [ ] **Error Conditions** (failure modes, recovery)
- [ ] **Performance Notes** (benchmarks, complexity)

**Example**:

```markdown
### report-engine.js

**Responsibility**: Calculate three optimization recommendations (best compromise, best camber, best caster).

**Inputs**:
- Interpolated measurement grid (13×13 dense)
- Target camber and caster values

**Outputs**:
- Object with three best positions: bestCell, bestCamberCell, bestCasterCell

**Dependencies**: interpolation, math-utils, constants, error-handler

**Public API**:
```javascript
export function analyzeWheel(gridData) → Result
export function calculateGoldenRuleScore(camberError, casterError) → number
```

**Usage Example**:
```javascript
const result = reportEngine.analyzeWheel(gridData);
console.log(`Best cell: Front ${result.bestCell.front}, Rear ${result.bestCell.rear}`);
```

**Error Conditions**:
- Empty grid → Return all NaN
- Invalid scores → Log warning, fall back to first position

**Performance**: O(169) = ~0.5ms per wheel
```

---

## Adding Tests

### Test File Location

Tests go in `tests/integration/` named `*-validation.mjs`:

```
tests/integration/
├── home-validation.mjs          # Home page tests
├── input-grid-validation.mjs     # Input grid tests
├── input-csv-validation.mjs      # CSV import/export tests
├── report-table-validation.mjs   # Report table tests
├── report-symmetry-validation.mjs  # Symmetry analysis tests
├── report-toe-validation.mjs     # Toe integration tests
└── utils.js                      # Shared helpers
```

### Test Template

```javascript
describe('Feature Name', () => {
  let page;
  let server;

  beforeAll(async () => {
    server = await startServer();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await page.close();
    await server.close();
  });

  test('should do something specific', async () => {
    // Arrange: Set up initial state
    await page.goto('http://localhost:8080/');
    await page.type('#input-field', 'test value');

    // Act: Perform action
    await page.click('#submit-button');
    await page.waitForNavigation();

    // Assert: Verify result
    const result = await page.$('#result-element');
    expect(result).toBeTruthy();
    
    const text = await page.evaluate(() => document.querySelector('#result-element').textContent);
    expect(text).toBe('Expected result');
  });
});
```

### Running Your New Test

```bash
# Add script to package.json:
{
  "scripts": {
    "test:my-feature": "jest tests/integration/my-feature-validation.mjs"
  }
}

# Run it
npm run test:my-feature

# Then add to test:all-sync script
```

---

## Dependency Management

### Adding Dependencies

Use `npm` only for production/build dependencies:

```bash
npm install --save lodash      # Production dependency (goes in bundle)
npm install --save-dev jest    # Dev dependency (test only, not bundled)
```

### Current Dependencies

**Production**:
- Chart.js (charting library)
- Optional: Vite (for bundling, Phase 3b)

**Development**:
- Jest (test runner)
- Puppeteer (browser automation)
- Express (dev server)

**Avoid**: Heavy dependencies that bloat bundle size.

---

## Git Workflow

### Branch Naming

```
feature/add-heatmap          # New feature
bugfix/fix-interpolation     # Bug fix
refactor/clean-report-engine # Refactoring
docs/update-api-reference    # Documentation
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add heatmap visualization
fix: correct bilinear interpolation edge case
refactor: split report-page into smaller components
docs: update API reference for report-engine
test: add tests for four-wheel independence
```

### Pull Request Checklist

Before opening PR:

- [ ] All tests passing: `npm run test:all-sync`
- [ ] Code follows style guide (see above)
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] localStorage keys documented if changed
- [ ] Module dependencies diagram updated if changed

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Page load time** | < 2 seconds | ~1.2s |
| **Grid render** | < 100ms | ~80ms |
| **Report generation** | < 500ms | ~200ms |
| **localStorage write** | < 50ms | ~10ms (with debounce) |
| **Memory usage** | < 50MB | ~25MB |

---

## Accessibility Standards

Aim for WCAG 2.1 Level AA compliance:

- [ ] Keyboard navigation (Tab, Enter, Arrow keys work)
- [ ] Focus indicators (visible on all interactive elements)
- [ ] Color not only indicator (use labels + color)
- [ ] Alt text (on images, if any)
- [ ] Form labels (associated with `<label>` tags)
- [ ] Error messages (clear, in plain language)

---

## Common Development Tasks

| Task | Command / Steps |
|------|-----------------|
| **Start dev server** | `npm run start` |
| **Run all tests** | `npm run test:all-sync` |
| **Run one test** | `npm run test:home` |
| **Debug test** | Add `debugger;` statement, run with `--inspect` |
| **Check code style** | (Manual review, no linter configured) |
| **Generate sample data** | `node js/generate-dummy-data.mjs > examples/sample.csv` |
| **Deploy locally** | `npm run build` (if Vite enabled, Phase 3b) |

---

## Reporting Issues

When reporting a bug, include:

1. **Browser & OS** (e.g., Chrome on macOS)
2. **Steps to reproduce** (exact actions to trigger bug)
3. **Expected vs actual behavior** (what should happen vs what happened)
4. **Screenshots / error logs** (console errors, localStorage state)
5. **Test command** that fails (if applicable)

**Example**:
```
Title: Report page shows wrong camber value
Browser: Firefox 120 on Ubuntu 22.04
Steps:
  1. Enter measurement: Front 0, Rear 0, Camber -1.50°
  2. Navigate to Report page
  3. See displayed camber -1.45° (expected -1.50°)
Console error: (none)
localStorage state: (screenshot attached)
```

---

## Related Documentation

- **How to use the tool**: [GUIDE.md](GUIDE.md)
- **Module APIs**: [API.md](API.md)
- **System architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Algorithm details**: [INTERNALS.md](INTERNALS.md)
- **Deployment**: [OPERATIONS.md](OPERATIONS.md)
