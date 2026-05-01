# MX-5 NC1 Wheel Alignment System

**A web-based digital analysis tool for DIY home mechanics to optimize MX-5 wheel alignment.**

Latest update: April 26, 2026 | Status: MVP Complete | 33+ integration tests passing

---

## Quick Navigation

### 🚀 I want to...

| Goal | Document | Time |
|------|----------|------|
| **Use the tool** (enter measurements, get recommendations) | [GUIDE.md](GUIDE.md) | 5–10 min |
| **Understand how it works** (architecture, design decisions) | [ARCHITECTURE.md](ARCHITECTURE.md) | 15–20 min |
| **Deploy to production** (AWS S3 + CloudFront setup) | [OPERATIONS.md](OPERATIONS.md) | 30–45 min |
| **Develop or extend** (module reference, APIs, testing) | [API.md](API.md) + [CONTRIBUTING.md](CONTRIBUTING.md) | 30–60 min |
| **Troubleshoot production issues** (monitoring, rollback) | [OPERATIONS.md § Troubleshooting](OPERATIONS.md#troubleshooting) | 10–15 min |
| **Dive into algorithms** (interpolation, three optima, scoring) | [INTERNALS.md](INTERNALS.md) | 20–30 min |

---

## What This System Does

1. **Capture measurements** — Enter camber/caster values across a 13×13 bolt position grid
2. **Analyze trade-offs** — Find three optimization options (best compromise, best camber, best caster)
3. **Recommend bolt positions** — See visual bolt diagrams with precise position recommendations
4. **Match left/right wheels** — Ensure symmetric alignment values across FL/FR (and RL/RR)
5. **Import/export data** — Save measurements to CSV, share with others, import previous sessions

**All processing happens in your browser** — no server backend, no cloud storage, all data stays local.

---

## Key Concepts (30-second overview)

### Eccentric Bolt Adjustment
Your MX-5 has two adjustable bolts per wheel (front and rear). Each can be moved in 13 discrete positions (−6 to +6). Total: 13×13 = 169 possible bolt position combinations per wheel.

### Three Optima Per Wheel
Camber and caster are coupled—moving one affects both. You can't optimize for both equally. So the system shows:
- **bestCell** — Best compromise (balances both)
- **bestCamberCell** — Optimize for camber accuracy
- **bestCasterCell** — Optimize for caster accuracy

**You choose** which matters most for your driving style.

### Value Symmetry, Not Bolt Symmetry
Your FL and FR wheels can use *different bolt positions* as long as their final camber/caster values match within ±0.3°. Example:
```
FL: Front -1, Rear +2  →  Camber -1.10°, Caster 5.05°
FR: Front +0, Rear +1  →  Camber -1.10°, Caster 5.05°
Different bolts, symmetric values ✓
```

---

## For Different Users

### 👨‍🔧 Mechanics / DIY Users
**Start here**: [GUIDE.md](GUIDE.md)
- How to enter measurements
- Reading the recommendations
- Understanding the three optima
- Importing sample data
- Exporting for backup

### 👨‍💻 Developers
**Start here**: [API.md](API.md)
- Module reference (all 21 modules)
- Function signatures and examples
- Error handling patterns
- Dependency map

Then read: [CONTRIBUTING.md](CONTRIBUTING.md) for testing and development standards.

### 🏗️ DevOps / Deployment
**Start here**: [OPERATIONS.md](OPERATIONS.md)
- AWS S3 + CloudFront setup
- GitHub Actions CI/CD
- Monitoring and alerts
- Troubleshooting procedures
- Rollback and recovery

### 🔬 Architects / Technical Leads
**Start here**: [ARCHITECTURE.md](ARCHITECTURE.md)
- System design (4-layer architecture)
- Design decisions (8 key decisions documented)
- Data flow pipeline
- Dependency matrix
- Why things are designed this way

Then drill down: [INTERNALS.md](INTERNALS.md) for algorithm details.

---

## File Organization

```
docs/
├── README.md                    ← You are here
├── GUIDE.md                     ← How-to: Using the tool
├── ARCHITECTURE.md              ← Design: How it works + why
├── API.md                       ← Reference: All modules
├── OPERATIONS.md                ← Deploy & run in production
├── INTERNALS.md                 ← Algorithms & deep-dives
├── CONTRIBUTING.md              ← Development standards & testing
└── csv-examples/                ← Sample CSV files
    ├── export-sample.csv
    ├── import-template.csv
    └── README.md
```

**Consolidated from**: 19 original docs merged for clarity and reduced redundancy.

---

## System Architecture (Quick Overview)

```
INPUT PAGE                    REPORT PAGE
    ↓                             ↓
User enters camber values    Analysis results
in 13×13 grid                (3 optima, charts,
    ↓                        bolt diagrams)
    └─→ localStorage ←─────────────┘
        (browser storage)          ↓
                            Symmetry analysis
                            (FL ↔ FR matching)
                            
NO SERVER • NO DATABASE • NO CLOUD SYNC
All calculations in browser. Data stays local.
```

**For detailed architecture**: Read [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Test Coverage

✅ **33+ integration tests** covering:
- Home page (targets management)
- Input grid (13×13 measurement capture)
- CSV import/export
- Report generation (tables, charts, diagrams)
- Symmetry analysis (FL/FR matching)
- Four-wheel independence (FL, FR, RL, RR)
- localStorage persistence
- Data integrity across page reloads

```bash
npm run test:all-sync    # Run all tests (~2-3 min)
npm run test:home        # Specific suite
npm run test:report-table
# ... see CONTRIBUTING.md for all test commands
```

---

## Getting Started (5 Minutes)

### Install
```bash
git clone https://github.com/marcelrienks/mx5-nc1.git
cd alignment
npm install
```

### Start Dev Server
```bash
npm run start
# Server on http://localhost:8080
# Pages: /, /input.html, /report.html
```

### Run Tests
```bash
npm run test:all-sync        # All 33+ tests
```

### Verify Installation
All tests pass? → You're ready! ✅

**Next step**: Read [GUIDE.md](GUIDE.md) to learn how to use the tool, or jump to [ARCHITECTURE.md](ARCHITECTURE.md) to understand the design.

---

## Key Facts

- **MVP Status**: 95% feature-complete (core functionality working)
- **Tested**: 33+ Puppeteer integration tests, all passing
- **Browser-based**: No server, no database (static HTML + JS)
- **Deployment**: AWS S3 + CloudFront (see [OPERATIONS.md](OPERATIONS.md))
- **Supported Vehicles**: MX-5 NC1 PRHT (adaptable to other eccentric-bolt vehicles)
- **Data Privacy**: All data stays in your browser, never sent anywhere

---

## Project Structure

```
alignment/
├── site/                    # HTML pages & CSS
│   ├── index.html          # Home page (targets)
│   ├── input.html          # Input page (measurements)
│   ├── report.html         # Report page (analysis)
│   └── css/shared.css      # Styling
├── js/                     # Business logic (21 modules)
│   ├── report-engine.js    # Core analysis algorithm
│   ├── constants.js        # Configuration
│   ├── csv-io.js           # Import/export
│   └── ... (18 more)
├── tests/                  # 33+ integration tests
├── docs/                   # Documentation (this folder)
└── package.json
```

---

## Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Tests hang (30+ sec) | Increase timeout in jest.config.js; verify port 8080 free |
| localStorage not persisting | Check browser privacy settings; localStorage may be disabled |
| CSV import fails | Verify CSV header matches spec (see [GUIDE.md](GUIDE.md)) |
| Report not rendering | Check browser console (F12); see [OPERATIONS.md § Troubleshooting](OPERATIONS.md#troubleshooting) |

For more: See [GUIDE.md § Troubleshooting](GUIDE.md) or [OPERATIONS.md § Troubleshooting](OPERATIONS.md).

---

## Documentation Stats

- **Total lines**: ~5,000 (consolidated from 19 docs)
- **Modules documented**: All 21 with signatures and examples
- **Design decisions**: 8 documented with rationale
- **Test scenarios**: 33+ with step-by-step workflows
- **API endpoints**: 60+ functions with examples

---

## Next Steps

1. **To use the tool**: → [GUIDE.md](GUIDE.md)
2. **To understand the design**: → [ARCHITECTURE.md](ARCHITECTURE.md)
3. **To deploy**: → [OPERATIONS.md](OPERATIONS.md)
4. **To develop**: → [API.md](API.md) → [CONTRIBUTING.md](CONTRIBUTING.md)
5. **To troubleshoot**: → [OPERATIONS.md](OPERATIONS.md)

---

**Questions?** Check [ARCHITECTURE.md § Design Decisions](ARCHITECTURE.md) or [INTERNALS.md](INTERNALS.md) for technical deep-dives.

**Last Updated**: April 26, 2026  
**Maintained by**: Marcel Rienks  
**Repository**: https://github.com/marcelrienks/mx5-nc1
