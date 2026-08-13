# Shell Utility Redesign Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/at` shell so sidebar, profile, branch scope, and language controls remain separate, responsive, accessible, and verifiable across desktop, tablet, and mobile.

**Architecture:** Keep existing Vue component ownership and business contracts. Normalize sidebar scroll ownership and footer anchoring first, then introduce shared viewport-aware placement only where it removes duplicated positioning logic. Keep `OfficeBranchSelect` responsible for branch data/listbox behavior and keep locale persistence unchanged.

**Tech Stack:** Vue 3 Composition API, Pinia, Tailwind CSS, Vitest, Vue Test Utils, Playwright.

---

## File Map

- Modify `frontend/src/platform/shell/Sidebar.vue`: rail dimensions, one scroll container, fixed footer, drawer focus behavior, reduced-motion and accessibility attributes.
- Modify `frontend/src/platform/shell/Topbar.vue`: independent responsive utility layout for branch and language controls, stable wrapping, language menu semantics and focus behavior.
- Modify `frontend/src/components/app-shell/SidebarProfileMenu.vue`: viewport-safe placement, profile-only content, focus and keyboard behavior, mobile drawer compatibility.
- Modify `frontend/src/components/app-shell/OfficeBranchSelect.vue`: preserve listbox behavior while improving responsive surface width, truncation, and viewport-safe menu placement.
- Modify `frontend/src/platform/i18n/sidebar.js`: add or revise all new shell labels in both Turkish and English.
- Modify `frontend/src/platform/shell/Sidebar.test.js`: rail, scroll, toggle, drawer, and accessibility regression tests.
- Modify `frontend/src/platform/shell/Topbar.test.js`: independent utility layout and language accessibility tests.
- Modify `frontend/src/components/app-shell/SidebarProfileMenu.test.js`: placement classes, keyboard/focus, and content separation tests.
- Modify `frontend/src/components/app-shell/OfficeBranchSelect.test.js`: long-label, locked/loading, and listbox contract regressions.
- Preserve `frontend/tests/e2e/at-smoke.spec.js`: existing smoke selectors and branch-summary assertions remain regression coverage.
- Create `frontend/tests/e2e/shell-utility-audit.spec.js`: focused authenticated shell audit matrix with sanitized diagnostics.
- Review `docs/UI_REVIEW_CHECKLIST.md`; keep the checklist unchanged unless the implemented shell introduces a reusable rule that is demonstrably missing.

## Task 1: Establish Failing Shell Regression Tests

**Files:**
- Modify `frontend/src/platform/shell/Sidebar.test.js`
- Modify `frontend/src/platform/shell/Topbar.test.js`
- Modify `frontend/src/components/app-shell/SidebarProfileMenu.test.js`
- Modify `frontend/src/components/app-shell/OfficeBranchSelect.test.js`

- [ ] Add tests that assert the sidebar has one desktop toggle, one navigation scroll region, and a footer profile trigger outside that region.
- [ ] Add tests that assert expanded/collapsed rail classes use the new `240px`/`76px` contract without changing the `AT` monogram or active navigation behavior.
- [ ] Add tests that assert topbar branch and language controls remain separate and that the language menu exposes `role="menu"`, `aria-expanded`, selected state, Escape closing, and outside-click closing.
- [ ] Add profile tests that assert the menu contains no language or branch selection controls, keeps the active branch summary informational, and restores focus to the trigger after Escape.
- [ ] Add branch tests for long labels, locked state text retention, listbox keyboard navigation, and viewport-safe width classes.
- [ ] Run `npm exec vitest run src/platform/shell/Sidebar.test.js src/platform/shell/Topbar.test.js src/components/app-shell/SidebarProfileMenu.test.js src/components/app-shell/OfficeBranchSelect.test.js` from `frontend/`.
- [ ] Confirm the new assertions fail for the current implementation where behavior differs; do not weaken assertions to match the current markup.
- [ ] Commit the test-only baseline as `test: define shell utility redesign contracts`.

## Task 2: Normalize Sidebar Layout and Drawer Focus

**Files:**
- Modify `frontend/src/platform/shell/Sidebar.vue`
- Modify `frontend/src/platform/shell/Sidebar.test.js`

