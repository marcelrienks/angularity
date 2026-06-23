# Feature Specification: White-Label Theming System

**Feature Branch**: `001-white-label-theming`

**Created**: 2026-06-23

**Status**: Draft

**Input**: User description: "Remove all non-functional styling and design. Create a fully functional white-label website. Implement theme switching via a top-corner config menu (stored in localStorage). Standardize all formatting and styling consistently across pages with 3 font types. Implement VS Code Light+ and Dark+ themes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch Between Themes (Priority: P1)

A user visits any page on the site and wants to change the visual theme. They open a config menu in the top corner, select either Light or Dark theme, and the entire site immediately updates its colors to match the chosen theme. The preference is remembered on their next visit.

**Why this priority**: Theme switching is the core deliverable. Without it, the feature has no value. It must work before anything else matters.

**Independent Test**: Can be fully tested by visiting any page, opening the config menu, toggling the theme, and verifying the page colors update immediately. Delivers persistent personalization without any other stories.

**Acceptance Scenarios**:

1. **Given** any page is open with no prior theme preference, **When** the user opens the config menu in the top corner, **Then** a theme selector is visible showing at least Light and Dark options.
2. **Given** the config menu is open, **When** the user selects "Dark", **Then** the page immediately applies dark color values and the menu closes.
3. **Given** the user previously selected "Dark", **When** they navigate to another page or reload, **Then** the dark theme is applied without any visible flash of wrong colors.
4. **Given** the user previously selected "Light", **When** they navigate to another page or reload, **Then** the light theme is applied immediately.

---

### User Story 2 - White-Label Base (Priority: P2)

A developer or site owner opens the site with no theme preference set and sees a fully functional but completely unbranded, style-free white-label presentation. All pages are usable. No decorative colors, custom fonts, shadows, or brand-specific design elements are present. Functional color coding (heatmap grid, bolt position diagrams) remains intact and readable.

**Why this priority**: The white-label base is the foundation for both themes. Themes layer on top of it. If the base is not clean, both themes will be inconsistent.

**Independent Test**: Can be fully tested by clearing localStorage, opening each page (index, input, report), and verifying no decorative styling is present while all functional color coding remains visible and the pages are still usable.

**Acceptance Scenarios**:

1. **Given** no theme is selected, **When** any page loads, **Then** the page renders with no decorative background colors, no custom brand colors, and no ornamental design elements.
2. **Given** the white-label base, **When** the input page is open, **Then** the measurement grid displays its data-driven color coding unchanged.
3. **Given** the white-label base, **When** the report page is open, **Then** bolt diagram color coding (optimal/compromise/off-target indicators) remains unchanged and readable.
4. **Given** all three pages (index, input, report), **When** viewed in white-label state, **Then** all interactive elements (tabs, buttons, inputs) are clearly visible and functional.

---

### User Story 3 - Consistent Typography Across Pages (Priority: P3)

A user navigates between the index, input, and report pages and observes that all text uses the same font family, sizing hierarchy, and weight structure. Headings look identical across pages. Body text is the same size and weight everywhere. Tab labels, button text, and input labels use consistent sizing.

**Why this priority**: Typography consistency is a quality-of-life improvement. The site is usable without it, but inconsistency creates a fragmented experience. Depends on P2 (white-label base) being clean first.

**Independent Test**: Can be fully tested by opening all three pages side by side and comparing heading sizes, body text sizes, button label sizes, and font weights. Any visual discrepancy is a failure.

**Acceptance Scenarios**:

1. **Given** any page, **When** any heading element is viewed, **Then** it uses the designated Header font style (size + weight).
2. **Given** any page, **When** any sub-heading or section title is viewed, **Then** it uses the designated Sub-header font style.
3. **Given** any page, **When** any body text, label, or descriptive text is viewed, **Then** it uses the designated Paragraph font style.
4. **Given** all three pages, **When** compared side by side, **Then** identical element types (buttons, tab labels, input placeholders) have identical font styling.
5. **Given** any text that is not a functional color (i.e., not heatmap or diagram color coding), **When** any page is viewed, **Then** that text uses the same standardized non-functional text color for its element type.

---

### User Story 4 - Light Theme (VS Code Light+) (Priority: P4)

A user selects the Light theme and the site adopts the color palette of VS Code's built-in "Light+" (Light+ Default) theme. The overall feel matches the VS Code light editor experience: white editor background, light grey sidebar tones, black foreground text, blue accent for interactive elements.

**Why this priority**: Depends on P1 (theme switching) and P2 (white-label base). Requires the base to be clean before colors are applied.

**Acceptance Scenarios**:

1. **Given** Light theme is selected, **When** any page is viewed, **Then** the main content area background is `#FFFFFF`.
2. **Given** Light theme is selected, **When** any page is viewed, **Then** primary body text color is `#000000`.
3. **Given** Light theme is selected, **When** secondary surfaces (config menu, sidebars, panels) are viewed, **Then** they use `#F3F3F3` background.
4. **Given** Light theme is selected, **When** interactive elements (buttons, active tabs, focus states) are viewed, **Then** they use `#007ACC` as the accent color.
5. **Given** Light theme is selected, **When** borders and separators are viewed, **Then** they use `#D4D4D4`.

---

### User Story 5 - Dark Theme (VS Code Dark+) (Priority: P5)

A user selects the Dark theme and the site adopts the color palette of VS Code's built-in "Dark+" (Dark+ Default) theme. The feel matches the VS Code dark editor: near-black background, light grey foreground text, darker grey for panels, blue accent for interactive elements.

**Why this priority**: Mirrors P4. Same dependencies. Lower priority than Light only because Light is a more common default expectation; order is arbitrary between P4 and P5.

