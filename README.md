# Eccentric Bolt Alignment System

**Web-based digital analysis tool for home wheel alignment on vehicles with eccentric bolt adjustment.**

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
- **Universal Concept** — Works with any eccentric-bolt vehicle (BMW E30/E36, Honda Civic, Nissan S13/S14, Mazda MX-5, etc.)

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
├── js/                    # Business logic (17 modules)
│   ├── report-engine.js   # Core algorithms
│   ├── constants.js       # Configuration
│   ├── error-handler.js   # Error handling
│   └── ... (10 more)
├── tests/                 # 149 integration tests
├── wiki/                  # Technical documentation
└── package.json
```

---

## Documentation

| Audience | Start Here | What's In It |
|----------|-----------|-------------|
| **Developers** | [wiki/guide.md](wiki/guide.md) | Setup, project structure, dev tasks |
| | [wiki/architecture.md](wiki/architecture.md) | System design, algorithms, data flow |
| **Mechanics** | [README.md](README.md) § Alignment Targets | Physical procedures, adjustment workflows |
| **All** | [wiki/](wiki/) | Complete reference (3 focused docs) |

---

## Key Facts

- **MVP Status**: 95% feature-complete
- **Test Coverage**: 149 Puppeteer integration tests (all passing)
- **Architecture**: Browser-based, no server/database
- **Deployment**: AWS S3 + CloudFront (see wiki/guide.md § Development Tasks)
- **Data Privacy**: All data stays in your browser
- **Configurable Targets**: Set alignment goals per vehicle (example: Caster 5.0°, Camber −1.1° front)

---

## Common Issues

| Problem | Solution |
|---------|----------|
| Tests hang | Increase timeout in jest.config.js; verify port 8080 free |
| localStorage not persisting | Check browser privacy settings |
| CSV import fails | Verify CSV header format (see [wiki/guide.md](wiki/guide.md)) |

---

**Questions?** See [wiki/architecture.md](wiki/architecture.md) for design deep-dives, or [wiki/guide.md](wiki/guide.md) for development standards.

**Last Updated**: June 23, 2026  
**Repository**: https://github.com/marcelrienks/mx5-nc1
