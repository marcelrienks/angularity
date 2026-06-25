# Quickstart Validation Guide: White-Label Theming System

**Phase 1 output for**: [plan.md](plan.md)
**Date**: 2026-06-23

---

## Prerequisites

- Node.js installed
- Dev server running: `npm run start` (serves on `http://localhost:8080`)
- Browser DevTools available (for localStorage inspection)

---

## Scenario 1: White-Label Base (No Theme)

**Goal**: Verify the site renders usably with no theme applied.

1. Clear localStorage: DevTools → Application → Local Storage → `http://localhost:8080` → delete `angularity-theme` key (or run `localStorage.clear()` in console)
2. Hard-reload each page: `http://localhost:8080/index.html`, `input.html`, `report.html`
3. **Expected**: Pages render with no dark background, no custom brand colors, no decorative gradients or shadows
4. **Expected**: All text is readable (system foreground on system background)
5. **Expected**: Navigation links, buttons, and tabs are visibly clickable

---

## Scenario 2: Theme Persistence on Navigation

**Goal**: Verify theme choice survives page navigation.

1. Open `http://localhost:8080/index.html`
2. Open the config menu (gear icon, top-right corner)
3. Select "Dark"
4. **Expected**: Page immediately switches to dark palette (`#1E1E1E` background, `#D4D4D4` text)
5. Click "Input Sheet" in navigation
6. **Expected**: Input page loads with dark theme already applied — no flash of white
7. Click "Report" in navigation
8. **Expected**: Report page loads with dark theme already applied
9. Inspect localStorage: `localStorage.getItem('angularity-theme')` → should return `"dark"`

---

## Scenario 3: Theme Persistence on Reload

**Goal**: Verify theme survives full page reload.

1. With Dark theme active (from Scenario 2), hard-reload the current page (Ctrl+Shift+R / Cmd+Shift+R)
2. **Expected**: Page loads directly in dark theme — no flash of white/default before theme applies
3. Repeat with Light theme selected, then reload
4. **Expected**: Page loads in light theme with no flash

---

## Scenario 4: Light Theme Colors

**Goal**: Verify Light theme matches VS Code Light+ palette.

1. Select Light theme from config menu
2. Inspect `document.documentElement.getAttribute('data-theme')` → should return `"light"`
3. Inspect computed CSS variables via DevTools:
   - `getComputedStyle(document.documentElement).getPropertyValue('--bg')` → `#ffffff` (or `#FFFFFF`)
   - `getComputedStyle(document.documentElement).getPropertyValue('--text')` → `#000000`
   - `getComputedStyle(document.documentElement).getPropertyValue('--panel')` → `#f3f3f3`
   - `getComputedStyle(document.documentElement).getPropertyValue('--accent')` → `#007acc`
4. **Expected**: All values match [data-model.md ThemePalette](data-model.md)

---

## Scenario 5: Dark Theme Colors

**Goal**: Verify Dark theme matches VS Code Dark+ palette.

1. Select Dark theme from config menu
2. Inspect computed CSS variables:
   - `--bg` → `#1e1e1e`
   - `--text` → `#d4d4d4`
   - `--panel` → `#252526`
   - `--accent` → `#007acc`
3. **Expected**: All values match [data-model.md ThemePalette](data-model.md)

---

## Scenario 6: Functional Colors Unchanged

**Goal**: Verify heatmap and diagram colors are not affected by theme changes.

1. Open `http://localhost:8080/input.html` and load a CSV or enter dummy data so the grid is populated
2. Switch between Light and Dark themes
3. **Expected**: Grid cell colors (green/orange/red scoring, blue required positions) are identical in both themes
4. Open `http://localhost:8080/report.html`
5. **Expected**: Bolt position diagram color coding (purple compromise indicator) is identical in both themes
6. Inspect `--green`, `--orange`, `--red`, `--blue`, `--purple` CSS variables — they MUST NOT change between themes

---

## Scenario 7: Typography Consistency

**Goal**: Verify the three typography styles are consistent across all pages.

1. Open index.html, input.html, report.html side by side (three browser tabs)
2. Compare:
   - Page title `<h1>` size and weight — must match across all pages
   - Section headings (`<h2>`, `.navbar .title`) — must match
   - Body/description text and button labels — must match
3. DevTools: inspect `font-size` and `font-weight` on representative elements
4. **Expected**: All `<h1>` = 1.4rem/700; all `<h2>`/sub-headers = 1.0rem/600; all body = 0.875rem/400

---

## Scenario 8: Regression — All Existing Tests Pass

**Goal**: Verify no existing functionality broken.

```bash
npm run test:all-sync
```

**Expected**: All 149 tests pass. Zero failures, zero timeouts.

---

## Scenario 9: Invalid localStorage Value

**Goal**: Verify graceful fallback on corrupt storage.

1. Set an invalid value: `localStorage.setItem('angularity-theme', 'solarized')`
2. Hard-reload any page
3. **Expected**: Page renders in white-label base state (no `data-theme` attribute on `<html>`)
4. No JavaScript console errors

---

## Scenario 10: Config Menu Accessibility

**Goal**: Verify config menu works at all viewport widths.

1. Open DevTools device toolbar, set width to 375px (mobile)
2. **Expected**: Gear icon (config menu trigger) is visible and tappable
3. **Expected**: Theme dropdown is usable at narrow viewport
4. Switch themes at narrow viewport
5. **Expected**: Theme applies correctly

---

## Run New Theme Tests

After implementation, the new test suite validates Scenarios 1–5 and 9 automatically:

```bash
npx jest tests/theme/theme-switching.test.js
```

**Expected**: All new theme tests pass.
