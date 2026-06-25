# Research: UI Styling Improvements

All unknowns resolved by direct codebase audit. No external research required — this is a pure CSS/HTML change within a known, self-contained codebase.

---

## Finding 1: Hardcoded Hex Colors in Borders

**Decision**: Replace `#21262d` with `var(--border)` in both occurrences

**Locations**:
- `shared.css:727` — `.data-table td { border-bottom: 1px solid #21262d; }`
- `shared.css:2199` — `.spec-table td { border-bottom: 1px solid #21262d; }`

**Rationale**: `#21262d` is a GitHub dark-mode hex that matches the dark theme border (`--border: #3A3D41`) visually but is completely wrong in light theme where `--border: #D4D4D4`. Using `var(--border)` makes both tables correct in all three theme states.

**Alternatives considered**: Adding a specific variable for table borders — rejected, over-engineering. `var(--border)` is the correct semantic token.

---

## Finding 2: Undefined `--bg-light` Variable

**Decision**: Replace `var(--bg-light)` with `var(--panel-alt)` in both usages

**Locations**:
- `shared.css:2238` — `.targets-group { background: var(--bg-light); }`
- `shared.css:2281` — `.form-fieldset { background: var(--bg-light); }`

**Rationale**: These elements are nested inside a `.targets-section` panel that uses `var(--panel)`. The intent is a slightly deeper background to visually group fieldset contents — exactly what `--panel-alt` provides (one step deeper than `--panel`). In light theme: panel=`#F3F3F3`, panel-alt=`#ECECEC`. In dark: panel=`#252526`, panel-alt=`#2D2D30`.

**Alternatives considered**: Defining `--bg-light` as a new variable — rejected, it duplicates `--panel-alt` semantically. Keeping transparent — rejected, defeats purpose of grouping.

---

## Finding 3: Paragraph Text Size and Line Height

**Decision**: Increase `--font-size-p` from `0.75rem` to `0.875rem`. Add `line-height: 1.6` to `body`.

**Rationale**: `0.75rem` = 12px at default browser settings. Standard minimum for comfortable reading is 14px. `0.875rem` = 14px. Existing `line-height` on `body` is unset (browser default ~1.2), which feels cramped on multi-line paragraph descriptions. `1.6` is established as readable for monospace-adjacent UIs.

**Risk**: Paragraph text used extensively in grid cells (`.cell-label`, `.cell-row` etc) — these use `var(--font-size-sh)` (1.0rem), not `var(--font-size-p)`. The `.paragraph` class change only affects elements explicitly using it: card descriptions, form notes, status messages. No layout breakage anticipated.

**Alternatives considered**: Bumping to 1.0rem — rejected, collapses distinction between paragraph and sub-header tiers. `line-height: 1.4` — acceptable but `1.6` is more comfortable for this content density.

---

## Finding 4: CSS Spacing Scale

**Decision**: Add six spacing variables to `:root`

```css
--space-xs:  4px;
--space-sm:  8px;
--space-md:  16px;
--space-lg:  24px;
--space-xl:  32px;
--space-2xl: 48px;
```

**Rationale**: Existing CSS uses multiples of 4px and 8px throughout but as magic numbers. The project already uses 4, 8, 12, 16, 20, 24, 32 in spacing contexts. A 4px-base scale covering these naturally. Variables don't replace all existing values immediately — they're introduced and used in new rules; existing rules can be migrated gradually.

**Alternatives considered**: Larger scale (8px base) — rejected, `--space-xs: 4px` is needed for tight spacing (cell gaps, icon margins). REM-based spacing — rejected, the site uses px throughout for spacing and mixing would create inconsistency.

---

## Finding 5: Inline Styles in index.html — Full Audit

**Lines requiring CSS class replacement** (presentation, not JS state):

| Line | Element | Inline Style | CSS Resolution |
|------|---------|-------------|----------------|
| 68 | `#config-tabs` div | `style="margin-bottom:16px;"` | Add class `.tabs-spacer` with `margin-bottom: var(--space-md)` |
| 120 | Radio group wrapper div | `style="display:flex; gap:16px; align-items:center; padding:6px 0;"` | Add class `.radio-group` |
| 121, 125 | Radio `<label>` | `style="display:flex; gap:6px; align-items:center;"` | Add class `.radio-label` |
| 145 | `#steering-sweep-display` | `style="padding:10px 0;"` | Add class `.display-value` |
| 149 | `#measurement-density-select` | `style="padding:6px 10px; border:1px solid var(--border); border-radius:4px; background:var(--panel);"` | Add `.form-group select` rule to CSS |
| 163 | `#effective-wheel-angle-display` | `style="padding:10px 0;"` | Add class `.display-value` |
| 167 | `#caster-multiplier-display` | `style="padding:10px 0;"` | Add class `.display-value` |
| 171 | `#bolt-range-display` | `style="padding:10px 0;"` | Add class `.display-value` |
| 175 | `#required-points-display` | `style="padding:10px 0;"` | Add class `.display-value` |

**Lines that are JS-driven state (acceptable, leave as-is)**:

