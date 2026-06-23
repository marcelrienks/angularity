# Data Model: White-Label Theming System

**Phase 1 output for**: [plan.md](plan.md)
**Date**: 2026-06-23

---

## Entity: ThemePreference

Represents the user's stored visual theme choice.

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| `value` | string | `"light"` \| `"dark"` | Only valid stored values |
| absent | — | — | No stored value = white-label default (no theme applied) |

**Storage**: `localStorage.getItem('angularity-theme')` / `localStorage.setItem('angularity-theme', value)`

**Validation rules**:
- On read: if value is not `"light"` or `"dark"`, treat as absent (silently ignore)
- On write: only `"light"` or `"dark"` are accepted; no other values written

**State transitions**:
```
[absent] ──select light──► [light] ──select dark──► [dark]
[absent] ──select dark──►  [dark]  ──select light──► [light]
[light]  ──(clear storage)──► [absent]   (not user-triggered, edge case only)
[dark]   ──(clear storage)──► [absent]   (not user-triggered, edge case only)
```

---

## Entity: ThemePalette

A named set of CSS custom property values that define the visual appearance of a theme.

**Two instances**: `light` (VS Code Light+) and `dark` (VS Code Dark+).

| CSS Variable | Light+ value | Dark+ value | Semantic meaning |
|-------------|-------------|------------|-----------------|
| `--bg` | `#FFFFFF` | `#1E1E1E` | Main content background |
| `--panel` | `#F3F3F3` | `#252526` | Panel / secondary surface background |
| `--text` | `#000000` | `#D4D4D4` | Primary body text |
| `--muted` | `#767676` | `#A6A6A6` | Secondary / muted text |
| `--border` | `#D4D4D4` | `#3A3D41` | Borders and separators |
| `--accent` | `#007ACC` | `#007ACC` | Interactive accent (buttons, active tabs, focus rings) |
| `--hover` | `#E8E8E8` | `#2D2D30` | Hover state background |
| `--selection` | `#E5EBF1` | `#3A3D41` | Selected item background |

**Immutable**: Palette values are compile-time constants in CSS. They are not stored or modified at runtime.

---

## Entity: TypographyScale

Three named text styles applied consistently across all pages.

| Style name | CSS selector targets | Font size | Font weight | Use |
|-----------|---------------------|-----------|------------|-----|
| Header | `h1`, `.page-header h1`, `.card-heading` | `1.4rem` | `700` | Page titles, card headings |
| Sub-header | `h2`, `h3`, `.navbar .title`, `.section-title`, tab labels | `1.0rem` | `600` | Section titles, nav title, tab labels |
| Paragraph | `body`, `p`, `label`, `.card-desc`, `.subtitle`, button text | `0.875rem` | `400` | Body text, descriptions, labels |

**Font family**: `ui-monospace, 'Cascadia Code', 'Cascadia Mono', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace`

---

## Entity: FunctionalColor

Color values tied to data meaning. These are NOT part of the theming system.

| CSS Variable | Hex value | Semantic meaning | Affected UI elements |
|-------------|-----------|-----------------|---------------------|
| `--green` | `#4ec063` | Near-target score (good) | Heatmap cells |
| `--orange` | `#e0a935` | Mid-range score (acceptable) | Heatmap cells |
| `--red` | `#fc6e68` | Far-from-target score (poor) | Heatmap cells |
| `--blue` | `#6ab4ff` | Required measurement position | Input grid cells |
| `--purple` | `#c89eff` | Best-compromise optimum indicator | Bolt position diagrams |
| `--req-band` | `#254470` | Required-position band tint | Input grid |
| `--req-band-hdr` | `#3a6b9f` | Required-position band header | Input grid |

**Invariant**: These variables are defined in `:root` and are overridden by NEITHER the light nor dark theme blocks. Any change to these values constitutes a functional change (not a theming change) and requires its own spec and constitution check.

---

## CSS Variable Namespacing

All theme-controlled variables use existing names (`--bg`, `--panel`, `--text`, `--muted`, `--border`, `--accent`, `--hover`, `--selection`). New variable added: `--hover` and `--selection` (not in current CSS).

Variables NOT touched by theming (declared in `:root` only, never overridden):
- `--green`, `--orange`, `--red`, `--blue`, `--purple` (functional colors above)
- `--req-band`, `--req-band-hdr` (functional)
- `--shadow` (neutral, same in all themes)
- `--font-size-h`, `--font-size-sh`, `--font-size-p` (typography scale — same in all themes)
