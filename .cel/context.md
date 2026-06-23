# Eccentric Bolt Alignment System — Technical Context

**Last read**: 2026-06-23 (updated for code accuracy)  
**Status**: 95% feature-complete, 207+ tests passing, 4 wheels supported, AWS deployment ready

---

## Project Purpose

Web-based digital analysis tool for home wheel alignment on vehicles with eccentric bolt adjustment (universal concept, works with any eccentric-bolt vehicle). Users:
1. **Capture measurements** at discrete bolt positions (13×13 grid per wheel) across multiple steering angles
2. **Analyze trade-offs** using weighted Golden Rule scoring (camber > caster > balance)
3. **Receive three independent optima** per wheel (best compromise, best camber, best caster)
4. **Find symmetric pair** recommendations for FL/FR wheels

**Key constraint**: All calculations client-side; data never leaves browser. Value symmetry prioritized over bolt symmetry (FL and FR match on alignment values; bolt positions can differ).

---

## Architecture & Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 modules) + HTML5 + CSS3
- **Measurement Input**: 13×13 grid (169 cells per wheel = 13 front positions × 13 rear positions)
- **Steering angles**: Three angles only (−20°, 0°, +20°)
- **Processing**: Bilinear interpolation (fill sparse grid), Golden Rule scoring (three-tier hierarchy)
- **Output**: Three independent optima per wheel (best compromise, best camber, best caster) + FL/FR symmetry analysis
- **Storage**: localStorage (no backend/database)
- **Testing**: Puppeteer integration tests (~149 tests, all passing)
- **Deployment**: AWS S3 + CloudFront

---

## Project Structure

```
alignment/
├── site/                   # HTML pages & CSS
│   ├── index.html         # Home (targets)
│   ├── input.html         # Input (measurements, 13×13 grid)
│   ├── report.html        # Report (analysis & visualization)
│   └── css/shared.css     # Styling
├── js/                    # Business logic (16+ modules)
│   ├── report-engine.js       # Core analysis & Golden Rule scoring
│   ├── interpolation.js       # Bilinear interpolation (fill grid gaps)
│   ├── input-grid.js          # Input UI & localStorage binding
│   ├── report-page.js         # Report orchestration
│   ├── chart-builder.js       # Chart.js wrapper (camber/caster trends)
│   ├── washer-diagram.js      # SVG bolt position visualization
│   ├── table-builder.js       # 13×13 heatmap rendering
│   ├── localstorage-io.js     # Persistence layer
│   ├── csv-io.js              # CSV import/export
│   ├── targets-manager.js     # User alignment targets
│   ├── math-utils.js          # Vector math utilities
│   ├── error-handler.js       # Error handling patterns
│   └── ... (5+ more utilities)
├── tests/                 # 149 Puppeteer integration tests
├── wiki/                  # Technical documentation
├── package.json
└── server.js              # Dev web server (Node.js)
```

---

## Key Workflows

### Input → Analysis → Report Pipeline

1. **User enters measurements** in 13×13 grid (two steering angles, multiple bolt positions)
2. **Auto-save to localStorage** on every cell change (debounce for performance)
3. **User navigates to report page**
4. **Load from localStorage** + **interpolate sparse grid** (bilinear interpolation)
5. **Analyze each wheel** separately:
   - Calculate camber (average of three steering angles)
   - Calculate caster (camber delta across ±20° steering)
   - Score each position using Golden Rule (3-tier hierarchy)
   - Extract three optima: bestCell, bestCamberCell, bestCasterCell
6. **Symmetry analysis** (find matching FL/FR configurations)
7. **Render results** (heatmap table, camber/caster charts, eccentric bolt diagrams, recommendations)

### Three Independent Optima (Per Wheel)

Each wheel analysis returns three bolt position recommendations to handle camber/caster coupling:

- **bestCell**: Balanced compromise (weighted: 1.5× camber, 1.0× caster)
- **bestCamberCell**: Camber-prioritized (minimize |camber − target|)
- **bestCasterCell**: Caster-prioritized (minimize |caster − target|)

