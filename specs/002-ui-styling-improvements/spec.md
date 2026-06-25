# Feature Specification: UI Styling Improvements

**Feature Branch**: `002-ui-styling-improvements`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "UI-only improvements for vehicle suspension alignment website. Site has: index (explanations, configs, constants), report input page (wheel measurements, eccentric bolt adjustment points), report output page (data display, positioning suggestions, bolt/washer diagrams). Design system: Header/SubHeader/Paragraph CSS classes, light/dark theme, no inline styles. Goal: improve styling, usability, and visual appeal while staying simple, clean, CSS-controlled. Usability and simplicity remain the primary priorities."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comfortable Reading Across All Pages (Priority: P1)

A user opens the app on a desktop browser to review their alignment data and read the configuration explanations. Currently the paragraph text is very small (0.75rem) and line heights are tight, causing eye strain when reading multi-sentence descriptions on the home page and report output.

**Why this priority**: Readable text is the foundation of usability. Every page is affected. No other improvement matters if text is painful to read.

**Independent Test**: Open index.html, input.html, and report.html. Read paragraph-level descriptions without squinting or zooming. Comfortable reading at normal viewing distance.

**Acceptance Scenarios**:

1. **Given** the user opens index.html at default zoom, **When** they read the card descriptions and configuration notes, **Then** the text is legible without zoom and lines do not feel cramped
2. **Given** the user views the report output page, **When** they read the symmetry analysis notes and status messages, **Then** all paragraph-level text is comfortably sized and spaced
3. **Given** the user switches between light and dark themes, **When** they read paragraph text in either theme, **Then** contrast and sizing remain comfortable in both modes

---

### User Story 2 - Consistent Visual Appearance Across Themes (Priority: P2)

A user switches between dark and light theme while working. Some table borders and UI elements appear with wrong colors in one theme — specifically hard-coded dark hex colors that look correct in dark mode but create poor contrast in light mode.

**Why this priority**: Theme switching is a first-class feature. Broken colors in one theme undermine trust in the UI. Affects data tables visible on every report page view.

**Independent Test**: Switch to light theme. Open report.html and inspect the 13×13 data table row borders and spec table borders. All borders should use theme-aware values, not fixed dark hex codes.

**Acceptance Scenarios**:

1. **Given** the user activates light theme, **When** they view any data table, **Then** all cell borders and dividers are visible and use appropriate light-theme contrast
2. **Given** the user activates dark theme, **When** they view any data table, **Then** borders remain visible and no colors appear washed out
3. **Given** the user activates the system default (no explicit theme set), **When** they view tables, **Then** borders use the system-appropriate color

---

### User Story 3 - Clean Form Layout Without Visual Glitches (Priority: P3)

A user opens the configuration section on the home page to adjust targets and vehicle configs. Some form sections have inconsistent backgrounds caused by a missing CSS variable (`--bg-light` referenced in fieldsets but never defined), resulting in fallback/transparent backgrounds that break visual grouping.

**Why this priority**: Config forms are used every session to tune alignment targets. Visual consistency of form sections makes it clear which inputs belong together.

**Independent Test**: Open index.html. Navigate to both the Targets and Configs tabs. All fieldset groups should have a consistent, visible background that distinguishes them from the surrounding panel.

**Acceptance Scenarios**:

1. **Given** the user opens the Targets tab, **When** they view the Front Axle and Rear Axle fieldsets, **Then** each fieldset has a consistent background that visually groups its fields
2. **Given** the user opens the Configs tab, **When** they view the Vehicle Configs and Derived Configs fieldsets, **Then** backgrounds are consistent and match the design system panel colors
3. **Given** either light or dark theme is active, **When** the user views form fieldsets, **Then** the background tint is appropriate and visible in both themes

---

### User Story 4 - Inline Style Elimination for Design System Integrity (Priority: P4)

A developer (or future AI agent) modifying the site expects all visual presentation to be controlled from `shared.css`. Currently several inline `style` attributes in `index.html` control layout and visibility (flex direction, gap, padding, display toggling). This means CSS-only theming or bulk visual changes require editing HTML rather than just CSS.

