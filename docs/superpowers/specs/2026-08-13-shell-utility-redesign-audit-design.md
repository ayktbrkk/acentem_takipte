# Shell Utility Redesign and UX Audit

## Status

Approved design direction. This specification covers the comprehensive
redesign and audit of the `/at` sidebar, profile panel, branch scope control,
and language control. It keeps the branch and language controls separate and
does not change their backend or persistence contracts.

## Context

The current shell already contains the intended product primitives: a single
desktop sidebar toggle, `Acentem Takipte` branding with an `AT` collapsed
monogram, a compact profile menu, a persistent branch scope control, and
bilingual language controls. The remaining UX risk is primarily spatial and
responsive rather than business logic.

The source audit found these risk areas:

- Sidebar navigation and the overall sidebar both participate in scrolling.
- The profile popover is positioned inside the drawer scroll context and can be
  clipped or difficult to reach at mobile widths.
- Topbar branch and language controls can compete for horizontal space at
  tablet and narrow desktop widths.
- Desktop and mobile language controls use different interaction surfaces and
  need one consistent accessibility contract.
- Branch summary in the profile menu and branch selection in the topbar need a
  clearer information/action distinction.
- Long Turkish and English labels need explicit truncation, tooltip, and
  viewport-boundary behavior.

Unauthenticated production Playwright checks confirmed that `/at/` correctly
redirects to the login surface at both 1440x900 and 390x844, with HTTP 200 and
no console/page errors. Authenticated shell evidence remains a required
follow-up because credentials were not available in the audit environment.

## Goals

- Make the shell spatially stable at desktop, tablet, and mobile widths.
- Keep branch scope and language selection as separate controls.
- Make profile context useful without duplicating branch-selection behavior.
- Preserve the existing AT visual language, bilingual UI, routes, permissions,
  API contracts, and locale persistence.
- Improve keyboard, focus, Escape, outside-click, and viewport-boundary
  behavior.
- Produce repeatable Playwright evidence for authenticated shell behavior.

## Non-Goals

- Combining branch scope and language selection into one control or panel.
- Moving branch selection into the profile menu.
- Changing branch APIs, listbox semantics, locking, permissions, or selection
  state.
- Changing locale persistence or authentication/session semantics.
- Changing navigation route ownership.
- Introducing a new color theme or unrelated component system.
- Claiming that the existing `SIDEBAR_WRITER_UNRESOLVED` production anomaly is
  fixed by this redesign.

## Chosen Direction: Context Rail

Use the **Context Rail** approach:

- The sidebar owns brand, navigation, and profile context only.
- Branch scope remains an independent operational control in the topbar.
- Language remains an independent preference control in the topbar.
- The profile menu contains user identity, localized business role, active
  branch summary, account/Desk actions, and separated logout, but no branch
  switcher or language selector.
- Mobile adapts the independent branch and language controls without merging
  them or hiding them inside the profile panel.

This approach improves hierarchy while minimizing behavioral risk and
preserving the current domain contracts.

## Interaction Design

### Sidebar

- Expanded desktop rail is approximately `240px`.
- Collapsed desktop rail is approximately `76px`.
- Exactly one desktop collapse/expand control remains in the brand header.
- Collapsed branding uses the `AT` monogram with localized accessible label and
  tooltip.
- Navigation has one scroll container. The profile footer remains outside that
  scroll container and is always reachable.
- Active navigation uses both semantic color and a visible edge/surface
  treatment, not color alone.
- Mobile keeps a drawer with one internal scroll container, a visible close
  action, and a reachable footer profile trigger.

### Branch Scope

- Remains an independent topbar control with a small scope label, selected
  value, and lock/chevron state.
- `All Branches` and a selected branch remain visually distinguishable while
  using the same listbox contract.
- Long labels truncate to one line and expose the full value through title and
  accessible naming.
- The listbox remains within viewport boundaries on desktop, tablet, and
  mobile.
- Loading and locked states retain the selected scope text.
- The profile branch summary is informational only and does not become a second
  branch-selection entry point.

### Language

- Remains an independent control, visually separated from branch scope.
- Desktop uses a globe plus full current language name.
- Mobile uses a separate responsive language control, not the profile menu.
- The menu has two options, explicit selected state, `role="menu"`, keyboard
  navigation, Escape handling, and outside-click closing.
- Locale changes preserve the existing persistence endpoint and update shell
  copy without avoidable layout shift.

### Profile Menu

- The menu is positioned relative to the viewport/floating surface rather than
  relying on a drawer's scroll position.
- Expanded desktop placement opens upward; collapsed desktop placement opens
  laterally; mobile placement remains inside the viewport.
