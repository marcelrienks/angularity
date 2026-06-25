---

description: "Task list for White-Label Theming System implementation"
---

# Tasks: White-Label Theming System

**Input**: Design documents from `specs/001-white-label-theming/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: Included per Constitution Principle III (every shipped feature MUST have Puppeteer integration tests).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US5)
- Exact file paths included in every task

---

## Phase 1: Setup

**Purpose**: Audit existing code to establish a clear baseline before changes begin.

- [x] T001 Audit `site/css/shared.css` — produce inline comment inventory separating functional variables (`--green`, `--orange`, `--red`, `--blue`, `--purple`, `--req-band`, `--req-band-hdr`) from non-functional decorative variables
- [x] T002 [P] Audit `site/index.html`, `site/input.html`, `site/report.html` — list all inline `style="..."` attributes that use hard-coded colors or `var(--*)` references for documentation before changes

**Checkpoint**: Baseline documented — safe to begin CSS restructure.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: CSS variable infrastructure that ALL user stories depend on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: Theme switching, white-label base, typography, and both themes all build on this foundation.

- [x] T003 Remove `@import url('https://fonts.googleapis.com/...')` from `site/css/shared.css` and replace with system monospace font stack: `ui-monospace, 'Cascadia Code', 'Cascadia Mono', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace`
- [x] T004 Replace `:root` decorative color variables in `site/css/shared.css` with CSS system color white-label defaults: `--bg: Canvas`, `--panel: rgba(0,0,0,0.04)`, `--text: CanvasText`, `--muted: GrayText`, `--border: ButtonBorder`, `--accent: Highlight`, `--hover: rgba(0,0,0,0.06)`, `--selection: rgba(0,0,0,0.10)` — keep `--green`, `--orange`, `--red`, `--blue`, `--purple`, `--req-band`, `--req-band-hdr`, `--shadow` unchanged
- [x] T005 [P] Add `[data-theme="light"]` block to `site/css/shared.css` with VS Code Light+ palette: `--bg:#FFFFFF`, `--panel:#F3F3F3`, `--text:#000000`, `--muted:#767676`, `--border:#D4D4D4`, `--accent:#007ACC`, `--hover:#E8E8E8`, `--selection:#E5EBF1`
- [x] T006 [P] Add `[data-theme="dark"]` block to `site/css/shared.css` with VS Code Dark+ palette: `--bg:#1E1E1E`, `--panel:#252526`, `--text:#D4D4D4`, `--muted:#A6A6A6`, `--border:#3A3D41`, `--accent:#007ACC`, `--hover:#2D2D30`, `--selection:#3A3D41`
- [x] T007 Add typography scale variables to `:root` in `site/css/shared.css`: `--font-size-h:1.4rem`, `--font-size-sh:1.0rem`, `--font-size-p:0.875rem`
- [x] T008 Create `site/js/theme-manager.js` with: (a) exported `initTheme()` function that reads `localStorage.getItem('angularity-theme')`, validates value is `'light'`|`'dark'`, and calls `document.documentElement.setAttribute('data-theme', value)`; (b) exported `setTheme(value)` function that validates, writes to localStorage, and applies the attribute; (c) exported `buildConfigMenu()` that creates the gear button and dropdown DOM nodes (do not attach to document yet)

**Checkpoint**: CSS variable infrastructure complete — user story implementation can begin.

---

## Phase 3: User Story 1 — Switch Between Themes (Priority: P1) 🎯 MVP

**Goal**: User can open config menu, select Light or Dark theme, see immediate color change, with preference persisted across navigation and reload.

**Independent Test**: Open any page, click gear icon (top-right), select Dark — page background must become `#1E1E1E`. Reload — dark theme must be present immediately with no flash. See quickstart.md Scenarios 2 and 3.

### Tests for User Story 1 (Constitution Principle III — REQUIRED)

