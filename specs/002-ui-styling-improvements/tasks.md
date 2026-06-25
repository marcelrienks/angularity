# Tasks: UI Styling Improvements

**Input**: Design documents from `specs/002-ui-styling-improvements/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

**Tests**: No test tasks — spec does not request TDD. Verification is visual + existing Puppeteer baseline.

**Organization**: Tasks grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on in-progress tasks)
- **[Story]**: User story label from spec.md (US1–US5)
- All tasks include exact file paths and line numbers from research.md

---

## Phase 1: Setup

**Purpose**: Confirm baseline before any changes

- [X] T001 Run `npm run test:all-sync` from repo root, confirm ≥ 149 tests pass and `npm start` serves all 3 pages at `http://localhost:8080/site/`

**Checkpoint**: Baseline confirmed — safe to begin changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: CSS spacing scale variables must exist before utility classes in US4/US5 can reference them

**⚠️ CRITICAL**: US4 and US5 utility classes depend on `var(--space-*)` — complete this before Phase 6 or 7

- [X] T002 Add 6 spacing scale variables to `:root` block in `site/css/shared.css` — after existing `--info` and `--success` lines (currently line 76–77): `--space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px; --space-2xl: 48px`

**Checkpoint**: Spacing tokens exist — US4/US5 CSS classes can now reference them

---

## Phase 3: User Story 1 — Comfortable Reading (Priority: P1) 🎯 MVP

**Goal**: Paragraph text legible at 100% zoom on all pages; no cramped line spacing

**Independent Test**: Open `http://localhost:8080/site/index.html`, read card descriptions and form notes without zooming. DevTools computed font-size on any `.paragraph` element should be 14px.

- [X] T003 [US1] Change `--font-size-p` value from `0.75rem` to `0.875rem` in `:root` block in `site/css/shared.css` (currently line 71)
- [X] T004 [US1] Add `line-height: 1.6` to the `body` rule in `site/css/shared.css` (currently line 114–120) — insert after `font-family` declaration

**Checkpoint**: US1 complete — verify quickstart.md Scenario 1 (all 3 pages readable at 100% zoom)

---

## Phase 4: User Story 2 — Consistent Visual Across Themes (Priority: P2)

**Goal**: No hard-coded dark hex colors in borders; all table cell borders theme-aware

**Independent Test**: Switch to Light theme, open report.html, inspect data table rows — borders must be light grey `#D4D4D4`, not dark `#21262d`

- [X] T005 [US2] Replace `border-bottom: 1px solid #21262d` with `border-bottom: 1px solid var(--border)` in `.data-table td` rule in `site/css/shared.css` (line 727)
- [X] T006 [US2] Replace `border-bottom: 1px solid #21262d` with `border-bottom: 1px solid var(--border)` in `.spec-table td` rule in `site/css/shared.css` (line 2199)

**Checkpoint**: US2 complete — verify quickstart.md Scenario 2 (light theme table borders correct)

---

## Phase 5: User Story 3 — Clean Form Backgrounds (Priority: P3)

**Goal**: Form fieldsets have consistent visible background; no transparent/missing grouping

**Independent Test**: Open index.html Targets tab — Front Axle and Rear Axle fieldsets must have a visible tinted background. DevTools computed `background` on `.form-fieldset` must not be `rgba(0,0,0,0)`.

- [X] T007 [US3] Replace `background: var(--bg-light)` with `background: var(--panel-alt)` in `.targets-group` rule in `site/css/shared.css` (line 2238)
- [X] T008 [US3] Replace `background: var(--bg-light)` with `background: var(--panel-alt)` in `.form-fieldset` rule in `site/css/shared.css` (line 2281)

**Checkpoint**: US3 complete — verify quickstart.md Scenario 3 (fieldset backgrounds visible in both themes)

---

## Phase 6: User Story 4 — Inline Style Elimination (Priority: P4)

**Goal**: Zero presentational `style=` attributes in index.html; all presentation controlled from shared.css

**Independent Test**: Search `site/index.html` for `style=` — only 3 JS-toggled `display:none` entries remain (on `#error-banner`, `#configs-panel`, `#wheel-degrees-group`)

### CSS additions (must precede HTML edits)

