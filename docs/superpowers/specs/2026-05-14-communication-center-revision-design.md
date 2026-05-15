# Communication Center Revision — Design Spec

## Scope

Revision of `/at/communication` (CommunicationCenter page) against DESIGN_GUIDELINES.md v2.3. 14 files touched across router, page, store, translations, composables, and components.

## Files Changed

```
frontend/src/
├── router/index.js
├── pages/CommunicationCenter.vue
├── pages/CommunicationHub.vue
├── config/communication_translations.js
├── stores/communication.js
├── composables/communicationCenter/
│   ├── helpers.js
│   ├── common.js                          🗑️ DELETE — dead code
│   ├── state.js
├── components/
│   ├── ui/ListTable.vue                    EXTEND — new column types
│   ├── ui/ATSelect.vue                     🆕 shared select component
│   └── communication-center/
│       ├── CommunicationCenterOverview.vue
│       ├── CommunicationCenterQueueSections.vue
│       ├── CommunicationCenterDialogs.vue
│       ├── CommunicationCenterAlerts.vue
│       └── CommunicationCenterActionBar.vue
```

## 1. Translation Fixes

### 1.1 Missing Keys

Add these 5 keys to `communication_translations.js`:

| Key | TR | EN |
|-----|----|----|
| `saveDraft` | Taslak Kaydet | Save Draft |
| `sendImmediately` | Hemen Gönder | Send Immediately |
| `selectCampaign` | Kampanya seçin | Select a campaign |
| `selectSegment` | Segment seçin | Select a segment |
| `customer` | Müşteri | Customer |

### 1.2 Remove Unused Key

- `exportPdf` — translation exists but ActionBar has no PDF button → remove from both TR and EN.

### 1.3 Route Meta Translation

In `router/index.js`, change:
- `meta.title: "Communication Center"` → `meta.titleKey: "communication_title"`
- `meta.section: "Control Center"` → `meta.sectionKey: "communication_section"`

In `CommunicationCenter.vue`, resolve through `t()` and pass to `WorkbenchPageLayout` breadcrumb logic (the layout already reads `meta.title` for the page heading).

Add the translation keys:

| Key | TR | EN |
|-----|----|----|
| `communication_title` | İletişim Merkezi | Communication Center |
| `communication_section` | Kontrol Merkezi | Control Center |

## 2. New Shared Component: ATSelect

`components/ui/ATSelect.vue` — simple styled native `<select>` wrapper.

Props:
- `modelValue` (String) — v-model target
- `options` (Array of `{value, label}`) — option list
- `placeholder` (String, optional) — first empty option label

Events:
- `update:modelValue`

Styling aligns with DESIGN_GUIDELINES §4: `rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm h-9 min-w-[140px]`.

### Migration

- `CommunicationCenterOverview.vue` lines 9, 15: raw `<select>` with `class="input"` → `<ATSelect>`
- `CommunicationCenterDialogs.vue` lines 36, 90: raw `<select>` with `class="input"` → `<ATSelect>`

Props mapping for filters (`Overview.vue`):
- `ATSelect` with `:options`, `v-model`, `@change` still calls `runtime.applySnapshotFilters`
- Remove inline `input` class

Props mapping for Dialogs:
- `ATSelect` with `:options`, `v-model`
- Remove inline `input` class
- `data-testid` attributes preserved

## 3. ListTable Extension

### 3.1 New Column Types

Add to `ListTable.vue` column rendering:

**`compound`** — Two-line cell with optional badge:

```js
{
  key: "recipient",
  type: "compound",
  primaryKey: "recipient",     // bold line
  secondaryKey: "name",        // subtitle line
  badgeKey: "reference_doctype",  // optional badge label
  badgeSecondaryKey: "reference_name", // optional badge subtext
  domain: "reference_type",    // StatusBadge domain
}
```

Renders:
```
<p class="font-medium text-slate-800">{{ row[primaryKey] || "-" }}</p>
<p class="text-xs text-slate-500">{{ row[secondaryKey] || "-" }}</p>
<div v-if="badgeKey && row[badgeKey]" class="mt-1 flex flex-wrap items-center gap-1">
  <StatusBadge v-if="domain" :domain="domain" :status="row[badgeKey]" />
  <span v-if="badgeSecondaryKey" class="text-xs text-slate-500">{{ row[badgeSecondaryKey] }}</span>
</div>
```

**`status-meta`** — StatusBadge + error message:

```js
{
  key: "status",
  type: "status-meta",
  metaKey: "error_message",
  domain: "notification_status",
}
```

Renders:
```
<StatusBadge :domain="domain" :status="row[key]" />
<p v-if="metaKey && row[metaKey]" class="mt-1 max-w-[320px] truncate text-xs text-rose-600">{{ row[metaKey] }}</p>
```

**`attempts`** — `attempt_count / max_attempts` display:

```js
{
  key: "attempts",
  type: "attempts",
  currentKey: "attempt_count",
  maxKey: "max_attempts",
}
```

**`actions-advanced`** — InlineActionRow with ActionButton:

```js
{
  key: "actions",
  type: "actions-advanced",
  actionKey: "_actions",  // array of {label, variant, disabled, onClick}
}
```

Renders:
```
<InlineActionRow>
  <ActionButton v-for="action in row[_actions]" :variant="action.variant" size="xs" @click="action.onClick(row)">
    {{ action.label }}
  </ActionButton>
</InlineActionRow>
```

### 3.2 Outbox Table Migration

`CommunicationCenterQueueSections.vue` outbox table → `<ListTable>` with new column types.

Column definition (built in a computed, passed as prop):

```js
const outboxColumns = computed(() => [
  { key: "recipient", type: "compound", primaryKey: "recipient", secondaryKey: "name", badgeKey: "reference_doctype", badgeSecondaryKey: "reference_name", domain: "reference_type", label: t("recipient") },
  { key: "channel", type: "status", domain: "notification_channel", label: t("channel") },
  { key: "status", type: "status-meta", metaKey: "error_message", domain: "notification_status", label: t("status") },
  { key: "attempts", type: "attempts", currentKey: "attempt_count", maxKey: "max_attempts", label: t("attempts") },
  { key: "next_retry_on", type: "date", label: t("nextRetry") },
  { key: "actions", type: "actions-advanced", actionKey: "_actions", label: t("actions") },
]);
```

Row data transformation (computed, enriches outboxItems).
Pre-resolve reference type labels since ListTable has no access to `t()`:

```js
const outboxRows = computed(() =>
  unref(outboxItems).map((row) => ({
    ...row,
    _reference_label: referenceTypeLabel(row.reference_doctype),
    _actions: buildOutboxActions(row),
  }))
);

function buildOutboxActions(row) {
  const actions = [];
  if (canRetryOutboxRow(row)) actions.push({ label: t("retry"), variant: "secondary", onClick: () => runtime.retryOutbox(row.name) });
  if (canSendDraftFromOutbox(row)) actions.push({ label: t("sendNow"), variant: "secondary", onClick: () => runtime.sendDraftNow(row.draft) });
  if (canOpenPanel(row)) actions.push({ label: panelActionLabel(row), variant: "link", onClick: () => openPanel(row) });
  return actions;
}
```

The compound column for recipient uses `badgeKey: "_reference_label"` (pre-resolved) instead of `badgeKey: "reference_doctype"` (raw doctype name).

### 3.3 Drafts Section

Drafts remain as cards (not a table). The existing card grid pattern in `QueueSections.vue` stays unchanged.

`ListTable` is only used for the outbox table.

## 4. Dead Code Cleanup

- Delete `composables/communicationCenter/common.js` — contains duplicate `isPermissionDeniedError`, `statusLabel`, `channelLabel`, `referenceTypeLabel` functions (different parameter order). All imports use `helpers.js`.

## 5. Visual Consistency Audit

### 5.1 Outobox Card/Loading States

- Loading spinner inside outbox section: use same `ListTable` loading prop instead of custom div
- Empty state: `ListTable`'s built-in `emptyMessage` prop

### 5.2 SectionPanel Consistency

- Both outbox and draft sections use `SectionPanel` — already correct
- Card radius: `rounded-2xl` (matches DESIGN_GUIDELINES §4.2)

### 5.3 Color Tokens

- Error text: change `qc-inline-error` class → `text-rose-600` (uses `at-red` token `#EF4444`)
- Remove `qc-error-banner`, `qc-inline-error` custom scoped classes from components; use existing AT utility classes instead.

## 6. Files With No Changes

- `CommunicationCenterAlerts.vue` — already clean
- `CommunicationCenterActionBar.vue` — already clean
- `runtime.js` — unchanged
- `actions.js` — unchanged
- `quickDialogs.js` — unchanged
- `resources.js` — unchanged
- `operations.js` — unchanged
- `communication.js` (store) — unchanged
- `helpers.js` — unchanged (other than removing the duplicate from common.js)

## 7. Test Implications

- `CommunicationCenter.test.js` — existing snapshot + interaction tests should still pass
- The call_note and reminder dialog tests stub `QuickCreateManagedDialog`, so ATSelect migration doesn't affect them
- Outbox table migration to ListTable: `DataTableCell`, `InlineActionRow`, `StatusBadge` stubs in tests may need adjustment — the test mounts CommunicationCenter directly, and ListTable is rendered inside QueueSections. Verify the existing test stubs still cover the behavior.
- `ListTable` may need its own test additions for new column types

## 8. Build & Validation

1. `npm run typecheck` — no new type errors
2. `npm run test:unit` — all 268+ tests pass
3. `npm run lint` — no new lint errors
4. `npm run build` — production build succeeds