- [x] T009 [US1] Write Puppeteer tests in `tests/theme/theme-switching.test.js` covering: config menu visibility, theme selection applies correct CSS variable values, localStorage persistence across navigation, FOUC prevention on reload, invalid localStorage value fallback (quickstart.md Scenarios 1–3, 9)

### Implementation for User Story 1

- [x] T010 [US1] Add FOUC-prevention inline `<script>` to `<head>` of `site/index.html` — must appear before the CSS `<link>` tag: reads `localStorage.getItem('angularity-theme')`, sets `document.documentElement.setAttribute('data-theme', value)` if valid
- [x] T011 [P] [US1] Add identical FOUC-prevention inline `<script>` to `<head>` of `site/input.html`
- [x] T012 [P] [US1] Add identical FOUC-prevention inline `<script>` to `<head>` of `site/report.html`
- [x] T013 [US1] Add config menu HTML to `site/index.html` — fixed top-right `<div id="theme-config">` containing `<button id="theme-toggle">⚙</button>` and `<div id="theme-dropdown">` with Light and Dark buttons; add `<script src="js/theme-manager.js" defer></script>` before `</body>`
- [x] T014 [P] [US1] Add identical config menu HTML and script tag to `site/input.html`
- [x] T015 [P] [US1] Add identical config menu HTML and script tag to `site/report.html`
- [x] T016 [US1] Implement `buildConfigMenu()` attachment and event listeners in `site/js/theme-manager.js`: on DOMContentLoaded call `buildConfigMenu()`, attach to document body, wire Light/Dark buttons to call `setTheme()`, wire gear button to toggle dropdown visibility, wire document click-outside to close dropdown
- [x] T017 [US1] Add `.theme-config` and `.theme-dropdown` CSS rules to `site/css/shared.css` — fixed position top-right, z-index above all content, dropdown panel using `--panel`, `--border`, `--text` variables, button hover using `--hover`

**Checkpoint**: Theme switching fully functional. Config menu visible on all pages. Dark/Light toggle persists across reloads and navigation. 

---

## Phase 4: User Story 2 — White-Label Base (Priority: P2)

**Goal**: With no theme selected (localStorage cleared), all pages render usably with no decorative brand colors, gradients, or shadows. Functional color coding unchanged.

**Independent Test**: Clear localStorage, hard-reload each page — no dark background (`#12171e`), no `Share Tech Mono` Google Font loading in Network tab. Heatmap and bolt diagram colors unchanged. See quickstart.md Scenarios 1 and 6.

- [x] T018 [US2] Replace all hard-coded color values in `site/css/shared.css` selectors that use non-functional decoration (background colors on `.navbar`, `.page-header`, `.home-card`, `.error-banner`, etc.) — replace with CSS variable references (`var(--bg)`, `var(--panel)`, `var(--border)`, `var(--text)`, `var(--muted)`)
- [x] T019 [US2] Replace all remaining hard-coded `color:`, `background:`, `background-color:`, `border-color:`, `box-shadow:` CSS property values in `site/css/shared.css` that are not functional colors — use the appropriate `var(--*)` reference
- [x] T020 [P] [US2] Replace inline `style="..."` hard-coded color values in `site/index.html` with CSS variable references; move any layout-only inline styles to `site/css/shared.css` rule classes
- [x] T021 [P] [US2] Replace inline `style="..."` hard-coded color values in `site/input.html` with CSS variable references; move layout-only inline styles to `site/css/shared.css`
- [x] T022 [P] [US2] Replace inline `style="..."` hard-coded color values in `site/report.html` with CSS variable references; move layout-only inline styles to `site/css/shared.css`
- [x] T023 [US2] Verify `--green`, `--orange`, `--red`, `--blue`, `--purple`, `--req-band`, `--req-band-hdr` remain unchanged in `:root` of `site/css/shared.css` and are NOT referenced in any `[data-theme]` block

**Checkpoint**: White-label base clean. Pages usable without a theme. Functional colors intact.

---

## Phase 5: User Story 3 — Consistent Typography Across Pages (Priority: P3)

**Goal**: All three pages use identical font-size and font-weight for Header, Sub-header, and Paragraph elements.