- [X] T009 [US4] Add 4 utility classes to the Form Utilities section in `site/css/shared.css` (after `.form-note` rule, around line 128):
  - `.display-value { padding: var(--space-sm) 0; color: var(--muted); font-style: italic; }`
  - `.radio-group { display: flex; gap: var(--space-md); align-items: center; padding: var(--space-xs) 0; }`
  - `.radio-label { display: flex; gap: var(--space-xs); align-items: center; }`
  - `.tabs-spacer { margin-bottom: var(--space-md); }`
- [X] T010 [US4] Add `.form-group select` rule to the Form Styles section in `site/css/shared.css` (after `.form-group input:focus` rule, around line 2316): `padding: 6px 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--panel); font-family: inherit; color: var(--text);`

### HTML edits in site/index.html (depend on T009, T010)

- [X] T011 [US4] Remove `style="margin-bottom:16px;"` from `#config-tabs` div at line 68 in `site/index.html`; add class `tabs-spacer` to its class list (becomes `class="wheel-selector tabs-spacer"`)
- [X] T012 [US4] Remove `style="display:flex; gap:16px; align-items:center; padding:6px 0;"` from radio group wrapper div at line 120 in `site/index.html`, add class `radio-group`; remove `style="display:flex; gap:6px; align-items:center;"` from both radio `<label>` elements at lines 121 and 125, add class `radio-label` to each
- [X] T013 [US4] Remove `style="padding:10px 0;"` from all 5 computed display divs in `site/index.html` and add class `display-value` to each: `#steering-sweep-display` (line 145), `#effective-wheel-angle-display` (line 163), `#caster-multiplier-display` (line 167), `#bolt-range-display` (line 171), `#required-points-display` (line 175)
- [X] T014 [US4] Remove `style="padding:6px 10px; border:1px solid var(--border); border-radius:4px; background:var(--panel);"` from `#measurement-density-select` at line 149 in `site/index.html` (element now styled by `.form-group select` rule from T010)

**Checkpoint**: US4 complete — verify quickstart.md Scenario 4 (zero presentational inline styles remain)

---

## Phase 7: User Story 5 — Visual Appeal and Polish (Priority: P5)

**Goal**: Polished, visually coherent UI — prominent primary buttons, visible section hierarchy, clear read-only values, consistent keyboard focus states

**Independent Test**: Open all 3 pages in both themes. Save buttons are solid blue. Each report section panel has a blue top accent. Tab through interactive elements — each focused element shows clear blue outline. Computed display values in Configs tab appear muted/italic vs editable inputs.

### Button prominence

- [X] T015 [US5] Add class `primary` to `#btn-save-targets` button at line 104 in `site/index.html` (becomes `class="button primary sub-header"`) and to `#btn-save-configs` button at line 180 (same class addition)
- [X] T016 [P] [US5] Add class `primary` to `#btn-download` button at line 58 in `site/input.html` (becomes `class="button primary sub-header"`)

### Section visual hierarchy

- [X] T017 [US5] Add `border-top: 3px solid var(--blue)` to the existing `.chart-section`, `.heatmap-section`, `.washer-section`, `.symmetry-section`, and `.sessions-section` rules in `site/css/shared.css` — each already has `border: 1px solid var(--border)`; add the top accent alongside the existing border declaration in each rule

### Focus states

- [X] T018 [US5] Add global `:focus-visible` rule to the global/reset section at the top of `site/css/shared.css` (after `*, *::before, *::after` block, before the TYPOGRAPHY SYSTEM comment, around line 6): `:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }`

**Checkpoint**: US5 complete — verify quickstart.md Scenarios 5–8 (primary buttons, read-only values, focus states, section hierarchy)

---

## Phase 8: Polish & Verification

**Purpose**: Regression guard and full visual sign-off

