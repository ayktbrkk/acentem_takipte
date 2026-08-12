# Shell Navigation Controls Design

## Status

Approved design for the `/at` application shell. This document covers the
sidebar, branch-scope control, and user profile controls. It does not implement
the changes or resolve the separately tracked sidebar runtime anomaly.

## Goals

- Make the sidebar hierarchy clearer on desktop and mobile.
- Remove the duplicate collapse control from the sidebar footer.
- Keep one reliable desktop collapse control in the brand header.
- Preserve the `Acentem Takipte` brand while introducing an `AT` monogram for
  the collapsed rail.
- Replace the sidebar footer's passive user block with a compact profile menu.
- Keep branch scope visible in the top bar as a compact scope card.
- Move language selection into the profile menu.
- Preserve current routes, permissions, session state, branch selection, and
  bilingual UI behavior.

## Non-Goals

- Changing sidebar navigation routes or ownership.
- Changing branch-scope API/composable behavior.
- Changing authentication or session semantics.
- Adding a new visual theme or raw color system.
- Treating the unresolved sidebar collapse state anomaly as fixed by this
  design.
- Changing production infrastructure or deployment behavior.

## Chosen Approach

Use the **Command Center shell** approach. Keep the existing shell structure,
but strengthen the information hierarchy and remove redundant controls. This
has the lowest behavioral risk while improving the desktop rail, mobile drawer,
profile access, and branch context.

## Layout

### Expanded Desktop Sidebar

- The brand header displays `Acentem Takipte` and the existing operational
  subtitle.
- One desktop collapse button sits inside the brand header, aligned to the
  right of the brand block.
- The collapse button must not overlap or cover the brand text.
- Navigation sections and active-route treatment remain unchanged.
- The footer contains the profile-menu trigger and no collapse/expand button.

### Collapsed Desktop Sidebar

- The brand area displays an `AT` monogram in a compact branded surface.
- The monogram has a tooltip/title of `Acentem Takipte`.
- Navigation displays icon-only items with accessible labels/tooltips.
- The single header toggle remains available and uses the existing open/close
  icon semantics.
- The footer displays only the user avatar/profile trigger.
- No second footer collapse button exists.

### Mobile Drawer

- The sidebar remains a drawer on mobile.
- The drawer shows the full `Acentem Takipte` brand.
- The mobile close control remains visible only for the mobile drawer.
- The desktop collapse control is hidden on mobile.
- The compact profile trigger remains in the drawer footer.

## Profile Menu

The sidebar footer user block becomes a compact profile-menu trigger. The menu
contains:

- User display name.
- Current role label, such as `AT Agent`, `AT Manager`, or `System Manager`.
- Active branch/scope summary.
- Language options: `Türkçe` and `English`.
- Logout as a separated, destructive action.

Interaction requirements:

- The trigger exposes `aria-haspopup="menu"` and `aria-expanded`.
- The menu opens from the avatar or user row.
- It closes on outside click and `Escape`.
- Keyboard navigation remains usable.
- Opening the profile menu does not change sidebar collapse state.
- Missing user data uses a safe localized fallback without causing layout shift.

## Branch Scope Card

The top-right branch selector remains a persistent operational control, not a
profile-menu item. Its visual treatment is refined as a compact scope card:

- Building/branch icon.
- Small label: `Şube Kapsamı` / `Branch Scope`.
- Current value: `Tüm Şubeler` / `All Branches` or the selected branch.
- Chevron indicating the listbox state.
- Existing search, keyboard, lock, and selection behavior is preserved.
- Long names truncate with a title tooltip.
- Locked state uses reduced contrast without hiding the selected scope.

## Language Selection

- Remove the standalone top-bar `TR` control.
- Place language selection in the profile menu.
- Mark the active language clearly.
- Preserve the existing i18n state and route behavior.
- Add/update both Turkish and English source copy together.
- Do not treat `frontend/src/generated/translations.js` as the translation
  source of truth.

## Visual Language

- Preserve existing semantic tokens: `brand-*`, `slate-*`, `at-amber`,
  `at-red`, and `at-green`.
- Use the existing white surfaces, slate borders, and restrained shadows.
- Use the brand palette for the `AT` monogram and active scope state.
- Keep destructive red treatment limited to logout hover/focus states.
- Do not introduce arbitrary raw color values or a new theme.