**Independent Test**: Open index.html, input.html, report.html side by side. Compare `<h1>`, `.navbar .title`, and body text — all must be visually identical in size and weight per element type. See quickstart.md Scenario 7.

- [x] T024 [US3] Apply Header style to `site/css/shared.css` — all `h1`, `.page-header h1`, `.card-heading` must use `font-size: var(--font-size-h)` and `font-weight: 700`; remove any per-selector font-size overrides for these elements
- [x] T025 [US3] Apply Sub-header style to `site/css/shared.css` — all `h2`, `h3`, `.navbar .title`, `.section-title`, `[role="tab"]`, `.wheel-tab`, `.tab-btn` must use `font-size: var(--font-size-sh)` and `font-weight: 600`; remove any per-selector overrides
- [x] T026 [US3] Apply Paragraph style to `site/css/shared.css` — `body`, `p`, `label`, `.card-desc`, `.subtitle`, `button`, `input`, `select`, `textarea`, `.muted`, `.nav-links a` must use `font-size: var(--font-size-p)` and `font-weight: 400`; remove any per-selector overrides
- [x] T027 [P] [US3] Remove per-element `font-size` and `font-weight` inline style attributes from `site/index.html` (those overriding the stylesheet — not layout styles)
- [x] T028 [P] [US3] Remove per-element `font-size` and `font-weight` inline style attributes from `site/input.html`
- [x] T029 [P] [US3] Remove per-element `font-size` and `font-weight` inline style attributes from `site/report.html`
- [x] T030 [US3] Standardize non-functional text color: any CSS rule using a hard-coded non-functional text color must switch to `var(--text)` (primary) or `var(--muted)` (secondary) in `site/css/shared.css`

**Checkpoint**: Typography consistent. Side-by-side page comparison shows uniform heading/body sizing.

---

## Phase 6: User Story 4 — Light Theme (VS Code Light+) (Priority: P4)

**Goal**: Selecting Light theme applies the full VS Code Light+ palette site-wide. All pages legible. Functional colors unchanged.

**Independent Test**: Select Light theme — inspect `--bg` = `#FFFFFF`, `--text` = `#000000`, `--panel` = `#F3F3F3`, `--accent` = `#007ACC` via browser DevTools. See quickstart.md Scenario 4.

- [x] T031 [US4] Verify `[data-theme="light"]` block in `site/css/shared.css` covers all eight palette variables from data-model.md ThemePalette Light+ section; add any missing variables
- [x] T032 [US4] Audit Light theme visual QA: open all three pages with Light theme active, check all interactive elements (buttons, active nav link, tabs, form inputs, dropdowns) use `--accent` or `--hover` correctly; fix any selector that still uses a hard-coded non-functional color in light mode

**Checkpoint**: Light theme complete and visually consistent across all pages.

---

## Phase 7: User Story 5 — Dark Theme (VS Code Dark+) (Priority: P5)

**Goal**: Selecting Dark theme applies the full VS Code Dark+ palette site-wide. All pages legible. Functional colors unchanged.

**Independent Test**: Select Dark theme — inspect `--bg` = `#1E1E1E`, `--text` = `#D4D4D4`, `--panel` = `#252526`, `--accent` = `#007ACC` via browser DevTools. See quickstart.md Scenario 5.

- [x] T033 [US5] Verify `[data-theme="dark"]` block in `site/css/shared.css` covers all eight palette variables from data-model.md ThemePalette Dark+ section; add any missing variables
- [x] T034 [US5] Audit Dark theme visual QA: open all three pages with Dark theme active, check all interactive elements use correct dark palette variables; fix any selector that uses a hard-coded light color that would be invisible on dark background

**Checkpoint**: Dark theme complete and visually consistent across all pages.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Regression validation, mobile accessibility, and final integration verification.

