# Shell Navigation Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the `/at` application shell so the sidebar has one non-overlapping collapse control, an `AT` collapsed mark, a compact profile menu, a clearer branch-scope card, and profile-owned language selection without changing route, auth, branch, or permission behavior.

**Architecture:** Keep `Sidebar.vue` as the shell navigation owner and move the existing topbar account-menu behavior into a focused `SidebarProfileMenu.vue` mounted in the sidebar footer. Keep `OfficeBranchSelect.vue` as the branch listbox owner, remove account/language controls from `Topbar.vue`, and extend the canonical sidebar translation map for all new bilingual labels. Preserve the existing `uiStore` collapse contract and its diagnostics; this plan does not attempt to fix the unresolved production-only sidebar state anomaly.

**Tech Stack:** Vue 3 Composition API, Pinia stores, Vue Router, Frappe UI, Tailwind CSS, Vitest, Vue Test Utils, Playwright.

---

## File Map

- Create: `frontend/src/components/app-shell/SidebarProfileMenu.vue` — profile trigger/menu, role/branch summary, language actions, account/desk/logout actions, keyboard and outside-click behavior.
- Create: `frontend/src/components/app-shell/SidebarProfileMenu.test.js` — focused profile-menu unit tests.
- Modify: `frontend/src/platform/shell/Sidebar.vue` — remove footer duplicate toggle, refine brand header, render `AT` monogram, mount profile menu.
- Modify: `frontend/src/platform/shell/Topbar.vue` — remove standalone locale toggle and account menu; keep page title and branch scope only.
- Modify: `frontend/src/components/app-shell/OfficeBranchSelect.vue` — refine scope-card hierarchy and responsive sizing without changing listbox behavior.
- Modify: `frontend/src/platform/i18n/sidebar.js` — add bilingual profile, role, scope-card, language, and accessible-label keys.
- Modify: `frontend/src/platform/shell/Sidebar.test.js` — update two-toggle assumptions to one header toggle and assert collapsed brand/profile behavior.
- Create: `frontend/src/platform/shell/Topbar.test.js` — assert locale/account controls moved out while branch scope remains.
- Modify: `frontend/src/components/app-shell/OfficeBranchSelect.test.js` — preserve listbox/lock/search behavior and add scope-card label assertions.
- Modify: `frontend/tests/e2e/at-smoke.spec.js` — add only stable profile/language/scope-card coverage if the existing smoke structure has an appropriate shell section; preserve current diagnostics and do not weaken sidebar assertions.

## Constraints

- Do not modify `frontend/src/platform/state/uiState.js` or `uiStore.js`; preserve the unresolved sidebar anomaly diagnostics and persistence contract.
- Do not change routes, permission checks, API calls, branch selection semantics, logout endpoint, locale persistence endpoint, or auth/session behavior.
- Do not use `frontend/src/generated/translations.js` as the source of truth.
- Add Turkish and English copy in `frontend/src/platform/i18n/sidebar.js` in the same change.
- Keep all interactive controls keyboard-accessible and use existing focus-visible conventions.
- Do not add a new dependency or a new global UI state module.

### Task 1: Lock the Existing Contracts With Failing Tests

**Files:**
- Modify: `frontend/src/platform/shell/Sidebar.test.js`
- Create: `frontend/src/components/app-shell/SidebarProfileMenu.test.js`
- Modify: `frontend/src/components/app-shell/OfficeBranchSelect.test.js`
- Create: `frontend/src/platform/shell/Topbar.test.js`

- [ ] **Step 1: Update sidebar expectations for the approved structure**

Change the current `Sidebar.test.js` expectations that assert two collapse buttons:

```js
expect(wrapper.findAll(`button[aria-label="${collapseLabel}"]`)).toHaveLength(1);
expect(wrapper.findAll(`button[aria-label="${expandLabel}"]`)).toHaveLength(0);
expect(wrapper.find('[data-testid="sidebar-profile-trigger"]').exists()).toBe(true);
```

Add assertions that the expanded brand is visible and the footer has no collapse control:

```js
expect(wrapper.text()).toContain("Acentem Takipte");
expect(wrapper.find("footer").findAll(`button[aria-label="${collapseLabel}"]`)).toHaveLength(0);
```

- [ ] **Step 2: Add failing profile-menu contract tests**

Create tests for the intended public behavior:

```js
it("renders user, role, branch, language, and logout actions", () => {
  // mount with locale, user, roles, and branch context
  // assert profile trigger exists and menu items are not initially visible
  // click trigger and assert role/branch/language/logout labels
});

it("closes the profile menu with Escape and outside click", async () => {
  // open menu, dispatch Escape, assert hidden; reopen, click outside, assert hidden
});

it("toggles locale through the profile menu", async () => {
  // mock the existing locale persistence request, click English/Türkçe, assert auth locale action
});
```