- [ ] Change the desktop rail width classes to approximately `lg:w-[240px]` expanded and `lg:w-[76px]` collapsed while preserving `effectiveCollapsed` and the existing collapse store binding.
- [ ] Make the `aside` a flex column without general overflow scrolling; wrap only the navigation list in a single `flex-1 min-h-0 overflow-y-auto` region.
- [ ] Keep the footer outside the navigation scroll region with `shrink-0`, and preserve the profile trigger in both collapsed and expanded states.
- [ ] Keep exactly one desktop collapse toggle in the brand header and retain the mobile close action as a distinct mobile-only control.
- [ ] Add `aria-controls` linking the mobile trigger/drawer where the parent shell provides the drawer id, without changing route or session behavior.
- [ ] Add reduced-motion classes or a scoped media rule so shell transforms do not animate for users who request reduced motion.
- [ ] Run the focused sidebar tests and confirm all pass.
- [ ] Commit as `fix: stabilize sidebar rail and drawer layout`.

## Task 3: Add Shared Viewport-Safe Utility Placement

**Files:**
- Modify `frontend/src/components/app-shell/SidebarProfileMenu.vue`
- Modify `frontend/src/components/app-shell/OfficeBranchSelect.vue`
- Modify `frontend/src/platform/shell/Topbar.vue`

- [ ] Keep placement calculations local to each owning component; do not add a speculative shared helper before two components have identical geometry requirements.
- [ ] In `SidebarProfileMenu.vue`, define placement state from anchor rect, surface dimensions, preferred placement, viewport padding, and return top/left/right coordinates plus a placement name.
- [ ] Recalculate placement on open, resize, visual viewport resize, and scroll of the owning surface; remove every listener on unmount.
- [ ] Clamp surfaces to an 8px viewport inset and prefer upward placement for expanded desktop profile menus, lateral placement for collapsed desktop menus, and an in-viewport placement for mobile.
- [ ] Use inline style coordinates only for geometry; keep colors, spacing, and states in existing Tailwind classes.
- [ ] Run profile and topbar focused tests, including Escape and outside click behavior.
- [ ] Commit as `feat: add viewport-safe shell menu placement`.

## Task 4: Redesign Independent Branch Scope Control

**Files:**
- Modify `frontend/src/components/app-shell/OfficeBranchSelect.vue`
- Modify `frontend/src/components/app-shell/OfficeBranchSelect.test.js`
- Modify `frontend/src/platform/shell/Topbar.vue`

- [ ] Preserve the existing branch composable, API calls, lock rules, selected value, search input, listbox role, and keyboard selection behavior.
- [ ] Refine the trigger into a distinct scope control with label, selected value, lock/chevron state, and localized accessible name.
- [ ] Add one-line truncation with a full-value `title` and accessible text for long branch names.
- [ ] Make the listbox width responsive and clamp its position inside the viewport on tablet/mobile without changing its option data.
- [ ] Ensure loading and locked states retain the visible selected scope rather than replacing it with an empty placeholder.
- [ ] Assert in tests that the branch control remains independent from the language control and profile menu.
- [ ] Run `OfficeBranchSelect.test.js` and the relevant topbar tests.
- [ ] Commit as `fix: make branch scope control responsive`.

## Task 5: Redesign Independent Language Control

**Files:**
- Modify `frontend/src/platform/shell/Topbar.vue`
- Modify `frontend/src/platform/i18n/sidebar.js`
- Modify `frontend/src/platform/shell/Topbar.test.js`

- [ ] Keep language selection independent from branch scope and profile content at every breakpoint.
- [ ] Use a stable globe chip with the full current language label on desktop and a separate responsive language surface on mobile.
- [ ] Preserve `useLocalePreference().setLocale()` and close/focus-return behavior.
- [ ] Add `aria-controls`, `aria-expanded`, explicit selected state, and keyboard navigation for both desktop and mobile presentations.
- [ ] Add Turkish and English translations for every new label, helper, and accessible name in the canonical sidebar translation source.
- [ ] Verify language changes update section title, page title, topbar language label, sidebar labels, and profile role text without raw keys.
- [ ] Run focused topbar tests and translation parity tests.
- [ ] Commit as `feat: refine independent shell language control`.

## Task 6: Make Profile Menu Informational and Mobile-Safe

**Files:**
- Modify `frontend/src/components/app-shell/SidebarProfileMenu.vue`
- Modify `frontend/src/components/app-shell/SidebarProfileMenu.test.js`
- Modify `frontend/src/platform/i18n/sidebar.js`