**Why three?** Eccentric bolt adjustment couples camber and caster; moving a bolt affects both simultaneously. No single position optimizes both. Show the trade-off spectrum.

### Eccentric Bolt Coupling

Two bolts per wheel (front, rear), each adjustable −6 to +6 positions = **13×13 grid (169 configurations)**.  
Each configuration produces one camber value and one caster value. Physical constraint: trade-off always required.

---

## Key Algorithms

### 1. Bilinear Interpolation (Fill Sparse Grid)

**Problem**: User measures ~30–100 positions out of 169.  
**Solution**: Interpolate linearly on each axis using nearest measured neighbors.  
**Edge cases**: Handles single measurements (nearest-neighbor), edge extrapolation, sparse data.  
**Impact**: Enables Golden Rule scoring across full 13×13 grid; marks interpolated cells for debugging.

### 2. Caster Calculation (Trigonometric Steering Geometry)

**Input**: Two camber readings at different steering angles (ACW and CW), steering ratio or wheel degrees.

**Formula**: 
```
multiplier = 1 / (2 × sin(theta_radians))
caster = multiplier × |camber_acw - camber_cw|
```

Where `theta` = effective wheel angle (either from steering ratio or explicit wheel degrees).

**Impact**: Correctly models steering geometry; flexible for different vehicle setups.

### 3. Golden Rule Scoring (Three-Tier Hierarchy)

**Tier 1 — Camber Lock**:  
If |camber error| > 1.0°, heavily penalize (score = 100+).

**Tier 2 — Conditional Caster**:  
If |camber error| ≤ 0.5° AND |caster error| > 0.4°, weight caster 3×.

**Tier 3 — Balanced Weighting**:  
Default: `score = (1.5 × |camber_error|) + (1.0 × |caster_error|)` + optional toe component.

**Impact**: Prioritizes camber accuracy (tire wear), then caster if camber is already good.

### 4. Symmetry Search (Compare Complete Configurations)

**Problem**: Find FL/FR bolt positions that match alignment values within tolerance.  
**Solution**: Brute-force grid search (169 × 169 = 28,561 comparisons per axle), find pair with lowest combined error.  
**Tolerance**: ±0.3° for both camber and caster (configurable).  
**Output**: Two recommendations (one per wheel) + matchType ("symmetric" or "asymmetric").

---

## Module Responsibilities (18 JS Modules)

### Data Layer (Persistence & Format)
| Module | Purpose |
|--------|---------|
| `constants.js` | Config: targets, thresholds, bolt range, steering geometry, physical constants |
| `localstorage-io.js` | Persistence: read/write localStorage, caching, result aggregation, session state |
| `csv-io.js` | CSV import/export; file I/O |
| `targets-manager.js` | Target values per wheel; acceptable error ranges |

### Calculation Layer (Analysis & Algorithms)
| Module | Purpose |
|--------|---------|
| `report-engine.js` | Golden Rule scoring, three optima per wheel, symmetry analysis |
| `interpolation.js` | Bilinear interpolation (fill 13×13 grid gaps) |
| `math-utils.js` | Camber/caster derivation, steering geometry, error calculations |
| `measurement-utils.js` | Measurement validation, density analysis, range determination |

### Presentation Layer (UI & Rendering)
| Module | Purpose |
|--------|---------|
| `input-grid.js` | Input sheet: grid rendering, cell editing, auto-save |
| `report-page.js` | Report orchestration: load data, coordinate rendering, handle events |
| `report-ui.js` | Shared UI utilities: table building, buttons, sections, panels |
| `chart-builder.js` | Chart.js wrapper: camber/caster line charts |
| `washer-diagram.js` | SVG rendering: eccentric bolt position diagrams |
| `washer-math.js` | Geometric calculations for diagram positioning |

### Utilities & Support
| Module | Purpose |
|--------|---------|
| `error-handler.js` | Input validation, error recovery strategies |
| `server.js` | Development web server (Node.js) |
| `dummy-data-generator.mjs` | Sample alignment data for testing |

