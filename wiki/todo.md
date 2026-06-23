# TODO — Open Issues & Blockers

**Eccentric Bolt Alignment System**

## Current Work

### [ ] Fix Front-Left Caster Calculation
**Priority**: High  
**Blocker**: Phase 1 correctness  
**Details**: FL wheel steering orientation is opposite to FR (CCW vs CW). Caster formula may need sign flip for FL.

**Current**:
```
FR: caster = (camber_at_-20° - camber_at_+20°) / 40
FL: caster = (camber_at_+20° - camber_at_-20°) / 40  [NEEDS VERIFICATION]
```

**Action**: Test FL caster calculation against physical measurements.

---

### [ ] Clarify Steering Angle Range
**Priority**: High  
**Blocker**: API clarity  
**Details**: Current system assumes ±20° symmetric sweep. Verify if custom angles (e.g., ±10°, ±30°) supported.

**Current**: architecture.md and guide.md document ±20° only.

**Action**: Test with non-standard angles; update algorithm if needed.

---

### [ ] Documentation Cleanup (IN PROGRESS)
**Priority**: Medium  
**Owner**: Claude Code  
**Details**: Move from `docs/` to `wiki/`, consolidate duplicates, simplify.

**Status**: 
- [x] Removed architecture.md duplication (lines 1411–1799)
- [x] Consolidated guide.md workflow section (120 → 60 lines)
- [x] Removed dead cross-references
- [ ] Archive deprecated `docs/` directory safely
- [ ] Verify all wiki cross-references work

---

## Future Work (Not Committed)

- **Phase 2**: Add RL/RR (rear wheel) support
- **Phase 3**: Toe integration (currently measured but not analyzed)
- **Mobile**: Camera-based measurement capture

---

Last Updated: 2026-06-23