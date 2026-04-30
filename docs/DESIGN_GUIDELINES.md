# Acentem Takipte (AT) Design Guidelines & Manifesto v2.2

This document is the design constitution of the AT ecosystem. It exists to keep every screen, component, and workflow aligned across developers and AI agents.

The objective is simple: English code, bilingual UI, consistent operational density, and an InsurTech-grade experience that feels trustworthy, fast, and uniform.

## 0. How To Use This Document

- Every new page, detail screen, modal, form, card, table, and quick action must be checked against this document before merge.
- If an existing shared component already solves the problem, extend it or reuse it instead of creating a parallel pattern.
- If a new pattern is truly required, add it intentionally and update this document in the same workstream.
- When this document and an older screen conflict, this document wins.
- Policy screens and their detail surfaces remain the visual and structural baseline for the rest of the application.

## 1. AT Manifesto: English Code, Bilingual UI

### 1.1 Naming & Architecture

- New backend and integration-facing objects should use the `AT` domain consistently and avoid mixed-language naming.
- Variables, functions, DB fields, comments, tests, and code-level labels must be written in English.
- User-facing copy must never leak raw English keys into production UI unless English is the active language.
- UI copy must be domain-correct. Prefer insurance language users already recognize over generic software jargon.

### 1.2 Source Of Truth For Copy

- Hardcoded user-facing strings are forbidden in Vue, Python, tests that assert UI text, and composables that produce labels.
- Python must use `_()`.
- Vue and JavaScript must use the module translation helper already used by the surrounding page, such as `__()`, `translateText`, or the local `t()` wrapper.
- If a module owns its own translation map, add both `tr` and `en` entries in the same change.
- Shared shell surfaces such as sidebar, top navigation, scope switchers, breadcrumbs, and persistent action bars must resolve copy from their own shell or module translation source, not from unrelated page-level generic keys like `title`, `subtitle`, or `breadcrumb`.
- If a string appears in tables, badges, filters, empty states, toasts, modals, quick actions, or route titles, it must still be translated.

### 1.3 Translation Delivery Rules

- Every new UI term must be added to its source translation file in the same PR.
- For CSV-based translations, keep English source and English target identical, and provide the Turkish target separately where required.
- Do not add duplicate keys for the same business concept with minor casing differences.
- Prefer stable semantic keys like `policy_status_active` over generic keys like `activeLabel` when the meaning is domain-specific.
- Route meta titles, button labels, empty states, error banners, and inline helper text are part of the translation surface.

## 2. Non-Negotiable Product Principles

- Trust first: insurance software must feel accurate, calm, and professional.
- Dense, not crowded: show meaningful information without visual clutter.
- Actions must be obvious: users should instantly recognize the primary next step.
- States must be explicit: loading, empty, partial, error, warning, and success must all be intentionally designed.
- Consistency beats novelty: reuse the AT language and patterns before inventing new ones.
- Native-looking browser controls should be avoided when they break visual consistency, unless accessibility or platform constraints require them.

## 3. Shared Component First Policy

Before creating a new page-level pattern, check whether one of these existing building blocks should be used first.

### 3.1 Preferred Shared Components

- `WorkbenchPageLayout`: default shell for operational workbench pages.
- `SectionPanel`: default card container for grouped content.
- `ActionButton`: default button primitive for page, toolbar, and inline actions.
- `SaaSMetricCard`: primary metric summary card.
- `ListTable`: standard data table and status-column surface.
- `StatusBadge`: standard semantic badge surface.
- `EditableCard`: editable grouped detail sections.
- `StandardCustomerCard`: default customer summary/sidebar card.

### 3.2 Reuse Rules

- If an existing shared component covers at least 80% of the need, extend it instead of cloning its markup.
- Do not create visually similar button, badge, card, or table variants under a different name unless the behavior is genuinely different.
- New variants must preserve spacing, radius, typography, and semantic colors of the existing system.
- One-off page CSS should be the exception, not the default implementation path.

## 4. Visual Language

### 4.1 Color Tokens

Insurance workflows rely on semantic color meaning. Random or decorative color use is prohibited.

| Category | Token | Value | Usage |
| :--- | :--- | :--- | :--- |
| Primary | `brand-600` | `#1B5DB8` | Primary CTA, active tabs, important highlights |
| Success | `at-green` | `#10B981` | Active policy, approved collection, completed task |
| Warning | `at-amber` | `#F59E0B` | Renewal risk, pending offer, caution state |
| Danger | `at-red` | `#EF4444` | Cancelled policy, overdue payment, failure state |
| Neutral | `slate-400` | `#94A3B8` | Labels, hints, secondary metadata |