---

## Critical Data Flow

```
User Input (cell edit)
    ↓ (every keystroke)
    ├─ Validate (range, type)
    ├─ Update UI grid
    └─ Debounce → localStorage write (500ms)

User Loads Report Page
    ↓
    ├─ Load gridState from localStorage
    ├─ Interpolate sparse grid (bilinear)
    ├─ Analyze FL wheel:
    │   ├─ Camber = avg(neg20, zero, pos20)
    │   ├─ Caster = (neg20 − pos20) / 40°
    │   ├─ Score each position (Golden Rule)
    │   └─ Extract bestCell, bestCamberCell, bestCasterCell
    ├─ Analyze FR wheel (same)
    ├─ Symmetry search (find matching pair)
    └─ Render all sections (table, charts, diagrams, recommendations)
```

---

## Open Issues (From wiki/todo.md)

1. **Front-left caster sign convention**: Verify calculated caster sign matches physical measurements (both wheels use same trigonometric formula).
2. **Toe analysis**: Captured but not analyzed (Phase 2 work).
3. **Documentation**: Updated to reflect actual code; architecture diagrams fixed (March 2026).

---

## Performance Notes

### Known Optimizations Needed

1. **localStorage Debouncing** (HIGH): JSON.stringify on every keystroke (~100/min during active editing). Implement 500ms debounce to reduce 50–80%.
2. **Double-Sort Fix** (MEDIUM): Grid processed twice (sorts for camber and caster separately). Single sort + extract both = 2× faster.

### Bottlenecks Identified

- Bilinear interpolation: O(n²) for sparse grid, acceptable at 13×13
- Symmetry search: O(169²) = ~28k comparisons per report, <10ms on modern hardware
- UI rendering: Chart.js + table rendering, acceptable for single report page

---

## Test Coverage

**149 Puppeteer integration tests** covering:
- Input validation, localStorage persistence, CSV import/export
- Grid interpolation correctness
- Golden Rule scoring logic
- Symmetry analysis pair matching
- Report rendering (charts, tables, diagrams)
- Edge cases (empty grids, single measurement, sparse data)

**Run**: `npm run test:all-sync`

---

## Documentation Map

| File | Purpose |
|------|---------|
| `README.md` | Quick start, workflow example, deployment facts, common issues |
| `wiki/architecture.md` | System design, module layers, data flow, 4-tier architecture, visual diagrams |
| `wiki/internals.md` | Algorithm deep-dives (bilinear interpolation, Golden Rule, symmetry), error handling, debugging patterns |
| `wiki/todo.md` | Open blockers (FL caster sign, steering angle API, cleanup tasks) |

---

## Phase Roadmap

**Phase 1 (Current, 95% complete)**:
- Four wheels (FL, FR, RL, RR)
- Camber + Caster measurement & analysis
- Front and rear eccentric bolt adjustment
- Toe measured but not analyzed
- Configurable steering geometry (steering ratio or wheel degrees)

**Phase 2 (Planned)**:
- Toe analysis for all four wheels
- Front-rear thrust angle alignment
- Advanced symmetry analysis (axle pairs)

**Phase 3 (Future Ideas, Not Committed)**:
- Preset strategy sets (compare multiple configs)
- 3D visualization export
- Mobile app (camera-based measurement)
- Alignment shop tool integration

---

## Hashes (for change detection)

```
README.md = 258e6822ad5700f9aec19a4657fcdbb0
wiki/architecture.md = 1d23144209f15e17163224e0e09f632c
wiki/internals.md = 1c0b44e537b3e906696b2465fe1e4584
wiki/todo.md = c5db0f3578c2a340f0b198a60b98908f
```

---

## Next Steps for Development

1. **Resolve FL caster sign** → physical measurement verification
2. **Test custom steering angles** → API design & implementation
3. **Performance**: Implement debouncing + double-sort fix
4. **Phase 2 prep**: Four-wheel architecture design
5. **Test suite**: Verify 149 tests still passing (`npm run test:all-sync`)
