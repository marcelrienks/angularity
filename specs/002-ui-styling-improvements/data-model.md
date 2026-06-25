# Data Model: CSS Design Token Inventory

This feature has no application data model changes. The "model" here is the CSS design token system — the variables and classes that define all visual presentation.

---

## Design Token System (`:root` CSS Variables)

### Existing Tokens (unchanged)

| Token | Value | Purpose |
|-------|-------|---------|
| `--bg` | `Canvas` (system) | Page background |
| `--panel` | `rgba(0,0,0,0.04)` | Surface level 1 |
| `--panel-alt` | `rgba(0,0,0,0.08)` | Surface level 2 |
| `--panel-deep` | `rgba(0,0,0,0.12)` | Surface level 3 |
| `--border` | `ButtonBorder` (system) | All borders |
| `--text` | `CanvasText` (system) | Primary text |
| `--muted` | `GrayText` (system) | Secondary text |
| `--blue` | `#6ab4ff` | Accent / active |
| `--green` | `#4ec063` | Success |
| `--orange` | `#e0a935` | Warning |
| `--red` | `#fc6e68` | Danger |
| `--font-size-h` | `1.625rem` | Header class size |
| `--font-size-sh` | `1.0rem` | Sub-header class size |
| `--font-size-p` | `0.75rem` → **0.875rem** | Paragraph class size *(changed)* |
| `--font-weight-h` | `700` | Header weight |
| `--font-weight-sh` | `600` | Sub-header weight |
| `--font-weight-p` | `400` | Paragraph weight |

### New Tokens Added

| Token | Value | Purpose |
|-------|-------|---------|
| `--space-xs` | `4px` | Tightest spacing (icon gaps, micro) |
| `--space-sm` | `8px` | Compact spacing (button padding, cell gaps) |
| `--space-md` | `16px` | Default spacing (form groups, section padding) |
| `--space-lg` | `24px` | Generous spacing (section margins, card padding) |
| `--space-xl` | `32px` | Section separation |
| `--space-2xl` | `48px` | Page-level separation |

### Removed/Fixed Tokens

| Token | Status | Reason |
|-------|--------|--------|
| `--bg-light` | **Removed** — was undefined, now replaced with `var(--panel-alt)` in 2 rules | Never defined; caused silent transparent background |

---

## Typography Scale (3 Semantic Classes — Unchanged Structure)

| Class | Font Size | Weight | Color | Use |
|-------|-----------|--------|-------|-----|
| `.header` | `var(--font-size-h)` = 1.625rem | 700 | `var(--blue)` | Page titles, section titles |
| `.sub-header` | `var(--font-size-sh)` = 1.0rem | 600 | `var(--text)` | Labels, buttons, nav links |
| `.paragraph` | `var(--font-size-p)` = **0.875rem** | 400 | `var(--muted)` | Descriptions, notes, status text |

**Rule**: Only these three classes may be used for text styling. No inline font sizes.

---

## New Utility Classes

| Class | Properties | Use |
|-------|------------|-----|
| `.display-value` | `padding: var(--space-sm) 0; color: var(--muted); font-style: italic;` | Read-only computed values in forms |
| `.radio-group` | `display: flex; gap: var(--space-md); align-items: center; padding: var(--space-xs) 0;` | Flex container for radio button row |
| `.radio-label` | `display: flex; gap: var(--space-xs); align-items: center;` | Individual radio button + label pair |
| `.tabs-spacer` | `margin-bottom: var(--space-md);` | Spacing below tab selector bars |

---

## Updated CSS Rules

| Selector | Change |
|----------|--------|
| `body` | Add `line-height: 1.6` |
| `.data-table td` | `border-bottom: 1px solid #21262d` → `1px solid var(--border)` |
| `.spec-table td` | `border-bottom: 1px solid #21262d` → `1px solid var(--border)` |
| `.targets-group` | `background: var(--bg-light)` → `var(--panel-alt)` |
| `.form-fieldset` | `background: var(--bg-light)` → `var(--panel-alt)` |
| `.form-group select` | New rule: `padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--panel);` |
| `:focus-visible` | New global rule: `outline: 2px solid var(--blue); outline-offset: 2px;` |
| `.chart-section, .heatmap-section, .washer-section, .symmetry-section, .sessions-section` | Add `border-top: 3px solid var(--blue)` |

---

## HTML Class Attribute Changes

### index.html

| Element | Change |
|---------|--------|
| `#config-tabs` (line 68) | Remove `style="margin-bottom:16px;"` → add class `tabs-spacer` |
| Radio group wrapper (line 120) | Remove inline style → add class `radio-group` |
| Radio `<label>` ×2 (lines 121, 125) | Remove inline style → add class `radio-label` |
| `#steering-sweep-display` (line 145) | Remove `style="padding:10px 0;"` → add class `display-value` |
| `#measurement-density-select` (line 149) | Remove inline style → element styled by `.form-group select` rule |
| `#effective-wheel-angle-display` (line 163) | Remove `style="padding:10px 0;"` → add class `display-value` |
| `#caster-multiplier-display` (line 167) | Remove `style="padding:10px 0;"` → add class `display-value` |
| `#bolt-range-display` (line 171) | Remove `style="padding:10px 0;"` → add class `display-value` |
| `#required-points-display` (line 175) | Remove `style="padding:10px 0;"` → add class `display-value` |
| `#btn-save-targets` (line 104) | Add class `primary` |
| `#btn-save-configs` (line 180) | Add class `primary` |

### input.html

| Element | Change |
|---------|--------|
| `#btn-download` (line 58) | Add class `primary` |

---

## Theme Invariants (Must Hold After Changes)

1. All tokens resolve to a valid color in `:root` (system default), `[data-theme="light"]`, and `[data-theme="dark"]`
2. `--panel-alt` exists and has appropriate values in all three theme states ✅ (confirmed — all defined)
3. `var(--border)` resolves correctly in all three theme states ✅ (confirmed — all defined)
4. New spacing variables have no theme-specific values (px values are theme-independent) ✅
5. `:focus-visible` outline uses `var(--blue)` which is `#6ab4ff` — same across all themes ✅