### 4.2 Surface Styling

- Cards should generally use white surfaces, subtle borders, and soft shadows.
- Preferred card radius is `rounded-xl` or `rounded-2xl` depending on the host surface, but a page should not mix many radius systems.
- Borders must be quiet. Prefer `slate-100` or equivalent low-contrast neutrals.
- Backgrounds should support information hierarchy, not compete with the data.

### 4.3 Typography & Density

- Default UI font is `DM Sans`.
- Labels should read lighter and smaller than values.
- Recommended default pair:
  - Label: `slate-400`, normal weight, around `11px`
  - Value: `slate-900`, semibold, around `13px`
- Avoid large decorative headings inside dense business cards.
- Use consistent title casing for section titles within a page.

## 5. Page Archetypes

Every page should match one of these archetypes. Mixing patterns without intent leads to drift.

### 5.1 Workbench / Operational List Page

Use for pages like claims, payments, renewals, reconciliation, reports, imports, and communication.

- Must use a clear page heading and a one-line operational subtitle.
- Must expose the main action area at the top-right or in the primary toolbar.
- Filters, scope selectors, and summary metrics should appear before or adjacent to the main table content.
- Table, summary, and side actions should feel like one system, not separate mini-pages.
- Empty states must explain what is missing and what the user can do next.

### 5.2 Detail Page

Policy, offer, claim, customer, and similar detail pages should follow the AT master skeleton.

- Use an `8 + 4` responsive structure on desktop.
- Left column: technical, financial, status, and history content.
- Right column: customer context, assignments, documents, reminders, and related operational widgets.
- Right column should remain sticky when the page length benefits from that behavior.
- Data rows should typically use `flex justify-between`: label on the left, value on the right.
- Long values may wrap, but alignment must stay legible.

### 5.3 Form / Wizard Page

Use for imports, assisted creation, and multi-step operational flows.

- The current step must always be visually obvious.
- Inputs should be grouped by task, not by database structure.
- Helper text should reduce ambiguity, not restate the label.
- File upload, mapping, and preview flows must feel part of the AT system, not default browser UI.

### 5.4 Modal / Side Panel

- Use for short, focused tasks only.
- Do not move a full detail workflow into a modal just to avoid navigation.
- If a modal task grows to require guidance copy, summary metrics, contextual linking, or post-submit routing, promote it to a full page or workbench flow and keep the modal limited to the narrow upload or edit step itself.
- The primary action must be visible without scrolling in common viewport sizes when feasible.
- Closing behavior must be clear and forgiving.

## 6. Component Rules

### 6.1 Cards

- Cards must preserve generous internal spacing and clear section boundaries.
- A card should usually communicate one business purpose.
- Do not hide an entire card just because the dataset is empty if the card itself explains an important capability.
- Prefer an intentional empty state with icon, short explanation, and optional action.

### 6.2 Status Badges

- Use soft backgrounds and darker foregrounds.
- Prefer `rounded-full`, compact vertical padding, and `text-xs` sizing.
- Badge semantics must be consistent across modules. For example, `pending` cannot be amber on one page and blue on another without a strong reason.
- Whenever possible, use the shared `StatusBadge` component instead of ad-hoc colored spans.

### 6.3 Buttons & Action Hierarchy

- Every surface should have a single obvious primary action.
- Secondary actions should remain visually quieter than the primary CTA.
- Destructive actions must never visually compete with primary save/continue actions.
- Use `ActionButton` unless there is a strong implementation reason not to.
- Avoid icon-only buttons without a tooltip or accessible label when the meaning is not universal.

### 6.4 Inline Editing

- User-maintained fields such as policy number, tax ID, contact details, and related operational metadata should support efficient editing when the workflow benefits from it.
- Hover and focus states must make editability obvious.
- Inline edit controls should keep layout shift minimal.

### 6.5 Tables

- Prefer `ListTable` for standard list experiences.
- Column labels, empty values, and status text must all be translated.
- Numeric columns should align right.
- Monetary columns must include currency formatting.
- Row actions should be consistent in location and visual weight.
- Do not overload tables with more columns than the operational task requires.

## 7. State Design Standards

Every new surface must explicitly define these states.

### 7.1 Loading State

- Use skeletons, shimmer placeholders, or reserved structure where appropriate.
- Loading should preserve layout rhythm and reduce jumpiness.
- Avoid blank white screens while data loads.

### 7.2 Empty State

- State must explain what is absent.
- Message must be bilingual.
- When meaningful, include the next action, such as create, import, refresh, or broaden filters.

