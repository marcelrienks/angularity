# TODO — Open Issues & Blockers

**Eccentric Bolt Alignment System**

## Current Work

### [ ] Verify Front-Left Caster Sign Convention
**Priority**: Medium  
**Details**: FL wheel steering orientation (CCW) vs FR (CW). Verify caster sign is correct for both wheels.

**Current**: Uses trigonometric formula `multiplier * |camber_acw - camber_cw|` applied to both wheels.  
ACW = anti-clockwise (negative steering), CW = clockwise (positive steering).

**Action**: Compare calculated caster against physical measurements on test vehicle.

---

### [x] Clarify Steering Angle Range
**Priority**: RESOLVED  
**Details**: System supports configurable steering geometry via:
- `TARGET_STEERING_RATIO` (default 15:1) — steering wheel rotation ÷ wheel rotation
- `TARGET_CASTER_WHEEL_DEGREES` (default 24°) — explicit wheel angle
- Two caster modes: `'steering-ratio'` or `'wheel-degrees'`

**Status**: Fully implemented in code (constants.js, math-utils.js). Documentation updated.

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