- [x] T035 Verify functional colors invariant across themes: open report.html and input.html in both Light and Dark themes — `--green`, `--orange`, `--red`, `--blue`, `--purple` values must be identical; see quickstart.md Scenario 6
- [x] T036 [P] Config menu mobile accessibility: verify gear button visible and tappable at 375px viewport width; dropdown usable at narrow width; see quickstart.md Scenario 10
- [x] T037 Run new theme tests: `npx jest tests/theme/theme-switching.test.js` — all theme tests must pass
- [x] T038 Run full regression: `npm run test:all-sync` — all 149 existing tests must pass (constitution Principle III gate)
- [x] T039 Validate quickstart.md Scenarios 1–10 manually — document any failures and fix before merge

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2; no dependency on US2/US3/US4/US5
- **US2 (Phase 4)**: Depends on Phase 2; independent of US1 (but benefits from US1 CSS variables)
- **US3 (Phase 5)**: Depends on Phase 2; independent of US1/US2
- **US4 (Phase 6)**: Depends on Phase 2 (T005 specifically); T031/T032 are refinement/QA only
- **US5 (Phase 7)**: Depends on Phase 2 (T006 specifically); T033/T034 are refinement/QA only
- **Polish (Phase 8)**: Depends on all user stories complete

### Within Each User Story

- Tests (T009) must be written before implementation tasks T010–T017 for US1
- T003 (font removal) must complete before T026 (typography) references font variables
- T004 (white-label base variables) must complete before T018–T022 (white-label cleanup) or CSS will break
- T005/T006 (theme blocks) are independent of each other — run in parallel

### Parallel Opportunities

- T005 and T006 (light + dark theme CSS blocks): parallel
- T011 and T012 (FOUC script in input.html + report.html): parallel after T010
- T014 and T015 (config menu HTML in input.html + report.html): parallel after T013
- T020, T021, T022 (inline style cleanup per page): parallel
- T027, T028, T029 (font override removal per page): parallel
- T036 (mobile QA): parallel with T037

---

## Parallel Example: User Story 1

```bash
# After T010 (FOUC script in index.html), run T011 + T012 in parallel:
Task T011: Add FOUC script to site/input.html
Task T012: Add FOUC script to site/report.html

# After T013 (config menu in index.html), run T014 + T015 in parallel:
Task T014: Add config menu to site/input.html
Task T015: Add config menu to site/report.html
```

## Parallel Example: User Story 2

```bash
# After T018 + T019 (shared.css inline color cleanup), run in parallel:
Task T020: Fix inline styles in site/index.html
Task T021: Fix inline styles in site/input.html
Task T022: Fix inline styles in site/report.html
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundation (T003–T008)
3. Complete Phase 3: US1 Theme Switching (T009–T017)
4. **STOP and VALIDATE**: Theme switching works, persists, no FOUC
5. Site already functional with both themes at this point

### Incremental Delivery

1. Phase 1 + 2 → CSS variable infrastructure ready
2. Phase 3 (US1) → Theme switching ✅ (site is themeable)
3. Phase 4 (US2) → White-label base clean ✅
4. Phase 5 (US3) → Typography consistent ✅
5. Phase 6 (US4) → Light+ theme verified ✅
6. Phase 7 (US5) → Dark+ theme verified ✅
7. Phase 8 → Regression clean, all tests pass ✅ → merge to main

### Single Developer Strategy

Work top to bottom. Each phase checkpoint is a stable, committable state. Commit after each checkpoint. Never commit a broken CSS state.

---

## Notes

- `[P]` tasks = different files, no shared state conflicts
- Functional colors (`--green`, `--orange`, `--red`, `--blue`, `--purple`, `--req-band`, `--req-band-hdr`) are treated as constants — never modify them in this feature
- The FOUC inline script MUST appear in `<head>` BEFORE the `<link rel="stylesheet">` tag — order matters
- `theme-manager.js` must use `defer` attribute so it runs after DOM is parsed
- Do not add a "White Label" or "Default" option to the config menu — the unthemed state is not user-selectable
- Config menu z-index must be higher than all existing elements (current CSS has no explicit z-index stacking; use `z-index: 1000`)