**Why this priority**: Maintaining the CSS-controlled design system is a stated project requirement. Inline styles are a maintenance risk and violate the system. Lower priority than user-facing readability but important for long-term consistency.

**Independent Test**: Inspect index.html source. No presentation-related `style` attributes should remain on any element (except JavaScript-toggled `display:none` which is behavioural, not presentational).

**Acceptance Scenarios**:

1. **Given** a developer inspects index.html, **When** they search for `style="` attributes on layout/spacing elements, **Then** no inline styles controlling visual presentation (gaps, padding, flex direction, colours) are found
2. **Given** the same visual appearance as before, **When** only the CSS file is edited, **Then** spacing and layout of the config section can be adjusted without touching HTML
3. **Given** the JavaScript-toggled `display:none` on hidden panels, **When** JavaScript toggles visibility, **Then** this remains functional (behavioural display toggling is acceptable; visual presentation is not)

---

### User Story 5 - Visual Appeal and Polish Across All Pages (Priority: P5)

A user opens the app for the first time or after a long break. The site currently works well but feels visually flat — section panels lack presence, spacing between elements is inconsistent, primary action buttons do not stand out from secondary ones, and read-only computed values in forms look identical to editable inputs. The site should feel polished and professional while remaining simple and tool-like.

**Why this priority**: Usability fixes (P1–P4) come first. Visual appeal is additive — it must not introduce complexity, clutter, or visual noise. Every aesthetic change must make the interface clearer, not busier. Scope is intentionally bounded: no layout restructuring, no new fonts, no icons, no animations beyond existing transitions.

**Independent Test**: Open all three pages in both light and dark themes. The site should feel visually coherent and intentional — consistent spacing rhythm, clear distinction between primary and secondary actions, sections that feel bounded and purposeful. A first-time visitor should understand the page structure without hunting.

**Acceptance Scenarios**:

1. **Given** the user opens index.html, **When** they scan the page, **Then** the home navigation cards, configuration section, and page header each feel visually distinct with clear separation and consistent spacing
2. **Given** the user views the report output page, **When** they scan the chart, heatmap, washer, and symmetry sections, **Then** each section panel has visual presence (not just a flat bordered box) with a clear heading hierarchy
3. **Given** the user is on the configuration form (index.html), **When** they identify which button saves their data, **Then** the primary save action is clearly more visually prominent than the reset/danger action
4. **Given** the user is on the Configs tab, **When** they view derived/computed values (effective wheel angle, caster multiplier, bolt range), **Then** those read-only display values are visually distinct from editable input fields — clearly not interactive
5. **Given** the user uses keyboard navigation, **When** they tab through form inputs and buttons, **Then** focus states are visibly clear and styled (not just browser defaults), consistent across all interactive elements
6. **Given** the user views any page, **When** they compare the spacing between sections, within forms, and around headings, **Then** spacing feels consistent and rhythmic — not arbitrary
7. **Given** the user switches between light and dark theme, **When** they compare overall visual appeal, **Then** both themes feel equally polished — neither looks like an afterthought

---

### Edge Cases

