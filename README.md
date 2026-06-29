# Eccentric Bolt Alignment System

**Web-based digital analysis tool for home wheel alignment on vehicles with eccentric bolt adjustment.**

> **Status**: 95% Feature-Complete — Phase 1 (FL/FR, camber + caster) ready; 149 integration tests passing

---

## What It Does

1. **Capture measurements** at multiple eccentric bolt positions (13×13 grid per wheel)
2. **Analyze trade-offs** using weighted scoring (camber vs caster)
3. **Recommend optimal bolt positions** that balance alignment values and symmetry
4. **Provide measurement procedures** for caster (steering sweep), camber (digital gauge)

## Key Design Decisions

- **Value Symmetry, Not Bolt Symmetry** — FL and FR match on alignment values; bolt positions can differ
- **Three Independent Optima** — Each wheel shows: best compromise + best camber + best caster
- **Client-Side Only** — All calculations in browser; data never leaves your machine
- **Discrete Grid** — 13×13 represents physical detents (169 combinations per wheel)
- **Universal Concept** — Works with any eccentric-bolt vehicle (BMW E30/E36, Honda Civic, Nissan S13/S14, Mazda MX-5, etc.)

---

## Quick Start

### Install & Run

```bash
git clone https://github.com/marcelrienks/angularity.git
cd angularity
npm install
npm run start
```

Server: `http://localhost:8080`

### Run Tests

```bash
npm run test:all-sync    # All 149 tests
```

---

## Workflow Example

```
1. MEASURE (on your car)
   ├─ Set steering angle to −20°
   ├─ Adjust camber bolt to position −6, read camber value
   ├─ Move to caster bolt +3, read camber value again
   └─ Repeat at 0° and +20° steering angles
   
2. INPUT (in browser at http://localhost:8080/input.html)
   ├─ Select FL wheel
   ├─ Enter measured camber values into grid cells
   ├─ Auto-saves to browser storage
   └─ Repeat for FR wheel
   
3. REPORT (navigate to http://localhost:8080/report.html)
   ├─ View heatmap: which bolt positions are best?
   ├─ See three options: best compromise, best camber, best caster
   ├─ Check FL vs FR symmetry analysis
   └─ Get final recommendation: "Try Camber Bolt +1, Caster Bolt −2"
   
4. ADJUST (back on your car)
   ├─ Loosen eccentric bolts
   ├─ Move to recommended positions
   ├─ Torque down, re-measure camber/caster
   └─ Done (or repeat if needed)
```

---

## Project Structure

```
alignment/
├── site/                   # HTML pages & CSS
│   ├── index.html         # Home (targets)
│   ├── input.html         # Input (measurements)
│   ├── report.html        # Report (analysis)
│   └── css/shared.css     # Styling
├── js/                    # Business logic (16+ modules)
│   ├── report-engine.js   # Core algorithms
│   ├── constants.js       # Configuration
│   ├── error-handler.js   # Error handling
│   └── ... (13+ more)
├── tests/                 # 149 integration tests
├── wiki/                  # Technical documentation
└── package.json
```

---

## Documentation

| Audience | Start Here | What's In It |
|----------|-----------|-------------|
| **Developers** | [wiki/architecture.md](wiki/architecture.md) | System design, algorithms, data flow, module structure |
| | [wiki/internals.md](wiki/internals.md) | Algorithm deep-dives, interpolation math, debugging |
| **All** | [wiki/](wiki/) | Complete reference (3 focused docs) |

---

## Key Facts

- **MVP Status**: 95% feature-complete (Phase 1: front wheels FL/FR, camber + caster; Toe in Phase 2)
- **Test Coverage**: 149 Puppeteer integration tests (all passing)
- **Architecture**: Browser-based, no server/database
- **Deployment**: AWS S3 + CloudFront
- **Data Privacy**: All data stays in your browser
- **Configurable Targets**: Set alignment goals per vehicle (example: Caster 5.0°, Camber −1.1° front)

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Tests hang | Increase timeout in jest.config.js; verify port 8080 free |
| localStorage not persisting | Check browser privacy settings |
| JSON import fails | Verify JSON structure matches exported format (see [wiki/internals.md](wiki/internals.md)) |

---

**Questions?** See [wiki/architecture.md](wiki/architecture.md) for design deep-dives, or [wiki/internals.md](wiki/internals.md) for algorithm details.

**Repository**: https://github.com/marcelrienks/angularity
