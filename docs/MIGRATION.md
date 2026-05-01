# MIGRATION — Documentation Consolidation Guide

**Date**: April 26, 2026  
**Purpose**: Track what moved where during documentation consolidation

---

## What Changed

On April 26, 2026, the documentation was consolidated from **19+ files** into **7 core files** to eliminate redundancy and improve clarity.

### File Mapping: Where Content Moved

| Old File | New Home | Details |
|----------|----------|---------|
| DESIGN.md | [ARCHITECTURE.md](ARCHITECTURE.md) | Design decisions & philosophy → Section "Key Design Principles" |
| PRODUCT.md | [ARCHITECTURE.md](ARCHITECTURE.md) | Requirements & constraints → Section "System Layers" |
| INDEX.md | [API.md](API.md) | Module index → Complete API reference |
| MODULES.md | [API.md](API.md) | Detailed module docs → Merged into API reference |
| QUICKSTART.md (intro) | [README.md](README.md) | Quick-start navigation → Top-level entry point |
| QUICKSTART.md (workflow) | [GUIDE.md](GUIDE.md) | User workflow → "Using the Tool" section |
| QUICKSTART.md (dev) | [GUIDE.md](GUIDE.md) | Development setup → "Development Tasks" section |
| DEBUGGING.md | [GUIDE.md](GUIDE.md) + [INTERNALS.md](INTERNALS.md) | Debugging tips → GUIDE; Pipeline tracing → INTERNALS |
| IMPLEMENTATION.md | Various | Status update (archived); technical content → GUIDE/INTERNALS |
| OPTIMIZATION.md | [INTERNALS.md](INTERNALS.md) | Performance optimizations → Section "Performance Optimizations" |
| INTERPOLATION.md | [INTERNALS.md](INTERNALS.md) | Algorithm details → Section "Bilinear Interpolation Algorithm" |
| REPORTING.md | [INTERNALS.md](INTERNALS.md) | Three optima calculation → Section "Report Generation & Three Optima" |
| ERRORS.md | [INTERNALS.md](INTERNALS.md) + [CONTRIBUTING.md](CONTRIBUTING.md) | Error patterns → INTERNALS; Standards → CONTRIBUTING |
| PERSISTENCE.md | [GUIDE.md](GUIDE.md) + [OPERATIONS.md](OPERATIONS.md) | User guide → GUIDE; CSV format → OPERATIONS |
| TESTING.md | [CONTRIBUTING.md](CONTRIBUTING.md) | Testing standards → "Test Suite" section |
| CHECKLIST.md | [CONTRIBUTING.md](CONTRIBUTING.md) | Module docs checklist → "Module Documentation Checklist" |
| STYLING.md | [CONTRIBUTING.md](CONTRIBUTING.md) | Code & visual design → "Code Style" & "Styling" sections |
| DEPLOYMENT.md | [OPERATIONS.md](OPERATIONS.md) | Already consolidated there |
| OPERATIONS.md | [OPERATIONS.md](OPERATIONS.md) | Already in use |
| API.md | [API.md](API.md) | Already in use (updated) |
| ARCHITECTURE.md | [ARCHITECTURE.md](ARCHITECTURE.md) | Already in use (updated) |

---

## New Information Architecture

```
README.md (entry point)
    ↓
┌───────────────────────────────────────────────────────────┐
│ Choose your path based on role:                          │
├───────────────────────────────────────────────────────────┤
│ 👨‍🔧 Mechanic/User     →  GUIDE.md                          │
│ 👨‍💻 Developer       →  API.md + CONTRIBUTING.md           │
│ 🏗️  Architect      →  ARCHITECTURE.md + INTERNALS.md     │
│ 🚀 DevOps/Deploy   →  OPERATIONS.md                       │
│ 🔬 Algorithm Dev   →  INTERNALS.md                        │
└───────────────────────────────────────────────────────────┘
```

---

## Files Deleted

The following old files have been consolidated and can be safely deleted:

```
docs/
├── DESIGN.md                  ❌ Consolidated into ARCHITECTURE.md
├── PRODUCT.md                 ❌ Consolidated into ARCHITECTURE.md
├── INDEX.md                   ❌ Consolidated into API.md
├── MODULES.md                 ❌ Consolidated into API.md
├── QUICKSTART.md              ❌ Consolidated into README.md + GUIDE.md
├── DEBUGGING.md               ❌ Consolidated into GUIDE.md + INTERNALS.md
├── IMPLEMENTATION.md          ❌ Status archived; content merged
├── OPTIMIZATION.md            ❌ Consolidated into INTERNALS.md
├── INTERPOLATION.md           ❌ Consolidated into INTERNALS.md
├── REPORTING.md               ❌ Consolidated into INTERNALS.md
├── ERRORS.md                  ❌ Consolidated into INTERNALS.md + CONTRIBUTING.md
├── PERSISTENCE.md             ❌ Consolidated into GUIDE.md + OPERATIONS.md
├── TESTING.md                 ❌ Consolidated into CONTRIBUTING.md
├── CHECKLIST.md               ❌ Consolidated into CONTRIBUTING.md
└── STYLING.md                 ❌ Consolidated into CONTRIBUTING.md
```

---

## New Core Files

| File | Purpose | Audience | Size |
|------|---------|----------|------|
| [README.md](README.md) | Single entry point with navigation | Everyone | ~400 lines |
| [GUIDE.md](GUIDE.md) | How-to: use tool, develop, troubleshoot | Users & developers | ~600 lines |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, layers, decisions | Architects, leads | ~700 lines |
| [API.md](API.md) | Module reference & function signatures | Developers | ~1,200 lines |
| [OPERATIONS.md](OPERATIONS.md) | Deploy, monitor, troubleshoot production | DevOps, operators | ~600 lines |
| [INTERNALS.md](INTERNALS.md) | Algorithm details, performance, debugging | Algorithm devs | ~800 lines |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development standards, testing, code style | Contributors | ~700 lines |

**Total**: ~5,000 lines (consolidated from ~8,000+, 37% reduction in redundancy)

---

## Breaking Changes (None)

✅ **All content preserved** — No information was lost  
✅ **All functionality documented** — All 21 modules documented  
✅ **All processes covered** — Testing, deployment, development all documented  
✅ **Better organized** — Clearer navigation and reduced redundancy  

---

## For Existing Documentation Links

If you have external links pointing to old files, update them:

### Update Links

**Before**:
```markdown
See [DESIGN.md](DESIGN.md#decision-1) for design rationale
```

**After**:
```markdown
See [ARCHITECTURE.md](ARCHITECTURE.md#2-value-symmetry-not-bolt-symmetry) for design rationale
```

### Common Link Updates

| Old Link | New Link |
|----------|----------|
| docs/DESIGN.md | docs/ARCHITECTURE.md |
| docs/PRODUCT.md | docs/ARCHITECTURE.md |
| docs/INDEX.md | docs/API.md |
| docs/MODULES.md | docs/API.md |
| docs/QUICKSTART.md | docs/README.md or docs/GUIDE.md |
| docs/TESTING.md | docs/CONTRIBUTING.md |
| docs/DEBUGGING.md | docs/GUIDE.md or docs/INTERNALS.md |
| docs/ERRORS.md | docs/INTERNALS.md or docs/CONTRIBUTING.md |
| docs/INTERPOLATION.md | docs/INTERNALS.md |
| docs/REPORTING.md | docs/INTERNALS.md |

---

## How to Verify

```bash
# See old vs new structure
cd docs/

# Old structure (before April 26)
ls -1 *.md | wc -l     # ~19 files

# New structure (after April 26)
ls -1 *.md | wc -l     # ~7 files

# List new files
ls -1 *.md
# README.md
# ARCHITECTURE.md
# GUIDE.md
# API.md
# OPERATIONS.md
# INTERNALS.md
# CONTRIBUTING.md
# MIGRATION.md (this file)
```

---

## Reverting (If Needed)

If you need to revert to old documentation:

```bash
git log --oneline docs/      # Find commit before April 26
git checkout <commit-hash> -- docs/   # Restore old files
```

Or for specific files:
```bash
git checkout HEAD~5 -- docs/DESIGN.md docs/PRODUCT.md
```

---

## Related Documentation

- **New entry point**: [README.md](README.md)
- **All modules**: [API.md](API.md)
- **System design**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **How to use**: [GUIDE.md](GUIDE.md)
- **Deployment**: [OPERATIONS.md](OPERATIONS.md)
- **Development**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Technical deep-dives**: [INTERNALS.md](INTERNALS.md)

---

**Questions?** Check the relevant core document from the list above. All documentation is now centralized and easier to maintain.