- What happens to form fieldset backgrounds if neither light nor dark theme is explicitly set (system default Canvas color)?
- How does inline style removal for radio button groups affect their layout in very narrow viewports?
- Does removing inline styles for hidden panels break any JavaScript that checks `style.display` to determine visibility state?
- Do spacing rhythm changes affect the 13×13 input grid scroll behaviour or cell sizing?
- Does making primary buttons more prominent require any changes beyond CSS (e.g., adding class attributes to existing button elements)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All paragraph-level text across all three pages MUST be legible at normal desktop viewing distance without browser zoom
- **FR-002**: All table cell borders and dividers MUST use CSS variable-based color values; no hard-coded hex color values in border properties
- **FR-003**: The `--bg-light` CSS variable MUST be defined in the design system, or all references to it MUST be replaced with an equivalent defined variable
- **FR-004**: All form fieldsets in the Targets and Configs sections MUST display a visually distinct background that groups their contents, consistent across light and dark themes
- **FR-005**: Inline `style` attributes controlling visual presentation (layout, spacing, color, padding) MUST be removed from index.html and replaced with CSS classes
- **FR-006**: JavaScript-toggled `display:none` on tab panels MUST continue to function correctly after inline style removal
- **FR-007**: The global line height MUST be set to a value that prevents line cramping in paragraph text
- **FR-008**: All changes MUST be made exclusively in `shared.css` and HTML class attributes; no new CSS files, no JavaScript changes, no inline styles introduced
- **FR-009**: A CSS spacing scale MUST be defined as CSS variables (e.g., `--space-xs` through `--space-xl`) and used to enforce consistent vertical rhythm between sections, within forms, and around headings across all three pages
- **FR-010**: Content section panels (chart, heatmap, washer, symmetry sections on report page) MUST have a visually distinct header treatment that gives each section clear presence — using only CSS properties already in the design system (border accent, background, or spacing)
- **FR-011**: The primary save action button on each form MUST be visually more prominent than secondary and danger buttons — distinguishable by color, weight, or contrast without requiring additional text or icons
- **FR-012**: Read-only computed values in the Derived/Fixed Configs fieldset MUST be visually distinct from editable input fields — styled to clearly communicate non-interactivity (e.g., different background, no border, or muted styling)
- **FR-013**: Focus states for all interactive elements (inputs, buttons, selects, links) MUST be visibly styled beyond browser defaults, using CSS variables from the design system, and consistent across all three pages

### Key Entities

- **Typography Scale**: The three semantic CSS classes (`.header`, `.sub-header`, `.paragraph`) and their font-size/weight/color CSS variables — the foundation all text presentation is built on
- **CSS Variable Set**: The `--bg`, `--panel`, `--panel-alt`, `--panel-deep`, `--border`, `--text`, `--muted` variables and their light/dark theme overrides — must remain complete and coherent
- **Theme Pair**: Light theme (`[data-theme="light"]`) and dark theme (`[data-theme="dark"]`) overrides plus the system-default `:root` values — all three states must be correct after changes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can read all paragraph-level content on all three pages without adjusting browser zoom from the default 100%
- **SC-002**: Switching between light and dark themes produces no visible color artifacts (wrong-contrast borders, invisible dividers, or missing backgrounds) on any page
- **SC-003**: Every form fieldset on index.html is visually distinct from its surrounding panel in both themes, with no transparent or missing background
- **SC-004**: Searching index.html source for `style="` returns zero matches on elements whose styling is presentational (layout, spacing, color), while JavaScript-driven display toggling continues to work
- **SC-005**: The full existing Puppeteer integration test suite (149-test baseline) passes without modification after UI changes are applied
- **SC-006**: A first-time user can identify the primary action button on any form without reading its label — visual prominence alone distinguishes it from secondary controls
- **SC-007**: Spacing between major sections, between form groups, and around headings follows a consistent visual rhythm across all three pages — no element feels arbitrarily placed
- **SC-008**: Read-only computed values in the Configs section are immediately recognizable as non-editable by appearance alone, without requiring any tooltip, label, or explanation
- **SC-009**: All interactive elements display a visible, styled focus indicator when reached via keyboard — the focused element is unambiguous at a glance

## Assumptions

- Changes are limited to `shared.css` and class attribute additions in HTML files; no new files, no JavaScript edits
- The 13×13 data grid on the input page and report page must remain functionally identical — only visual properties change
- `--bg-light` was intended to equal `var(--panel)` or `var(--panel-alt)` based on context; the correct replacement will be determined by visual inspection
- Mobile/responsive breakpoints already in place are preserved and not modified
- The monospace font family and overall VS Code-inspired aesthetic are intentional and must not change
- Existing Puppeteer tests cover behaviour, not pixel-perfect styling — they will still pass after font size or spacing adjustments
- The three JS-toggled tab panels (Targets/Configs on index.html) use `style.display` toggling via JavaScript and this mechanism must remain intact
- Visual appeal improvements must not introduce visual noise — every added visual element must reduce ambiguity or improve hierarchy, not merely decorate
- The monospace font, VS Code-inspired colour palette, and overall "tool" aesthetic are intentional brand decisions and must not change in character
- Spacing scale variables are additive — existing hardcoded pixel values in CSS are replaced progressively; no regression in layout is acceptable
- Primary button prominence is achieved through the existing `.button.primary` CSS class pattern — save buttons may require adding this class in HTML