## Responsive Rules

- Expanded desktop width remains approximately `220px`.
- Collapsed desktop width remains approximately `96px`.
- Existing tablet/mobile breakpoint behavior remains in place.
- The profile menu must remain inside the viewport and may reposition upward
  or laterally when space is limited.
- User, role, and branch labels truncate to one line with accessible full-value
  titles.

## Component Boundaries

- `frontend/src/platform/shell/Sidebar.vue` owns the brand header, single
  desktop toggle, navigation rendering, and profile trigger placement.
- A focused profile-menu component should own profile menu interaction and
  content rather than adding more conditional branches to the sidebar.
- `frontend/src/components/app-shell/OfficeBranchSelect.vue` remains the owner
  of the branch-scope listbox and its existing composable behavior.
- `frontend/src/platform/composables/useSidebarNavigation.js` remains the
  source for navigation, user display, role/branch fallback, and collapse
  bindings where appropriate.
- Canonical domain/platform i18n sources own new bilingual copy.

## Behavior Contracts

- Expanded desktop: exactly one desktop collapse control.
- Collapsed desktop: `AT` monogram, accessible navigation labels, and exactly
  one desktop expand control.
- Footer: profile trigger only; no duplicate collapse control.
- Profile menu: open/close, outside click, Escape, keyboard access, language,
  logout, role, and branch summary.
- Branch selector: existing listbox, locking, search, and selection contracts.
- Session/auth/route/permission behavior remains unchanged.

## Validation Plan

### Unit Tests

- Expanded and collapsed brand treatment.
- `AT` monogram rendering.
- Exactly one desktop collapse/expand control.
- Footer duplicate toggle removed.
- Turkish and English toggle labels/titles.
- Profile menu open/close, Escape, outside click, and keyboard behavior.
- User, role, branch, language, and logout entries.
- Branch selector regression behavior.
- Long-label truncation and fallback behavior.

### Browser Tests

- Authenticated desktop shell.
- Desktop collapse/expand.
- Mobile drawer open/close.
- Profile menu interaction.
- Language selection.
- Branch scope listbox.
- Accessible menu/listbox semantics at desktop, tablet, and mobile viewports.

### Quality Gates

- `npm run test:unit`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `git diff --check`
- Turkish/English translation parity
- Relevant Playwright smoke coverage

## Error and Loading Behavior

- User/role loading uses the existing skeleton or muted placeholder behavior.
- Branch loading does not cause layout jumps.
- Missing user data falls back to a localized safe display.
- Missing branch data uses the existing safe scope fallback.
- Profile menu remains available if a non-critical user detail request fails.
- Branch lock/permission behavior is preserved.

## Risks and Mitigations

- Sidebar runtime anomaly: preserve existing diagnostics and validate separately;
  do not claim this design fixes the anomaly.
- Profile menu complexity: keep it as a focused component with explicit
  keyboard/outside-click tests.
- Translation drift: update canonical TR/EN sources together and run parity
  checks.
- Mobile overflow: test drawer, profile menu, scope card, and long labels at
  mobile widths.
- Duplicate controls: assert control counts in unit/browser tests.

## Iteration 2 Refinements

The following refinements were approved after local visual review:

- Remove the sidebar marketing subtitle entirely. `Acentem Takipte` is the
  product identity; the page title and section context provide operational
  context elsewhere in the shell. The subtitle must not truncate to an
  ellipsis in the brand area.
- Display the user's highest-priority business role rather than the generic
  `AT User` label. Priority is `AT System Manager`, `AT Manager`,
  `AT Accountant`, `AT Agent`, `System Manager`, then `Administrator`.
- Localize the visible business-role label without changing backend role
  values. For example, `AT Agent` displays as `AT Operasyon Kullanıcısı` in
  Turkish and `AT Agent` in English.
- Use a desktop top-bar language chip with a globe icon and the current full
  language name. On mobile, use a compact `Türkçe | English` segmented control
  inside the profile menu. The language persistence endpoint and locale state
  remain unchanged.
- Keep the profile menu compact: user name, localized business role, active
  branch scope, language, account/Desk actions, and separated logout.
