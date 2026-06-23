# Research: White-Label Theming System

**Phase 0 output for**: [plan.md](plan.md)
**Date**: 2026-06-23

---

## Decision 1: CSS Architecture for Theming

**Decision**: CSS custom properties (variables) with `data-theme` attribute on `<html>`.

**Rationale**: The existing `shared.css` already uses CSS variables (`--bg`, `--text`, `--border`, etc.) on `:root`. The white-label base replaces those `:root` values with neutral/transparent defaults. Theme layers are defined as `[data-theme="light"] { ... }` and `[data-theme="dark"] { ... }` blocks that override the same variable names. JavaScript sets `document.documentElement.setAttribute('data-theme', value)` to switch themes. No class toggling, no stylesheet swapping, no duplication of selectors.

**Alternatives considered**:
- *Separate theme stylesheets*: Rejected — requires dynamic `<link>` injection, causes FOUC, increases complexity.
- *CSS-in-JS / runtime injection*: Rejected — violates no-build-step constraint and adds a runtime dependency.
- *Class on `<body>`*: Works equally well; `data-theme` on `<html>` preferred because it allows theme to apply before `<body>` parses.

---

## Decision 2: FOUC Prevention

**Decision**: Inline `<script>` block in `<head>`, before the CSS `<link>`, that reads `localStorage.getItem('angularity-theme')` and synchronously calls `document.documentElement.setAttribute('data-theme', value)`.

**Rationale**: At the point an inline script in `<head>` runs, the browser has not yet painted. Setting the attribute here means the CSS cascade sees the correct `[data-theme]` selector before the first render. This is the standard FOUC-prevention technique used by VS Code Web, GitHub, and most production theming systems.

```html
<!-- FOUC prevention — must be first script in <head>, before CSS link -->
<script>
  (function() {
    var t = localStorage.getItem('angularity-theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
  })();
</script>
```

**Alternatives considered**:
- *Apply theme in DOMContentLoaded*: Rejected — causes visible flash on every page load.
- *CSS `prefers-color-scheme` media query as default*: Considered as a bonus; not required by spec. Can be added as an enhancement in a later feature.

---

## Decision 3: Google Fonts Removal

**Decision**: Replace `@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono...')` with a system monospace font stack.

**Rationale**: Google Fonts is an external network request. Constitution Principle I requires the application to function fully offline after initial page load. A cached Google Font breaks on first offline visit. The system monospace stack below covers all major operating systems with high-quality monospace fonts and requires zero network requests:

```css
font-family: ui-monospace, 'Cascadia Code', 'Cascadia Mono', 'Source Code Pro',
             Menlo, Consolas, 'DejaVu Sans Mono', monospace;
```

The monospace family is retained (not replaced with a proportional font) because the input grid displays numbers that must column-align — this is a functional typography requirement, not decorative.

**Alternatives considered**:
- *Keep Share Tech Mono, self-host it*: Viable but requires adding a font asset, complicating deployment. System stack is simpler.
- *Switch to proportional font*: Rejected — column-aligned numbers in the input grid are functionally dependent on monospace rendering.

---

## Decision 4: Typography Scale

**Decision**: Three named styles applied via CSS utility classes and element selectors.

| Style | CSS variable | Font size | Weight | Applied to |
|-------|-------------|-----------|--------|-----------|
| Header | `--font-size-h` | `1.4rem` | `700` | `h1`, `.page-header h1`, `.card-heading` |
| Sub-header | `--font-size-sh` | `1rem` | `600` | `h2`, `h3`, `.navbar .title`, `.section-title`, tab labels |
| Paragraph | `--font-size-p` | `0.875rem` | `400` | `p`, `body`, labels, descriptions, button text |

**Rationale**: 1.4 / 1.0 / 0.875rem provides a clear visual hierarchy without excessive size jumps. The existing CSS uses `0.85rem`–`1.1rem` for body text; consolidating to `0.875rem` is a minimal change. Weight 600 for sub-headers provides clear differentiation from 700 headers and 400 body without requiring a separate font file.

**Alternatives considered**:
- *rem scale 2.0 / 1.25 / 1.0*: Rejected — too large for a data-dense technical tool with grid tables.
- *px values instead of rem*: Rejected — rem respects browser font-size accessibility settings.

---

## Decision 5: White-Label Base Variable Values

**Decision**: `:root` (no theme) uses browser-default / transparent values so pages render readable without a theme.

| Variable | White-label value | Meaning |
|----------|------------------|---------|
| `--bg` | `transparent` (or `#fff` fallback via `background-color: canvas`) | Main background |
| `--panel` | `rgba(0,0,0,0.04)` | Slightly tinted panel |
| `--text` | `canvastext` (CSS system color) | Primary text |
| `--muted` | `GrayText` | Secondary/muted text |
| `--border` | `ButtonBorder` | Borders |
| `--accent` | `Highlight` | Interactive accent |

CSS system color keywords (`canvas`, `canvastext`, `GrayText`, etc.) are browser-provided and respect the OS light/dark mode automatically. They are the correct white-label defaults.

**Rationale**: Using CSS system colors as the base means the white-label state is usable on any OS light/dark mode. Themes then override these with specific palette values.

---

## Decision 6: Config Menu Design

**Decision**: Fixed-position gear button (`⚙`) in top-right corner, opens a small dropdown panel with two radio-style buttons (Light / Dark). Clicking outside or re-clicking the gear closes the menu. No "no theme / white-label" option in the menu — white-label is the pre-configuration default, not a user-selectable option.

**Rationale**: Standard pattern for site-level settings. Gear icon is universally understood. Fixed position means it doesn't scroll away. Dropdown is simpler to implement and test than a modal.

**localStorage key**: `angularity-theme` (namespaced to avoid collisions with other tools on the same localhost).

---

## Decision 7: Functional Color Variables (Do Not Touch)

The following CSS variables are functional (carry data meaning) and MUST NOT be changed by theming:

| Variable | Use | Why functional |
|----------|-----|---------------|
| `--green` | Heatmap cells — optimal score | Data meaning: position is near-target |
| `--orange` | Heatmap cells — moderate score | Data meaning: acceptable but not optimal |
| `--red` | Heatmap cells — poor score | Data meaning: far from target |
| `--blue` | Required measurement positions | Data meaning: mandatory measurement |
| `--purple` | Bolt position diagram — compromise optimum | Data meaning: best trade-off |
| `--req-band` | Required-position band tint | Data meaning: mandatory measurement zone |
| `--req-band-hdr` | Required-position band header | Data meaning: mandatory measurement zone |

These variables remain in `:root` and are NOT overridden by theme blocks.