- [X] T019 Run `npm run test:all-sync` from repo root; confirm all tests pass with count ≥ 149 and zero failures (constitution Principle III compliance)
- [X] T020 [P] Complete all 9 visual validation scenarios in `specs/002-ui-styling-improvements/quickstart.md` — run `npm start`, check each scenario in both light and dark themes
- [X] T021 [P] Search `site/index.html` for `style="` — confirm exactly 3 remain (JS-state only: `#error-banner` line 26, `#configs-panel` line 113, `#wheel-degrees-group` line 135) and zero presentational ones

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 passing — BLOCKS US4 and US5 CSS utility classes
- **US1 (Phase 3)**: Depends on Phase 1 only — can start independently of Phase 2
- **US2 (Phase 4)**: Depends on Phase 1 only — independent of all other stories
- **US3 (Phase 5)**: Depends on Phase 1 only — independent of all other stories
- **US4 (Phase 6)**: CSS tasks (T009, T010) depend on Phase 2 (spacing vars). HTML tasks (T011–T014) depend on T009, T010
- **US5 (Phase 7)**: T015, T016 depend on US4 HTML edits completing (same file). T017, T018 depend on Phase 2 only
- **Polish (Phase 8)**: Depends on all desired stories complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| US1 (T003–T004) | Phase 1 | US2, US3 (all different CSS changes) |
| US2 (T005–T006) | Phase 1 | US1, US3 |
| US3 (T007–T008) | Phase 1 | US1, US2 |
| US4 CSS (T009–T010) | Phase 2 | US1, US2, US3 (different file sections) |
| US4 HTML (T011–T014) | T009, T010 | T016 (input.html) |
| US5 buttons index (T015) | US4 HTML complete | T016 (input.html) |
| US5 button input (T016) | Phase 1 | Everything in index.html |
| US5 CSS (T017–T018) | Phase 2 | US4 HTML tasks |

### Within Each Story

- US4: CSS additions before HTML edits (T009, T010 → T011, T012, T013, T014)
- US5: No strict intra-story order (button classes, section accents, focus rule are independent)
- All stories: single shared.css file means sequential edits within any one story's CSS changes

### Parallel Opportunities

```
After Phase 1 (T001) completes:
  → T002 (Foundational: spacing vars)           [starts immediately]
  → T003+T004 (US1: font size + line height)    [starts immediately, different changes]
  → T005+T006 (US2: hex border fix)             [starts immediately, different changes]
  → T007+T008 (US3: --bg-light fix)             [starts immediately, different changes]

After T002 completes:
  → T009+T010 (US4 CSS classes)                 [unblocked]
  → T017+T018 (US5 CSS: sections + focus)       [unblocked]

After T009+T010 complete:
  → T011 → T012 → T013 → T014 (US4 HTML, sequential in same file)

After T014 completes:
  → T015 (US5: primary buttons in index.html)

T016 (US5: primary button in input.html):
  → Can start any time after Phase 1 — truly independent
```

---

## Parallel Example: US4 (Inline Style Elimination)

```
# Agent A: CSS utility classes (site/css/shared.css)
Task T009: Add .display-value, .radio-group, .radio-label, .tabs-spacer classes
Task T010: Add .form-group select rule

# Agent B: Independent file (site/input.html) — runs in parallel with Agent A
Task T016: Add primary class to #btn-download

# After Agent A completes T009+T010:
# Agent A continues with HTML edits (sequential in index.html)
Task T011 → T012 → T013 → T014 → T015
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 (T001) — verify baseline
2. Complete Phase 3 (T003, T004) — fix paragraph text
3. **STOP and VALIDATE**: Open all 3 pages at 100% zoom, confirm readability
4. Deployable improvement already in place

### Priority Bug-Fix Run (US1 + US2 + US3)

1. Phase 1 (T001)
2. US1: T003, T004
3. US2: T005, T006
4. US3: T007, T008
5. **STOP and VALIDATE**: quickstart.md Scenarios 1–3
6. Three latent bugs fixed, text readable, both themes correct

### Full Feature

1. Setup + Foundational (T001–T002)
2. US1 → US2 → US3 → US4 → US5 in order
3. Polish (T019–T021)
4. All 9 quickstart scenarios pass, 149 tests pass

---

## Notes

- All changes in `site/css/shared.css` and `site/*.html` — no new files, no JavaScript
- report.html has inline styles too but they are JS-driven state; not in scope (FR-005 targets index.html only)
- `.button.primary` CSS rule already exists at line 522 of shared.css — T015/T016 only add the HTML class attribute
- `:focus-visible` is broadly supported in all modern browsers; legacy `:focus` fallback not needed for this tool
- After T018 (section top accents): visually verify both themes — blue accent `#6ab4ff` should be visible in dark theme and not overwhelm in light theme
- Line numbers in task descriptions are approximate (based on current file state); use the selector/ID to locate if lines shift during editing
