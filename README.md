# MX-5 NC1 Wheel Alignment System

**Web-based digital analysis tool for home wheel alignment on a Mazda MX-5 NC1.**

> **Status**: ✅ MVP Complete — 149 integration tests passing, AWS deployment ready

---

## What It Does

1. **Capture measurements** at multiple eccentric bolt positions (13×13 grid per wheel)
2. **Analyze trade-offs** using weighted scoring (camber vs caster vs toe)
3. **Recommend optimal bolt positions** that balance alignment values and symmetry
4. **Provide measurement procedures** for caster (steering sweep), camber (digital gauge), toe (string box)

## Key Design Decisions

- **Value Symmetry, Not Bolt Symmetry** — FL and FR match on alignment values; bolt positions can differ
- **Three Independent Optima** — Each wheel shows: best compromise + best camber + best caster
- **Client-Side Only** — All calculations in browser; data never leaves your machine
- **Discrete Grid** — 13×13 represents physical detents (169 combinations per wheel)
- **Universal Concept** — Methodology applies to any eccentric-bolt vehicle (BMW E30/E36, Honda Civic, Nissan S13/S14)

---

## Quick Start

### Install & Run

```bash
git clone https://github.com/marcelrienks/mx5-nc1.git
cd alignment
npm install
npm run start
```

Server: `http://localhost:8080`

### Run Tests

```bash
npm run test:all-sync    # All 149 tests
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
├── js/                    # Business logic (21 modules)
│   ├── report-engine.js   # Core algorithms
│   ├── constants.js       # Configuration
│   └── ... (19 more)
├── tests/                 # 149 integration tests
├── docs/                  # Technical reference
└── package.json
```

---

## Documentation

| Audience | Start Here | What's In It |
|----------|-----------|-------------|
| **Developers** | [docs/QUICKSTART.md](docs/QUICKSTART.md) | Setup, project structure, dev tasks |
| | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, algorithms, data flow |
| **Mechanics** | [README.md](docs/README.md) § Alignment Targets | Physical procedures, adjustment workflows |
| **All** | [docs/](docs/) | Complete reference (16 focused docs) |

---

## Key Facts

- **MVP Status**: 95% feature-complete
- **Test Coverage**: 149 Puppeteer integration tests (all passing)
- **Architecture**: Browser-based, no server/database
- **Deployment**: AWS S3 + CloudFront (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))
- **Data Privacy**: All data stays in your browser
- **Alignment Targets**: Caster 5.0°, Camber −1.1° (front) / −1.5° (rear), Toe +0.58 mm per wheel

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Tests hang | Increase timeout in jest.config.js; verify port 8080 free |
| localStorage not persisting | Check browser privacy settings |
| CSV import fails | Verify CSV header format (see [docs/GUIDE.md](docs/GUIDE.md)) |

---

**Questions?** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for design deep-dives, or [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for development standards.

**Last Updated**: June 23, 2026  
**Repository**: https://github.com/marcelrienks/mx5-nc1