- [ ] Keep user name, localized business role, active branch summary, account, Desk, and separated logout actions.
- [ ] Remove language controls from profile markup at all breakpoints; do not add branch selection actions.
- [ ] Replace drawer-relative absolute placement with viewport-safe geometry while retaining the existing menu test ids and role semantics.
- [ ] Preserve `SIDEBAR_ROLE_PRIORITY`, localized fallback behavior, logout error/retry behavior, and locale persistence ownership.
- [ ] Add explicit focus return after Escape, trigger toggle, outside click, and successful locale/account actions where applicable.
- [ ] Add mobile tests proving the trigger remains reachable after drawer scrolling and the menu surface is not clipped by the drawer.
- [ ] Run the profile focused suite and translation parity tests.
- [ ] Commit as `fix: make profile panel mobile-safe`.

## Task 7: Add Authenticated Playwright Shell Audit

**Files:**
- Create or modify `frontend/tests/e2e/shell-utility-audit.spec.js`
- Reuse `frontend/tests/e2e/helpers/auth.js` and its `E2E_BASE_URL`, `E2E_USER`, and `E2E_PASSWORD` contract; do not modify credential handling or store secrets in artifacts.
- Modify `frontend/playwright.config.js` only to add non-secret viewport/project configuration if needed.

- [ ] Use the existing `E2E_BASE_URL`, `E2E_USER`, and `E2E_PASSWORD` environment contract; never write credentials to artifacts or source files.
- [ ] Add a desktop test at `1440x900` covering expanded/collapsed rail, one-toggle count, profile menu, independent branch scope, and independent language control.
- [ ] Add a tablet test at `768x1024` covering topbar wrapping, independent controls, and no horizontal overflow.
- [ ] Add a mobile test at `390x844` covering drawer open/close, footer profile reachability after drawer scroll, viewport-safe profile menu, branch listbox, and language control.
- [ ] Assert focus return and keyboard paths for Escape, ArrowUp/ArrowDown, Home/End, and outside click.
- [ ] Capture screenshots only on failure and sanitize diagnostic text so no credentials, cookies, tokens, branch PII, or user PII enter artifacts.
- [ ] Run the focused Playwright audit with `E2E_BASE_URL`, `E2E_USER`, and `E2E_PASSWORD` supplied by the secret-managed environment.
- [ ] Commit as `test: add authenticated shell utility audit`.

## Task 8: Run Quality Gates and Review Against the Spec

**Files:**
- No source changes expected unless a gate exposes a defect.

- [ ] Run `npm run lint` from `frontend/`.
- [ ] Run `npm run typecheck` from `frontend/`.
- [ ] Run `npm run test:unit` from `frontend/`.
- [ ] Run `npm run build` from `frontend/`.
- [ ] Run `git diff --check` from the repository root.
- [ ] Review the changed shell against `docs/UI_REVIEW_CHECKLIST.md` and the approved spec at `docs/superpowers/specs/2026-08-13-shell-utility-redesign-audit-design.md`.
- [ ] Confirm branch and language remain separate in rendered desktop, tablet, and mobile DOM.
- [ ] Confirm no generated frontend build output is committed unless explicitly required by deployment workflow.
- [ ] Commit any final fix separately with a behavior-specific message.

## Task 9: Deploy and Verify Production

**Files:**
- No source changes expected.

- [ ] Confirm clean worktree and record the final commit SHA.
- [ ] Wait for the GHCR image workflow for the final SHA using the existing deployment script or authenticated GitHub Actions UI/API.
- [ ] Run `scripts/deploy_prod_coolify_ghcr.ps1` with the final SHA and authenticated smoke credentials supplied through environment/credential parameters.
- [ ] Verify production image digest, service health, scheduler, workers, `bench doctor`, and migration output.
- [ ] Dispatch Desk-Free Smoke exactly once against the new production image.
- [ ] Record the smoke run URL, conclusion, image digest, and endpoint checks for `/api/method/ping`, `/at/`, and `/login`.
- [ ] If `SIDEBAR_WRITER_UNRESOLVED` remains, report it separately without adding an unverified workaround.

## Plan Self-Review

- Spec coverage: sidebar scroll/focus is covered by Tasks 1-2; viewport placement by Task 3; independent branch and language controls by Tasks 4-5; profile separation and mobile safety by Task 6; authenticated responsive evidence by Task 7; quality gates and deployment by Tasks 8-9.
- No placeholder steps remain; every task names exact files, commands, expected behavior, and commit boundaries.
- Type and contract consistency: `OfficeBranchSelect` remains the branch behavior owner; `useLocalePreference` remains the locale behavior owner; profile role priority remains `SIDEBAR_ROLE_PRIORITY`; existing smoke test ids remain available.
- The plan does not introduce a new combined utility panel, branch action inside profile, or sidebar state workaround.