**Acceptance Scenarios**:

1. **Given** Dark theme is selected, **When** any page is viewed, **Then** the main content area background is `#1E1E1E`.
2. **Given** Dark theme is selected, **When** any page is viewed, **Then** primary body text color is `#D4D4D4`.
3. **Given** Dark theme is selected, **When** secondary surfaces (config menu, sidebars, panels) are viewed, **Then** they use `#252526` background.
4. **Given** Dark theme is selected, **When** interactive elements (buttons, active tabs, focus states) are viewed, **Then** they use `#007ACC` as the accent color.
5. **Given** Dark theme is selected, **When** borders and separators are viewed, **Then** they use `#3A3D41`.

---

### Edge Cases

- What happens when a user's browser has no localStorage support? Site MUST still render in white-label state and remain fully functional; theme switching attempts are silently no-ops.
- What happens when localStorage contains an unrecognised theme value? Site MUST fall back to white-label (no-theme) state without error.
- What happens when functional color coding (grid heatmap, bolt diagrams) is viewed in dark theme? Functional colors MUST remain unchanged and readable against the dark background.
- What happens on mobile/narrow viewports? Config menu MUST remain accessible and theme switching MUST work at all screen sizes.
- What happens when JavaScript is disabled? Pages MUST still render in white-label base state and remain usable; theme switching will simply not function.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Site MUST strip all non-functional decorative styling (background colors, custom brand colors, ornamental shadows, decorative borders) from all pages.
- **FR-002**: Functional color coding (grid data heatmap cells, bolt position diagram indicators) MUST remain unchanged by this feature.
- **FR-003**: A config menu MUST be accessible from a fixed position in the top corner of every page.
- **FR-004**: The config menu MUST offer at minimum two theme options: Light (VS Code Light+) and Dark (VS Code Dark+).
- **FR-005**: Selecting a theme MUST apply it immediately to the current page without a full page reload.
- **FR-006**: The selected theme MUST be stored in browser local storage so it persists across page loads and navigation.
- **FR-007**: On every page load, the stored theme preference MUST be applied before the page is visually presented to the user (no visible flash of wrong theme).
- **FR-008**: All text that is not a functional color MUST use a standardized color drawn from the active theme palette.
- **FR-009**: Typography MUST be consolidated to exactly three styles: Header, Sub-header, and Paragraph. Each style defines a single font size and weight.
- **FR-010**: All three typography styles MUST be applied consistently across all pages (index, input, report) for their respective element types.
- **FR-011**: Light theme MUST implement VS Code Light+ palette: background `#FFFFFF`, foreground `#000000`, panel `#F3F3F3`, accent `#007ACC`, border `#D4D4D4`, hover `#E8E8E8`.
- **FR-012**: Dark theme MUST implement VS Code Dark+ palette: background `#1E1E1E`, foreground `#D4D4D4`, panel `#252526`, accent `#007ACC`, border `#3A3D41`, hover `#2D2D30`.
- **FR-013**: All interactive elements (buttons, tabs, form inputs) MUST be visibly functional in both themes and in the white-label base state.
- **FR-014**: Theme switching MUST work on all three pages (index, input, report) with no page-specific exceptions.

### Key Entities

- **Theme Preference**: A user's stored choice of visual theme. Values: `light`, `dark`, or absent (white-label default). Persisted in browser local storage under a stable key.
- **Typography Scale**: A defined set of exactly three text styles (Header, Sub-header, Paragraph), each with a fixed font size and weight, applied site-wide.
- **Theme Palette**: A named set of color values covering: main background, panel background, primary foreground text, secondary foreground text, accent/interactive color, border color, hover state color. Two palettes defined: Light+ and Dark+.
- **Functional Color**: A color value applied to a UI element to convey data meaning (e.g., heatmap cell score, bolt position optimality). Explicitly excluded from theming modifications.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three pages (index, input, report) render without any non-functional decorative color or design element in white-label state — verifiable by visual inspection with no theme applied.
- **SC-002**: Theme switches within 100 milliseconds of user selection — no perceptible delay between selecting a theme and seeing it applied.
- **SC-003**: Theme preference persists correctly in 100% of page navigations and reloads — verifiable by selecting a theme, navigating to each of the three pages, and reloading each.
- **SC-004**: Zero instances of non-functional text using a color outside the active theme palette — verifiable by auditing all text elements on each page in each theme.
- **SC-005**: Identical element types on different pages have identical typography — verifiable by side-by-side comparison of all three pages in both themes.
- **SC-006**: All functional color coding (grid heatmap, bolt diagrams) visually unchanged compared to pre-feature baseline in both themes — verifiable by screenshot comparison of report and input pages.
- **SC-007**: All existing 149 integration tests continue to pass after the feature is implemented.

## Assumptions

- The site currently has existing CSS in `site/css/shared.css` and `site/shared.css` that will be audited and refactored; the exact scope of existing styling is determined during planning.
- "Top corner" is assumed to mean top-right corner; this is the standard convention for site-level settings controls.
- The white-label base state (no theme) is the default rendered when no preference is stored — it is not itself a selectable "theme" option in the menu.
- Font family selection (the typeface itself) is a planning decision; the spec only mandates that exactly three size/weight styles exist and are consistent. System default fonts are acceptable.
- All pages share a single CSS file or theming mechanism — per-page CSS overrides that conflict with the theme system are considered bugs to be fixed during implementation.
- Existing Puppeteer integration tests may need updating to account for the new white-label base styling, but MUST still pass at the end of implementation.
- Mobile responsiveness of the config menu is in scope; a full mobile redesign of the site is out of scope.