| Line | Element | Reason |
|------|---------|--------|
| 26 | `#error-banner` | JS sets `display:none/block` dynamically |
| 113 | `#configs-panel` | Tab switcher JS toggles this |
| 135 | `#wheel-degrees-group` | Radio selection JS toggles this |

**Risk on #configs-panel (line 113)**: JS in `targets-manager.js` toggles `style.display` directly on this element. After removing the initial `style="display:none"`, the panel will be visible on page load until JS runs. Solution: keep `style="display:none"` on JS-toggled elements, OR add a `.hidden` utility class that JS can toggle instead. Spec allows keeping JS-driven `display:none` inline (FR-006), so leave these.

---

## Finding 6: Primary Button Audit

**Buttons needing `.primary` class added**:

| File | Element | Label | Action type |
|------|---------|-------|------------|
| `index.html:104` | `#btn-save-targets` | "Save Targets" | Primary form submit |
| `index.html:180` | `#btn-save-configs` | "Save Configs" | Primary form submit |
| `input.html:58` | `#btn-download` | "Save CSV" | Primary export action |

**Already correctly classed**: `#btn-reset-targets` and `#btn-reset-configs` have `.danger` class. `#btn-save-session` on report has `.secondary` class.

**CSS check**: `.button.primary` rule already exists in `shared.css:522` with `background: var(--blue); border-color: var(--blue)`. Just needs class applied in HTML.

---

## Finding 7: Read-only Display Value Treatment

**Decision**: Create `.display-value` CSS class for non-interactive computed display divs

**Pattern**:
```css
.display-value {
  padding: var(--space-sm) 0;
  color: var(--muted);
  background: transparent;
  border: none;
  font-style: italic;
}
```

**Rationale**: The four computed divs (`#steering-sweep-display`, `#effective-wheel-angle-display`, `#caster-multiplier-display`, `#bolt-range-display`, `#required-points-display`) sit alongside editable form inputs. Using `color: var(--muted)` and `font-style: italic` clearly signals read-only without requiring any label or tooltip.

**Alternatives considered**: Box with dashed border — rejected, adds visual clutter. Full muted background — rejected, draws too much attention. Opacity — rejected, hard to achieve consistent contrast in both themes.

---

## Finding 8: Focus State Standardization

**Decision**: Add a global `:focus-visible` rule as the default, then remove or consolidate redundant individual rules

**Rationale**: Currently `shared.css` has individual focus rules on `.cell-input:focus` (box-shadow), `.form-group input:focus` (border-color only), no focus rules on buttons or selects. `:focus-visible` is the modern CSS pseudo-class that shows focus rings for keyboard users but not mouse clicks — correct behaviour for a tool app.

**Pattern**:
```css
:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}
```

This applies to all interactive elements (inputs, buttons, selects, links, labels-as-buttons) without needing per-element rules. Existing per-element rules that add `box-shadow` for `.cell-input` can be kept (they add visual feedback on top of the outline).

**Alternatives considered**: Per-element rules only — rejected, incomplete and fragile. `outline: none` + box-shadow everywhere — rejected, breaks a11y defaults if any element is missed.

---

## Finding 9: Section Panel Visual Hierarchy

**Decision**: Add a `border-top: 3px solid var(--blue)` accent to content section panels on report.html

**Affected classes**: `.chart-section`, `.heatmap-section`, `.washer-section`, `.symmetry-section`, `.sessions-section`

**Rationale**: These panels currently are `background: var(--panel); border: 1px solid var(--border)` — visually flat and identical to each other. A 3px blue top accent (same pattern as `.home-card` already uses) gives each section a clear entry point and visual presence without adding decoration. The pattern already exists in the codebase on home cards.

**Alternatives considered**: Bold left border — conflicts with existing left-border use for fieldsets and required cells. Shadow — adds depth that clashes with the flat VS Code aesthetic. Colored background — too strong, obscures data. Heading divider line — less impactful than a top border.

---

## Summary of All Changes

| Area | File(s) | Type | Count |
|------|---------|------|-------|
| Fix hardcoded `#21262d` | shared.css | Bug fix | 2 rules |
| Fix `--bg-light` → `var(--panel-alt)` | shared.css | Bug fix | 2 rules |
| Increase `--font-size-p` to 0.875rem | shared.css | Usability | 1 variable |
| Add `line-height: 1.6` to body | shared.css | Usability | 1 rule |
| Add spacing scale variables | shared.css | Appeal | 6 variables |
| Add `.display-value` class | shared.css | Both | 1 rule |
| Add `.radio-group` class | shared.css | Cleanup | 1 rule |
| Add `.radio-label` class | shared.css | Cleanup | 1 rule |
| Add `.tabs-spacer` class | shared.css | Cleanup | 1 rule |
| Add `.form-group select` rule | shared.css | Cleanup | 1 rule |
| Add section panel blue top accent | shared.css | Appeal | 1 rule (5 selectors) |
| Add `:focus-visible` global rule | shared.css | Appeal | 1 rule |
| Remove inline styles in index.html | index.html | Cleanup | 9 lines |
| Add `.primary` to save buttons | index.html, input.html | Appeal | 3 attributes |