- Content order is user name, localized business role, active branch summary,
  account/Desk actions, and separated destructive logout.
- The menu does not contain language or branch selection controls.
- Opening focuses the first meaningful menu item.
- Escape and outside click close the menu and restore focus to the trigger.
- Arrow Up/Down and Home/End navigation remain supported.

## Component Boundaries

- `frontend/src/platform/shell/Sidebar.vue` owns brand, desktop toggle, nav
  scroll ownership, mobile drawer shell, and profile trigger placement.
- `frontend/src/platform/shell/Topbar.vue` owns page context, mobile drawer
  trigger, and the independent branch/language utility placement.
- `frontend/src/components/app-shell/SidebarProfileMenu.vue` owns profile
  content and menu interaction.
- `frontend/src/components/app-shell/OfficeBranchSelect.vue` remains the owner
  of branch listbox behavior, API interaction, lock state, and selection.
- `frontend/src/platform/i18n/sidebar.js` remains the source for new bilingual
  shell copy.
- A shared floating-position helper or utility primitive may be introduced
  only if it prevents duplicated placement logic between the independent shell
  controls.

## Accessibility Contract

- Interactive controls have localized accessible names and visible focus rings.
- Menu/listbox controls expose consistent `aria-haspopup`, `aria-expanded`,
  `aria-current`, and `aria-controls` where applicable.
- Drawer opening moves focus to its close control and closing returns focus to
  the mobile trigger.
- Overlay close behavior is available by click and keyboard.
- `prefers-reduced-motion` reduces or removes shell transitions.
- Status and selection are not communicated by color alone.
- Icon-only collapsed navigation remains keyboard reachable and has tooltips or
  equivalent accessible labels.

## Audit and Validation Plan

### Playwright Matrix

Run authenticated checks at:

- Desktop: 1440x900.
- Tablet: 768x1024.
- Mobile: 390x844.

For each viewport, capture:

- Sidebar expanded and collapsed states.
- Mobile drawer open/close state.
- Profile menu open, keyboard navigation, Escape, outside click, and focus
  return.
- Independent branch scope open, search, lock, selection, and long-label
  behavior.
- Independent language control open, selection, locale update, and focus
  return.
- Turkish and English shell rendering.
- Console errors, page errors, failed requests, clipping, and horizontal
  overflow.

### Unit and Static Gates

- Focused tests for sidebar, profile, topbar language, and branch control.
- Translation parity and long-label/fallback tests.
- `npm run lint`.
- `npm run typecheck`.
- `npm run test:unit`.
- `npm run build`.
- `git diff --check`.

## Acceptance Criteria

- No shell control is clipped or unreachable at the three target widths.
- Sidebar has exactly one desktop toggle and one scroll container.
- Profile footer trigger remains reachable in the mobile drawer without
  depending on an accidental scroll position.
- Profile menu never clips against the drawer or viewport.
- Branch and language controls remain separate at every viewport.
- Branch listbox behavior and API contract are unchanged.
- Locale persistence and bilingual shell rendering remain unchanged.
- Keyboard interaction and focus return pass for drawer, profile, branch, and
  language controls.
- No raw translation keys or hardcoded new user-facing shell strings appear.
- Authenticated Playwright smoke passes without new console/page errors.
- The production-only sidebar state anomaly is tracked separately if it remains
  after this redesign.

## Roadmap

1. Establish authenticated Playwright access and capture baseline evidence.
2. Normalize sidebar scroll ownership, rail dimensions, footer anchoring, and
   drawer focus behavior.
3. Redesign independent branch and language utility surfaces with responsive
   placement and viewport boundaries.
4. Make profile menu placement viewport-aware and keep it informational for
   branch context only.
5. Harden bilingual copy, long-label behavior, reduced motion, and aria
   semantics.
6. Add focused regression tests and run the complete frontend quality gates.
7. Deploy the resulting image and run one authenticated production Desk-Free
   Smoke dispatch.
8. Record production image digest, smoke run URL, endpoint status, and any
   remaining sidebar state anomaly as a separate follow-up.

## Risks and Mitigations

- **Missing authenticated evidence:** obtain credentials through the existing
  secret-managed CI path; do not place credentials in the repository or shell
  artifacts.
- **Branch behavior regression:** leave `OfficeBranchSelect.vue` data and
  listbox logic intact; test selection and locked states before and after layout
  changes.
- **Mobile clipping:** use viewport-boundary assertions and screenshots at
  390px and 768px widths.
- **Translation drift:** update canonical TR/EN shell translations together
  and run parity tests.
- **Sidebar runtime anomaly:** preserve diagnostics and report it separately;
  do not add an unverified state workaround.