### 7.3 Error State

- Use calm, actionable language.
- Expose retry when retry is safe.
- Technical raw errors should not leak directly to end users.
- If the screen is partially usable, fail soft and keep unaffected sections visible.

### 7.4 Partial Data / Degraded State

- If one widget fails, do not collapse the entire page unless the page truly cannot function.
- Prefer sectional error handling over global failure when the rest of the data remains valid.

## 8. Data Formatting & Business Semantics

### 8.1 Currency

- All premium, payment, collection, and financial values must use agency-standard formatting with thousands separators.
- Values should be right-aligned.
- Currency symbols or codes must be visible.

### 8.2 Dates & Time

- Dates must be formatted consistently within a page.
- If time precision matters operationally, include time intentionally instead of mixing date-only and date-time values arbitrarily.
- Relative labels like `today` or `overdue` must be localized.

### 8.3 Identity & Contact Data

- Mask sensitive identifiers such as TCKN, tax ID, phone, and similar values where the workflow allows it.
- Do not expose more personal data than the current task requires.
- Sensitive data displays should reflect role or permission constraints where applicable.

### 8.4 Fallback Copy

- Avoid raw placeholders like `N/A`, `Unknown`, or `-` unless the page uses them consistently and intentionally.
- Prefer domain-aware localized fallbacks such as `Belirtilmedi` / `Not provided`.

## 9. Responsive & Accessibility Standards

### 9.1 Responsive Rules

- Desktop is the densest view, but every operational page must still remain usable on narrower widths.
- Detail pages should collapse from `8 + 4` into a single-column reading flow on smaller screens.
- Sticky sidebars must degrade gracefully on mobile.
- Controls should wrap before they overlap or clip.

### 9.2 Accessibility Rules

- All interactive controls must have accessible labels.
- Color must not be the only carrier of meaning.
- Focus states must be visible.
- Custom file pickers, inline edits, buttons, menus, and tabs must remain keyboard reachable.
- Placeholder text is not a substitute for labels.

## 10. Workflow Rules For Developers And AI Agents

### 10.1 Before Building

- Identify the closest existing page or component that already solves the same problem.
- Reuse the same layout grammar, spacing rhythm, and translation strategy.
- Decide the page archetype before writing markup.

### 10.2 While Building

- Keep business logic and UI structure separate.
- Prefer extending shared composables and shared components over page-local duplication.
- Keep translation keys near the owning module unless the app already centralizes that copy.
- Design loading, empty, and error states as first-class outputs, not afterthoughts.

### 10.3 Before Merge

- Run the relevant frontend checks.
- Verify the page in both TR and EN if the changed surface is user-facing.
- Compare the edited page against policy pages and adjacent modules for visual consistency.
- Verify copy in the persistent shell too: route title, sidebar labels, shell subtitle, scope controls, and breadcrumbs must still match the current surface after the change.
- Confirm that route title, buttons, filters, empty states, badges, and helper text are translated.

## 11. Anti-Patterns

Avoid the following unless there is a documented exception.

- Hardcoded user-facing text.
- Raw browser default controls when the rest of the page uses branded AT surfaces.
- Multiple badge color meanings for the same business status.
- Creating a new local card/table/button pattern when a shared component already exists.
- Hiding empty sections instead of explaining their absence.
- Using English fallback text inside Turkish UI.
- Overusing bright color accents on dense business screens.
- Mixing unrelated spacing, radius, or shadow systems inside one page.
- Shipping a page that only looks correct in one language.

## 12. Delivery Checklist

Every user-facing frontend change should satisfy this checklist.

- [ ] All visible strings are translated.
- [ ] Route title and page header are translated.
- [ ] No raw translation keys appear in runtime UI.
- [ ] Shared components were reused where possible.
- [ ] Primary, secondary, warning, and destructive actions are visually distinct and consistent.
- [ ] Loading, empty, and error states were intentionally designed.
- [ ] Currency, dates, status labels, and fallback values follow AT formatting rules.
- [ ] Sensitive identifiers are masked where appropriate.
- [ ] Mobile and desktop layouts are both usable.
- [ ] Keyboard reachability and visible focus states remain intact.
- [ ] The page still feels like the same product family as Policies.

## 13. Definition Of Done For UI Work

A UI task is not done when it merely functions. It is done when:

- the workflow is understandable without developer context,
- the screen is visually aligned with the AT system,
- the copy is bilingual and domain-correct,
- the states are complete,
- and the next developer can extend the same surface without inventing a new pattern.

If a change solves the ticket but increases UI drift, it is incomplete.

