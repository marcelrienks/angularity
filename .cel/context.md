# Eccentric Bolt Alignment System — Technical Context

**Last read**: 2026-06-23  
**Status**: MVP complete, 149 integration tests passing, AWS deployment ready

---

## Project Purpose

Web-based digital analysis tool for home wheel alignment on vehicles with eccentric bolt adjustment (MX-5 NC1 & universal). Captures measurements at discrete bolt positions (13×13 grid per wheel), analyzes trade-offs using weighted scoring, recommends optimal configurations, provides visualization.

**Key constraint**: All calculations client-side; data never leaves browser.

---

## Architecture & Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules) + HTML5 + CSS3
- **Measurement Input**: 13×13 grid (169 cells) per wheel, three steering angles (±20°, 0°)
- **Processing**: Bilinear interpolation (fill sparse grid), Golden Rule scoring (camber > caster > balance)
- **Output**: Three independent optima (best compromise, best camber, best caster) per wheel
- **Storage**: localStorage (no backend/database)
- **Testing**: Puppeteer integration tests (~149 tests)
- **Data persistence**: CSV import/export, localStorage session backup

---

## Project Structure

```
alignment/
├── site/               # HTML pages & CSS
│   ├── index.html     # Home (target alignment values)
│   ├── input.html     # Input grid (measurements)
│   ├── report.html    # Report (analysis & visualization)
│   └── css/shared.css # Styling
├── js/                # Business logic (17 modules)
│   ├── report-engine.js   # Core analysis & scoring
│   ├── input-grid.js      # Input UI & localStorage binding
│   ├── report-page.js     # Report orchestration
│   ├── chart-builder.js   # Chart.js wrapper (camber/caster trends)
│   ├── washer-diagram.js  # SVG bolt position visualization
│   ├── table-builder.js   # 13×13 heatmap rendering
│   ├── localstorage-io.js # Persistence layer
│   ├── csv-io.js          # CSV import/export
│   ├── interpolation.js   # Fill grid gaps (bilinear)
│   ├── constants.js       # Targets, thresholds, config
│   ├── targets-manager.js # User alignment targets
│   ├── math-utils.js      # Vector math utilities
│   └── ... (7+ more)
├── tests/            # 149 Puppeteer integration tests
├── docs/             # Archived documentation (deprecated, move to wiki/)
├── wiki/             # Primary documentation (ARCHITECTURE, INTERNALS, TODO)
└── package.json
```

---

## Key Workflows

### Input → Analysis → Report Pipeline

1. **User enters measurements** in 13×13 grid (FL, FR wheels)
2. **Auto-save to localStorage** on every cell change
3. **User navigates to report page**
4. **Load from localStorage** + interpolate sparse grid (bilinear)
5. **Analyze each wheel** (Golden Rule scoring → 3 optima)
6. **Symmetry analysis** (find matching FL/FR configurations)
7. **Render results** (table, charts, diagrams, recommendations)

### Three Independent Optima

Each wheel analysis returns three bolt position recommendations:
- **bestCell**: Balanced (camber weight 1.5×, caster weight 1.0×)
- **bestCamberCell**: Camber-prioritized (minimize |camber − target|)
- **bestCasterCell**: Caster-prioritized (minimize |caster − target|)

### Eccentric Bolt Coupling

Two bolts per wheel (front, rear) each −6 to +6 positions = 13×13 grid (169 configurations).
Each configuration produces both camber and caster values.
Physical constraint: Can't adjust one metric independently; always a trade-off.

---

## Key Algorithms

### 1. Bilinear Interpolation (Fill Sparse Grid)

**Problem**: User measures ~30–100 positions, need all 169 filled  
**Solution**: Weighted average of 4 nearest corners (normalized distance weighting)  
**Impact**: Enables Golden Rule scoring across full grid

### 2. Golden Rule Scoring

**Three-Tier Hierarchy**:
- Tier 1: Camber lock — reject if |error| > 1.0°
- Tier 2: Conditional caster — if |camber error| ≤ 0.5°, weight caster 3×
- Tier 3: Default balance — score = (1.5 × |camber_error|) + (1.0 × |caster_error|)

**Output**: Ranked configurations per wheel

### 3. Symmetry Search

**Problem**: Find FL/FR bolt positions that match alignment values within tolerance  
**Solution**: Grid search (169 × 169 = 28,561 comparisons), find pair with lowest combined error  
**Tolerance**: ±0.3° for both camber and caster

---

## Documentation Map

| Path | Purpose |
|------|---------|
| `README.md` | Quick start, project overview, facts |
| `wiki/architecture.md` | System design, module layers, data structures, algorithms |
| `wiki/internals.md` | Algorithm deep-dives, interpolation math, error handling, debugging |
| `wiki/todo.md` | Current blockers (FL caster calculation, steering angle handling) |

---

## Open Issues

From `wiki/todo.md`:
1. **Front-left caster calculation**: FL wheel steering orientation opposite to FR (CCW vs CW). Sign flip needed?
2. **Steering angle range**: System assumes ±20° symmetric. Custom angles (±10°, ±30°) supported?
3. **Documentation cleanup**: Move docs/ → wiki/, verify all cross-references, archive safely

---

## Hashes (for change detection)

```
README.md = 67297c99eb6df8036996485eb290d7ea
wiki/architecture.md = c8357655c63fde8b85d75e3f6929f3c7
wiki/internals.md = 4e2203045863d2a8253f85316f6db9a3
wiki/todo.md = 72c1e639b34659b918274fef8da0b22f
```

---

## Next Steps for Development

1. **Fix FL caster sign** → test against physical measurements
2. **Clarify steering angle API** → test custom angles, update algorithm if needed
3. **Archive docs/ safely** → keep wiki/ as source of truth
4. **Verify wiki cross-references** → ensure all links work
5. **Run test suite** → `npm run test:all-sync` (verify 149 tests still pass)