Use the existing Pinia/session test helpers and mock the existing logout/locale calls. Do not introduce a second auth or locale store.

- [ ] **Step 3: Add failing scope-card presentation assertions**

Extend `OfficeBranchSelect.test.js` with assertions for the existing trigger contract:

```js
expect(wrapper.find('[data-testid="branch-scope-trigger"]').attributes("aria-label")).toBe(expectedScopeLabel);
expect(wrapper.text()).toContain(expectedAllBranchesLabel);
expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
```

Keep tests for `aria-expanded`, search, keyboard selection, lock state, and option selection unchanged.

- [ ] **Step 4: Run the focused tests and verify they fail for the new expectations**

Run from `frontend/`:

```bash
npm run test:unit -- src/platform/shell/Sidebar.test.js src/components/app-shell/SidebarProfileMenu.test.js src/components/app-shell/OfficeBranchSelect.test.js
```

Expected: the new profile-menu file is not implemented and the changed two-toggle assertions fail. Do not proceed until the failures are attributable to the missing design behavior rather than test setup errors.

- [ ] **Step 5: Commit the contract tests**

```bash
git add frontend/src/platform/shell/Sidebar.test.js frontend/src/components/app-shell/SidebarProfileMenu.test.js frontend/src/components/app-shell/OfficeBranchSelect.test.js frontend/src/platform/shell/Topbar.test.js
git commit -m "test(shell): define navigation control contracts"
```

### Task 2: Add Canonical Bilingual Shell Copy

**Files:**
- Modify: `frontend/src/platform/i18n/sidebar.js`
- Test: `frontend/src/components/app-shell/SidebarProfileMenu.test.js`

- [ ] **Step 1: Add the exact TR/EN keys required by the approved design**

Extend both `tr` and `en` maps with the same keys, preserving the existing custom sidebar translation path:

```js
// tr
profileMenu: "Profil menüsü",
role: "Rol",
activeBranch: "Aktif şube",
language: "Dil",
turkish: "Türkçe",
english: "English",
openProfileMenu: "Profil menüsünü aç",
closeProfileMenu: "Profil menüsünü kapat",
logout: "Çıkış Yap",

// en
profileMenu: "Profile menu",
role: "Role",
activeBranch: "Active branch",
language: "Language",
turkish: "Türkçe",
english: "English",
openProfileMenu: "Open profile menu",
closeProfileMenu: "Close profile menu",
logout: "Logout",
```

Reuse existing `brand`, `scope`, `allBranches`, `account`, and `desk` keys where their wording already matches the design. Do not duplicate keys or edit generated translations directly.

- [ ] **Step 2: Add a bilingual parity assertion**

In `SidebarProfileMenu.test.js`, assert every profile key resolves in both locales. Use the same locale setup pattern as `Sidebar.test.js` and fail if one locale renders the key name or an empty string.

- [ ] **Step 3: Run translation-focused tests**

```bash
npm run test:unit -- src/platform/shell/Sidebar.test.js src/components/app-shell/SidebarProfileMenu.test.js
```

Expected after implementation of the map: translation assertions pass; component behavior may remain red until Tasks 3–4 are complete.

- [ ] **Step 4: Commit the copy contract**

```bash
git add frontend/src/platform/i18n/sidebar.js frontend/src/components/app-shell/SidebarProfileMenu.test.js
git commit -m "feat(i18n): add shell profile control labels"
```

### Task 3: Extract the Profile Menu From the Topbar

**Files:**
- Create: `frontend/src/components/app-shell/SidebarProfileMenu.vue`
- Modify: `frontend/src/platform/shell/Topbar.vue`
- Test: `frontend/src/components/app-shell/SidebarProfileMenu.test.js`
- Test: `frontend/src/platform/shell/Topbar.test.js`

- [ ] **Step 1: Implement the profile menu using existing behavior**

Move the existing `Topbar.vue` account behavior into the new component without changing its endpoints:

```js
const accountMenuItems = computed(() => [
  { key: "account", label: t("account"), action: "account" },
  { key: "desk", label: t("desk"), action: "desk" },
  { key: "logout", label: t("logout"), action: "logout", destructive: true },
]);
```

Preserve these existing actions:

- Account: `window.location.assign("/me")`
- Desk: `window.location.assign("/desk")`
- Logout: `POST /api/method/logout` with the existing CSRF and credentials behavior, then redirect to `/login?redirect-to=/at`
- Locale: existing `authStore.setLocale`, `setLocaleResource`, and `persistLocaleViaFetch` sequence

The component must expose:

```html
<button
  data-testid="sidebar-profile-trigger"
  type="button"
  aria-haspopup="menu"
  :aria-expanded="menuOpen ? 'true' : 'false'"
  :aria-label="menuOpen ? t('closeProfileMenu') : t('openProfileMenu')"
>
</button>
```

Use `role="menu"` and `role="menuitem"`. Close on outside click and `Escape`. Render user name, initials, role label, and active branch summary with safe fallbacks. Keep the menu inside the viewport using the sidebar footer’s available width.

- [ ] **Step 2: Remove account/language controls from Topbar**

In `Topbar.vue`:

- Remove the standalone `TR/EN` button.
- Remove `accountMenuOpen`, `accountMenuRef`, account menu items, locale persistence handlers, and account action handlers that move to the profile component.
- Keep page title/section logic and `OfficeBranchSelect` rendering.
- Keep the mobile `toggle-sidebar` emit.
- Keep topbar layout responsive after the controls are removed.

- [ ] **Step 3: Run profile and topbar tests**

```bash
npm run test:unit -- src/components/app-shell/SidebarProfileMenu.test.js src/platform/shell/Topbar.test.js
```

Expected: profile menu action, keyboard, outside-click, and locale tests pass; Topbar no longer renders standalone locale/account controls.

- [ ] **Step 4: Commit the profile extraction**

```bash
git add frontend/src/components/app-shell/SidebarProfileMenu.vue frontend/src/components/app-shell/SidebarProfileMenu.test.js frontend/src/platform/shell/Topbar.vue frontend/src/platform/shell/Topbar.test.js
git commit -m "feat(shell): move account controls into sidebar profile menu"
```

### Task 4: Refine Sidebar Layout and Remove the Footer Toggle

**Files:**
- Modify: `frontend/src/platform/shell/Sidebar.vue`
- Modify: `frontend/src/platform/shell/Sidebar.test.js`

- [ ] **Step 1: Make the header control non-overlapping**

Update the brand header layout so the text column can shrink and the single toggle has a fixed slot:

```html
<div class="flex items-start gap-3">
  <div class="min-w-0 flex-1">
    <p class="truncate text-sm font-medium text-slate-900">{{ t("brand") }}</p>
    <p v-if="!isCollapsed" class="mt-0.5 truncate text-xs text-slate-400">{{ t("subtitle") }}</p>
    <p v-else class="mt-2 text-center text-xs font-semibold text-slate-700">AT</p>
  </div>
  <button ... class="grid h-8 w-8 shrink-0 ...">
    ...
  </button>
</div>
```

Use the approved `AT` monogram only in collapsed state. Keep `Acentem Takipte` visible in expanded state and add a `title`/accessible label for the monogram.

- [ ] **Step 2: Replace the footer content**

Keep the avatar/user summary and mount `<SidebarProfileMenu />`. Remove the footer’s second collapse/expand button entirely. Do not change `uiStore` or `useSidebarNavigation` state logic.

- [ ] **Step 3: Add collapsed navigation titles without changing routes**

Ensure each icon-only link retains `title="item.label"` and an accessible name when the text block is hidden. Do not alter `navSections`, role filters, or route paths.

- [ ] **Step 4: Run sidebar tests**

```bash
npm run test:unit -- src/platform/shell/Sidebar.test.js src/components/app-shell/SidebarProfileMenu.test.js
```

Expected: one desktop toggle, `AT` collapsed mark, no footer toggle, and profile trigger/menu behavior pass.

- [ ] **Step 5: Commit the sidebar layout**

```bash
git add frontend/src/platform/shell/Sidebar.vue frontend/src/platform/shell/Sidebar.test.js
git commit -m "feat(shell): simplify sidebar controls and branding"
```

### Task 5: Refine the Branch Scope Card Without Changing Its Contract

**Files:**
- Modify: `frontend/src/components/app-shell/OfficeBranchSelect.vue`
- Modify: `frontend/src/components/app-shell/OfficeBranchSelect.test.js`

- [ ] **Step 1: Refine the trigger hierarchy**

Keep `data-testid="branch-scope-trigger"`, listbox roles, `aria-expanded`, `aria-controls`, keyboard behavior, lock behavior, search, and selection handlers. Refine only the presentation:

- Keep the building icon.
- Use the existing localized `scope` label as the small uppercase eyebrow.
- Keep `selectedLabel` as the primary value.
- Preserve `Tüm Şubeler` / `All Branches` values from existing translations.
- Keep a compact chevron affordance.
- Preserve truncation and title tooltip.
- Use existing semantic `brand-*`/`slate-*` tokens.

- [ ] **Step 2: Verify desktop/mobile sizing**

