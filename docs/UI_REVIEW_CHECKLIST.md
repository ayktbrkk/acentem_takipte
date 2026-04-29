# AT UI Review Checklist

This checklist is the fast review layer for user-facing frontend work in AT.

Use it during self-review, PR review, and AI-assisted implementation review.

Primary reference: `docs/DESIGN_GUIDELINES.md`

## 1. Review Goal

The goal is not only to confirm that a screen works. The goal is to confirm that it:

- belongs to the same product family as Policies,
- preserves bilingual UI quality,
- uses existing shared patterns before inventing new ones,
- and handles operational states clearly.

## 2. Pre-Review Context

Before reviewing, identify these four items:

- What page archetype is this: workbench, detail, form/wizard, or modal/panel?
- What existing AT screen is the closest visual reference?
- Which shared components should have been reused?
- Which user-facing strings, statuses, and fallbacks were introduced or changed?

If these answers are unclear, the implementation is probably still too ad hoc.

## 3. Shared Pattern Check

- `WorkbenchPageLayout` used for workbench-style pages where appropriate.
- `SectionPanel` used for grouped card surfaces instead of page-local card clones.
- `ActionButton` used for primary and secondary actions unless there is a justified exception.
- `ListTable` used for standard list/table surfaces where it fits.
- `StatusBadge` used for semantic status rendering instead of custom colored spans.
- `EditableCard` or existing detail surfaces reused before introducing a new edit pattern.
- `StandardCustomerCard` reused for right-column customer context when applicable.

## 4. Visual Consistency Check

- The page still looks like AT, not a separate product.
- Policies remain the baseline reference for spacing, hierarchy, density, and card rhythm.
- Radius, border, and shadow choices are consistent within the page.
- There is one obvious primary action.
- Secondary actions are visually quieter than the primary action.
- Destructive actions do not compete with save/continue actions.
- Native browser-looking controls are not exposed on branded surfaces unless required.

## 5. Bilingual UI Check

- No hardcoded user-facing text remains in the changed surface.
- TR and EN entries were added in the same workstream.
- Route title, page title, button labels, hints, empty states, errors, badges, filters, and helper copy are translated.
- No raw translation keys are visible at runtime.
- Fallback text is localized and domain-correct.

## 6. State Coverage Check

Confirm the screen intentionally handles all relevant states:

- loading
- empty
- error
- partial/degraded
- success/confirmation when applicable

Review questions:

- Does loading preserve layout rhythm?
- Does empty state explain what is missing and what the user can do next?
- Does error copy help the user recover?
- If one request fails, does the whole page collapse unnecessarily?

## 7. Data Semantics Check

- Currency values are formatted consistently and aligned correctly.
- Dates and date-times are consistent within the page.
- Sensitive fields such as TCKN, tax ID, phone, and similar identifiers are masked where appropriate.
- Status labels use the same semantics and colors used elsewhere in AT.
- Generic placeholders like `Unknown`, `N/A`, or `-` are not used casually.

## 8. Layout & Responsive Check

- Desktop view supports dense operations without clutter.
- Narrow widths remain usable.
- Detail pages collapse cleanly from `8 + 4` to a readable single-column flow.
- Sticky sidebars or sticky actions degrade correctly on smaller screens.
- Toolbar actions wrap before overlapping or clipping.

## 9. Accessibility Check

- Interactive elements have accessible labels.
- Focus states are visible.
- Color is not the only way a status or warning is communicated.
- Custom controls remain keyboard reachable.
- Placeholder text is not used as the only label.

## 10. Implementation Discipline Check

- The solution extends shared components before creating parallel markup.
- Business logic and presentational structure remain separated.
- New translation keys are named semantically, not casually.
- The page does not introduce one-off styling that should have been systemized.
- The implementation makes future extension easier, not harder.

## 11. Live Validation Check

Where applicable, verify the changed surface live in the browser.

- TR runtime checked.
- EN runtime checked if language switch affects the surface.
- No visible console-facing breakage implied by the UI behavior.
- File pickers, tables, filters, quick actions, and modals still function after styling changes.

## 12. Review Outcome

Approve only if all of the following are true:

- the workflow is understandable without code context,
- the surface is visually aligned with AT,
- the changed copy is bilingual and correct,
- the states are complete,
- and the implementation does not create a new design dialect.

## 13. Short PR Comment Template

Use this when reviewing a UI PR:

```md
UI review summary:

- Archetype: [workbench/detail/form/modal]
- Baseline reference: [closest existing page]
- Shared components reused: [list]
- i18n status: [ok/issues]
- State coverage: [ok/issues]
- Responsive/accessibility: [ok/issues]
- Visual drift risk: [none/low/medium/high]

Decision:
- [approved]
- [approved with follow-ups]
- [changes requested]
```