Keep the card within the current topbar flex layout. Use a bounded width on desktop and `max-w-[calc(100vw-2rem)]` for the open listbox. Do not introduce horizontal overflow.

- [ ] **Step 3: Run branch selector tests**

```bash
npm run test:unit -- src/components/app-shell/OfficeBranchSelect.test.js
```

Expected: listbox open/close, lock, search, keyboard selection, and scope-card labels pass.

- [ ] **Step 4: Commit the branch scope refinement**

```bash
git add frontend/src/components/app-shell/OfficeBranchSelect.vue frontend/src/components/app-shell/OfficeBranchSelect.test.js
git commit -m "feat(shell): refine branch scope card"
```

### Task 6: Add Responsive Browser Coverage

**Files:**
- Modify: `frontend/tests/e2e/at-smoke.spec.js` — add shell/profile/scope coverage to the existing platform smoke owner.

- [ ] **Step 1: Add authenticated desktop coverage**

Assert:

- `Acentem Takipte` is visible when expanded.
- Exactly one desktop collapse control exists.
- After collapse, `AT` is visible and nav item titles remain available.
- Footer has no second collapse control.
- Profile trigger opens the menu with role/branch/language/logout items.
- Language option changes locale without changing route.
- Branch scope card remains operable.

- [ ] **Step 2: Add mobile drawer coverage**

At the existing mobile viewport:

- Open the drawer from the topbar menu button.
- Assert full brand is visible.
- Assert mobile close control works.
- Assert desktop collapse toggle is not visible.
- Open/close the profile menu from the drawer footer.
- Verify no horizontal overflow.

- [ ] **Step 3: Preserve failure diagnostics**

If the existing sidebar diagnostics are present, keep them around the collapse assertions. Do not remove `sidebar-collapse-diagnostics.json`, trace, screenshot, or original assertion rethrow behavior.

- [ ] **Step 4: Run focused E2E**

Use the repository’s existing Playwright command and credentials configuration; do not add credentials to source. Run the smallest shell-focused test first, then the relevant smoke suite.

Expected: desktop and mobile shell controls pass without weakening existing authentication or security assertions.

- [ ] **Step 5: Commit browser coverage**

```bash
git add frontend/tests/e2e/at-smoke.spec.js
git commit -m "test(shell): cover responsive profile and scope controls"
```

### Task 7: Run Full Frontend Quality Gates and Review the Diff

**Files:**
- No new files; verify all implementation/test files above.

- [ ] **Step 1: Run the full unit suite**

```bash
cd frontend
npm run test:unit
```

Expected: all existing and new tests pass.

- [ ] **Step 2: Run static quality gates**

```bash
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0; build emits only ignored generated output.

- [ ] **Step 3: Run translation and diff checks**

```bash
git diff --check
python tools/localization_guard.py
```

Expected: no whitespace errors, missing source keys, placeholder mismatches, or bare user-facing throws.

- [ ] **Step 4: Review the final diff against the design**

Confirm:

- one desktop toggle only
- footer duplicate toggle removed
- `Acentem Takipte` expanded brand and `AT` collapsed mark
- profile menu owns user/role/branch/language/logout
- topbar no standalone locale/account controls
- branch scope behavior unchanged
- TR/EN sources updated together
- no `uiState`/sidebar anomaly workaround
- no route/auth/permission/API changes
- no raw colors/new dependency

- [ ] **Step 5: Commit the validated feature**

```bash
git status --short
git diff --stat
git log --oneline -8
git add frontend/src/components/app-shell/SidebarProfileMenu.vue frontend/src/components/app-shell/SidebarProfileMenu.test.js frontend/src/components/app-shell/OfficeBranchSelect.vue frontend/src/components/app-shell/OfficeBranchSelect.test.js frontend/src/platform/shell/Sidebar.vue frontend/src/platform/shell/Sidebar.test.js frontend/src/platform/shell/Topbar.vue frontend/src/platform/shell/Topbar.test.js frontend/src/platform/i18n/sidebar.js frontend/tests/e2e/at-smoke.spec.js
git commit -m "feat(shell): refine sidebar and account controls"
```

## Implementation Handoff Notes

- Use a feature branch/worktree before implementation; do not work directly on
  the dirty/shared `main` checkout.
- The existing production-only sidebar state anomaly is a separate unresolved
  issue. Preserve diagnostics and stop if the new UI work exposes the same
  state revert rather than adding a speculative fix.
- If the profile menu needs a reusable outside-click/menu primitive already in
  the repository, reuse it only if its behavior matches the explicit contracts
  above; otherwise keep the new component focused and local.
- Do not merge or deploy until frontend tests, translation guard, build, and
  relevant browser checks are green and a human review is complete.
