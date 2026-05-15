# Communication Center Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise the `/at/communication` page according to DESIGN_GUIDELINES.md v2.3 — translation gaps, shared component migration, dead code removal, route meta translation, and visual consistency.

**Architecture:** All changes are frontend-only in `frontend/src/`. No backend API changes needed. The new `ATSelect` component is a styled native `<select>` wrapper. `ListTable` gets 4 new column types for the outbox table migration.

**Tech Stack:** Vue 3, frappe-ui, Vitest, Tailwind CSS

---

### Task 1: Create ATSelect shared component

**Files:**
- Create: `frontend/src/components/ui/ATSelect.vue`
- Create: `frontend/src/components/ui/ATSelect.test.js`

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/components/ui/ATSelect.test.js
import { mount } from "@vue/test-utils";
import { describe, it, expect } from "vitest";
import ATSelect from "./ATSelect.vue";

describe("ATSelect", () => {
  it("renders placeholder when no value selected", () => {
    const wrapper = mount(ATSelect, {
      props: {
        options: [{ value: "opt1", label: "Option 1" }],
        placeholder: "Seçiniz",
        "onUpdate:modelValue": () => {},
      },
    });
    const select = wrapper.find("select");
    const placeholderOption = select.find("option[value='']");
    expect(placeholderOption.exists()).toBe(true);
    expect(placeholderOption.text()).toBe("Seçiniz");
  });

  it("renders options with correct labels", () => {
    const wrapper = mount(ATSelect, {
      props: {
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
        "onUpdate:modelValue": () => {},
      },
    });
    const allOptions = wrapper.findAll("option");
    // No placeholder → 2 options
    expect(allOptions).toHaveLength(2);
    expect(allOptions[0].text()).toBe("Option 1");
  });

  it("emits update:modelValue on change", async () => {
    const updateMock = vi.fn();
    const wrapper = mount(ATSelect, {
      props: {
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        "onUpdate:modelValue": updateMock,
      },
    });
    const select = wrapper.find("select");
    await select.setValue("b");
    expect(updateMock).toHaveBeenCalledWith("b");
  });

  it("displays the selected modelValue", () => {
    const wrapper = mount(ATSelect, {
      props: {
        modelValue: "opt1",
        options: [{ value: "opt1", label: "Option 1" }],
        "onUpdate:modelValue": () => {},
      },
    });
    expect(wrapper.find("select").element.value).toBe("opt1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/ATSelect.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the component**

```vue
<!-- frontend/src/components/ui/ATSelect.vue -->
<template>
  <select
    :value="modelValue"
    class="at-select"
    v-bind="$attrs"
    @change="$emit('update:modelValue', ($event.target).value)"
  >
    <option v-if="placeholder" value="">{{ placeholder }}</option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>
</template>

<script setup>
defineProps({
  modelValue: { type: [String, Number], default: "" },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: "" },
});

defineEmits(["update:modelValue"]);
</script>

<style scoped>
.at-select {
  @apply h-9 min-w-[140px] rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/ATSelect.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/ATSelect.vue frontend/src/components/ui/ATSelect.test.js
git commit -m "feat: add ATSelect shared select component"
```

---

### Task 2: Update communication translations

**Files:**
- Modify: `frontend/src/config/communication_translations.js`

- [ ] **Step 1: Edit the translations file**

Add 5 missing keys (`saveDraft`, `sendImmediately`, `selectCampaign`, `selectSegment`, `customer`) and remove `exportPdf`:

```js
// In TR block, add after existing keys:
saveDraft: "Taslak Kaydet",
sendImmediately: "Hemen Gönder",
selectCampaign: "Kampanya seçin",
selectSegment: "Segment seçin",
customer: "Müşteri",

// Remove exportPdf line from TR block

// In EN block, add after existing keys:
saveDraft: "Save Draft",
sendImmediately: "Send Immediately",
selectCampaign: "Select a campaign",
selectSegment: "Select a segment",
customer: "Customer",

// Remove exportPdf line from EN block
```

- [ ] **Step 2: Verify translations are valid**

Run: `npx vitest run src/pages/CommunicationCenter.test.js --reporter=verbose 2>&1 | head -20`
Expected: All existing tests still pass

- [ ] **Step 3: Commit**

```bash
git add frontend/src/config/communication_translations.js
git commit -m "fix: add missing communication translations, remove unused exportPdf key"
```

---

### Task 3: Make route meta translatable

**Files:**
- Modify: `frontend/src/router/index.js`
- Modify: `frontend/src/pages/CommunicationCenter.vue`
- Modify: `frontend/src/config/communication_translations.js`

- [ ] **Step 1: Update route meta in router/index.js**

```js
// Change from:
{
  path: "/communication",
  name: "communication-center",
  component: CommunicationHub,
  meta: {
    title: "Communication Center",
    section: "Control Center",
  },
},
// To:
{
  path: "/communication",
  name: "communication-center",
  component: CommunicationHub,
  meta: {
    titleKey: "communication_title",
    sectionKey: "communication_section",
  },
},
```

- [ ] **Step 2: Add translation keys for route meta**

In `communication_translations.js`:

```js
// TR block:
communication_title: "İletişim Merkezi",
communication_section: "Kontrol Merkezi",

// EN block:
communication_title: "Communication Center",
communication_section: "Control Center",
```

- [ ] **Step 3: Update CommunicationCenter.vue to resolve route meta via t()**

The `WorkbenchPageLayout` already reads `meta.title` for the breadcrumb/heading. We need the page to override. Add a computed:

```js
// In CommunicationCenter.vue <script setup>, add after route/communicationStore lines:
const routeTitle = computed(() => t("communication_title"));
const routeSection = computed(() => t("communication_section"));
```

Also need to update the WorkbenchPageLayout usage — the layout component's `:title` prop should now use `routeTitle`. Looking at the current template:

```vue
<WorkbenchPageLayout
  :breadcrumb="t('breadcrumb')"
  :title="t('title')"
  :subtitle="t('subtitle')"
```

The `t('title')` already returns "İletişim Merkezi" which matches. But the route itself still has hardcoded English in `meta.title`. Since the router reads `meta.title` for things like browser tab title, we need to provide a translated fallback there too — but for now, the `t()` resolution in the page component is sufficient since WorkbenchPageLayout already uses the `:title` prop.

No template changes needed to CommunicationCenter.vue — `t('title')` already resolves from communication_translations.

- [ ] **Step 4: Verify**

Run: `npx vitest run src/pages/CommunicationCenter.test.js`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router/index.js frontend/src/config/communication_translations.js
git commit -m "fix: make communication route meta translatable"
```

---

### Task 4: Remove dead code (common.js)

**Files:**
- Delete: `frontend/src/composables/communicationCenter/common.js`

- [ ] **Step 1: Verify nothing imports common.js**

Run: `Select-String -Path "frontend/src/**/*.{js,vue}" -Pattern "common"` (should show no imports pointing to `common.js`)

- [ ] **Step 2: Delete the file**

```bash
Remove-Item -LiteralPath "frontend/src/composables/communicationCenter/common.js"
```

- [ ] **Step 3: Run tests to verify nothing broke**

Run: `npx vitest run src/pages/CommunicationCenter.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/composables/communicationCenter/common.js (deleted)
git commit -m "chore: remove unused common.js duplicate of helpers.js"
```

---

### Task 5: Extend ListTable with new column types

**Files:**
- Modify: `frontend/src/components/ui/ListTable.vue`
- Create: `frontend/src/components/ui/ListTable.test.js`

- [ ] **Step 1: Write the failing test for new column types**

```js
// frontend/src/components/ui/ListTable.test.js
import { mount } from "@vue/test-utils";
import { describe, it, expect, vi } from "vitest";
import ListTable from "./ListTable.vue";

// Stub StatusBadge since it's a dependency
vi.mock("@/components/ui/StatusBadge.vue", () => ({
  default: { template: "<span class='stub-badge'><slot /></span>" },
}));

describe("ListTable extended column types", () => {
  const baseProps = {
    columns: [],
    rows: [],
    loading: false,
    emptyMessage: "No data",
  };

  it("renders compound column with primary and secondary text", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "info", type: "compound", primaryKey: "name", secondaryKey: "email", label: "Info" },
        ],
        rows: [{ name: "John", email: "john@test.com" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("John");
    expect(wrapper.text()).toContain("john@test.com");
  });

  it("renders status-meta column with badge and error text", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "status", type: "status-meta", metaKey: "error", domain: "notification_status", label: "Status" },
        ],
        rows: [{ status: "Failed", error: "Connection error" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("Connection error");
  });

  it("renders attempts column as count/max", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "attempts", type: "attempts", currentKey: "count", maxKey: "max", label: "Attempts" },
        ],
        rows: [{ count: 2, max: 5 }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("2");
    expect(wrapper.text()).toContain("5");
  });

  it("renders actions-advanced column with action buttons", async () => {
    const clickMock = vi.fn();
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "actions", type: "actions-advanced", actionKey: "_actions", label: "Actions" },
        ],
        rows: [{ _actions: [{ label: "Retry", variant: "secondary", onClick: clickMock }] }],
      },
      global: { stubs: { StatusBadge: true, ActionButton: { template: "<button @click='$attrs.onClick'><slot /></button>" } } },
    });
    const btn = wrapper.find("button");
    expect(btn.text()).toBe("Retry");
    await btn.trigger("click");
    expect(clickMock).toHaveBeenCalled();
  });

  it("renders compound column with badge", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          {
            key: "info",
            type: "compound",
            primaryKey: "recipient",
            secondaryKey: "name",
            badgeKey: "ref_label",
            badgeSecondaryKey: "ref_name",
            label: "Info",
          },
        ],
        rows: [{ recipient: "ali@x.com", name: "REC-001", ref_label: "Policy", ref_name: "POL-001" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("ali@x.com");
    expect(wrapper.text()).toContain("REC-001");
    expect(wrapper.text()).toContain("Policy");
    expect(wrapper.text()).toContain("POL-001");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/ListTable.test.js`
Expected: FAIL — new column types not implemented

- [ ] **Step 3: Add new column type rendering to ListTable.vue**

Extend the template rendering logic. Add after the existing `type === 'stacked'` block:

```vue
<!-- compound: two-line cell with optional badge -->
<div v-else-if="col.type === 'compound'" class="min-w-[280px]">
  <p class="font-medium text-slate-800">{{ row[col.primaryKey] ?? '-' }}</p>
  <p class="text-xs text-slate-500">{{ row[col.secondaryKey] ?? '-' }}</p>
  <div v-if="col.badgeKey && row[col.badgeKey]" class="mt-1 flex flex-wrap items-center gap-1">
    <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
      {{ row[col.badgeKey] }}
    </span>
    <span v-if="col.badgeSecondaryKey && row[col.badgeSecondaryKey]" class="text-xs text-slate-500">{{ row[col.badgeSecondaryKey] }}</span>
  </div>
</div>

<!-- status-meta: StatusBadge + error text -->
<div v-else-if="col.type === 'status-meta'" class="min-w-[220px]">
  <StatusBadge v-if="row[col.key]" :domain="col.domain" :status="row[col.key]" />
  <span v-else class="text-slate-700">-</span>
  <p v-if="col.metaKey && row[col.metaKey]" class="mt-1 max-w-[320px] truncate text-xs text-rose-600">
    {{ row[col.metaKey] }}
  </p>
</div>

<!-- attempts: count/max display -->
<div v-else-if="col.type === 'attempts'">
  <span class="text-slate-700">{{ row[col.currentKey] ?? 0 }}/{{ row[col.maxKey] ?? 0 }}</span>
</div>

<!-- actions-advanced: InlineActionRow with ActionButton -->
<div v-else-if="col.type === 'actions-advanced'" class="min-w-[240px]" @click.stop>
  <InlineActionRow>
    <ActionButton
      v-for="action in (row[col.actionKey] || [])"
      :key="action.label"
      :variant="action.variant"
      size="xs"
      @click.stop="action.onClick?.(row)"
    >
      {{ action.label }}
    </ActionButton>
  </InlineActionRow>
</div>
```

Import the missing components at the top of `<script setup>`:

```js
import ActionButton from "../app-shell/ActionButton.vue";
import InlineActionRow from "../app-shell/InlineActionRow.vue";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/ListTable.test.js`
Expected: PASS

- [ ] **Step 5: Run existing communication tests to verify no regression**

Run: `npx vitest run src/pages/CommunicationCenter.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/ListTable.vue frontend/src/components/ui/ListTable.test.js
git commit -m "feat: extend ListTable with compound, status-meta, attempts, actions-advanced column types"
```

---

### Task 6: Migrate Overview.vue raw selects to ATSelect

**Files:**
- Modify: `frontend/src/components/communication-center/CommunicationCenterOverview.vue`
- Modify: `frontend/src/pages/CommunicationCenter.test.js` (update stubs)

- [ ] **Step 1: Update component template**

Replace the two raw `<select>` elements with ATSelect.

Change:
```vue
<select v-model="filters.status" class="input h-9 py-1 text-sm min-w-[140px]" @change="runtime.applySnapshotFilters">
  <option value="">{{ t('allStatuses') }}</option>
  <option v-for="option in statusOptions" :key="option.value" :value="option.value">
    {{ option.label }}
  </option>
</select>
```
To:
```vue
<ATSelect
  v-model="filters.status"
  :placeholder="t('allStatuses')"
  :options="statusOptions"
  @change="runtime.applySnapshotFilters"
/>
```

Change:
```vue
<select v-model="filters.channel" class="input h-9 py-1 text-sm min-w-[140px]" @change="runtime.applySnapshotFilters">
  <option value="">{{ t('allChannels') }}</option>
  <option v-for="option in channelOptions" :key="option.value" :value="option.value">
    {{ option.label }}
  </option>
</select>
```
To:
```vue
<ATSelect
  v-model="filters.channel"
  :placeholder="t('allChannels')"
  :options="channelOptions"
  @change="runtime.applySnapshotFilters"
/>
```

Add import:
```js
import ATSelect from "../ui/ATSelect.vue";
```

- [ ] **Step 2: Update test stubs in CommunicationCenter.test.js**

Add `ATSelect: true` to the stubs object in each test mount call.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/pages/CommunicationCenter.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/communication-center/CommunicationCenterOverview.vue frontend/src/pages/CommunicationCenter.test.js
git commit -m "refactor: migrate raw selects to ATSelect in Overview"
```

---

### Task 7: Migrate Dialogs.vue raw selects to ATSelect

**Files:**
- Modify: `frontend/src/components/communication-center/CommunicationCenterDialogs.vue`

- [ ] **Step 1: Update component template**

Replace the two raw `<select>` elements with ATSelect.

In the campaign run dialog:
```vue
<select v-model="campaignRunSelection" class="input" data-testid="campaign-run-select">
  <option value="">{{ t('selectCampaign') }}</option>
  <option v-for="option in communicationQuickOptionsMap.campaigns" :key="option.value" :value="option.value">
    {{ option.label }}
  </option>
</select>
```
→
```vue
<ATSelect
  v-model="campaignRunSelection"
  :placeholder="t('selectCampaign')"
  :options="communicationQuickOptionsMap.campaigns"
  data-testid="campaign-run-select"
/>
```

In the segment preview dialog:
```vue
<select v-model="segmentPreviewSegment" class="input" data-testid="segment-preview-select">
  <option value="">{{ t('selectSegment') }}</option>
  <option v-for="option in communicationQuickOptionsMap.segments" :key="option.value" :value="option.value">
    {{ option.label }}
  </option>
</select>
```
→
```vue
<ATSelect
  v-model="segmentPreviewSegment"
  :placeholder="t('selectSegment')"
  :options="communicationQuickOptionsMap.segments"
  data-testid="segment-preview-select"
/>
```

Add import:
```js
import ATSelect from "../ui/ATSelect.vue";
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/pages/CommunicationCenter.test.js`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/communication-center/CommunicationCenterDialogs.vue
git commit -m "refactor: migrate raw selects to ATSelect in Dialogs"
```

---

### Task 8: Migrate outbox table to extended ListTable

**Files:**
- Modify: `frontend/src/components/communication-center/CommunicationCenterQueueSections.vue`
- Modify: `frontend/src/pages/CommunicationCenter.test.js` (update stubs)

- [ ] **Step 1: Update QueueSections.vue template and script**

Replace the raw outbox `<table>` section with `<ListTable>`. Keep the draft card section unchanged.

```vue
<template>
  <SectionPanel :title="t('outboxTitle')" :count="outboxItems.length" panel-class="surface-card rounded-2xl p-5">
    <ListTable
      :columns="outboxColumns"
      :rows="outboxRows"
      :loading="snapshotLoading"
      :empty-message="t('emptyOutbox')"
    />
  </SectionPanel>

  <!-- draft cards section unchanged -->
  ...
</template>

<script setup>
// ... existing imports plus:
import ListTable from "../ui/ListTable.vue";
import ATSelect from "../ui/ATSelect.vue";

// Column definition
const outboxColumns = computed(() => [
  {
    key: "recipient",
    type: "compound",
    primaryKey: "recipient",
    secondaryKey: "name",
    badgeKey: "_reference_label",
    badgeSecondaryKey: "reference_name",
    label: t("recipient"),
  },
  { key: "channel", type: "status", domain: "notification_channel", label: t("channel") },
  { key: "status", type: "status-meta", metaKey: "error_message", domain: "notification_status", label: t("status") },
  { key: "attempts", type: "attempts", currentKey: "attempt_count", maxKey: "max_attempts", label: t("attempts") },
  { key: "next_retry_on", type: "date", label: t("nextRetry") },
  { key: "actions", type: "actions-advanced", actionKey: "_actions", label: t("actions") },
]);

// Row data transformation
const outboxRows = computed(() =>
  unref(outboxItems).map((row) => ({
    ...row,
    _reference_label: referenceTypeLabel(row.reference_doctype),
    _actions: buildOutboxActions(row),
  }))
);

function buildOutboxActions(row) {
  const actions = [];
  if (actionsApi.canRetryOutboxRow(row)) {
    actions.push({ label: t("retry"), variant: "secondary", onClick: () => runtime.retryOutbox(row.name) });
  }
  if (actionsApi.canSendDraftFromOutboxRow(row)) {
    actions.push({ label: t("sendNow"), variant: "secondary", onClick: () => runtime.sendDraftNow(row.draft) });
  }
  if (actionsApi.canOpenPanel(row)) {
    actions.push({ label: actionsApi.panelActionLabel(row), variant: "link", onClick: () => actionsApi.openPanel(row) });
  }
  return actions;
}

const actionsApi = props.actions;
const snapshotLoading = computed(() => props.runtime.snapshotResource.loading);
</script>
```

Remove these no-longer-needed imports if they're only used in the outbox table (keep if used in draft section):
- `DataTableCell` (only used in outbox table, not in drafts... wait, let me check: looking at the current QueueSections.vue, drafts don't use DataTableCell or InlineActionRow in the card template. But they do use `StatusBadge`, `ActionButton`, `EmptyState`, `SectionPanel`, `InlineActionRow` in the draft section.)

Actually, let me be more precise. Current imports:
```js
import ActionButton from "../app-shell/ActionButton.vue";
import DataTableCell from "../app-shell/DataTableCell.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import InlineActionRow from "../app-shell/InlineActionRow.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";
```

After migration:
- `DataTableCell` — only used in outbox table → remove import
- `EmptyState` — only used in outbox section → remove import (ListTable's emptyMessage covers it)
- `InlineActionRow` — only used in outbox table actions → remove import
- `ActionButton` — only used in outbox table actions → remove import
- `StatusBadge` — used in draft cards → keep
- `SectionPanel` — used for both sections → keep

- [ ] **Step 2: Update test stubs in CommunicationCenter.test.js**

Need to add `ListTable: true` to stubs, and remove `DataTableCell`, `InlineActionRow` stubs if they were only for outbox.

Check which stubs the test uses. Current stubs from test file:
```js
stubs: {
  ActionButton: ActionButtonStub,
  DataTableCell: genericStub,
  InlineActionRow: genericStub,
  PageToolbar: genericStub,
  QuickCreateLauncher: true,
  QuickCreateManagedDialog: QuickCreateManagedDialogStub,
  Dialog: DialogStub,
  WorkbenchFilterToolbar: genericStub,
  StatusBadge: true,
},
```

Add `ListTable: true` and `ATSelect: true`. Keep `ActionButton` stub (draft cards still need it). Keep `InlineActionRow` stub (draft section still uses it). Remove `DataTableCell` stub (was only used in outbox table).

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/pages/CommunicationCenter.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/communication-center/CommunicationCenterQueueSections.vue frontend/src/pages/CommunicationCenter.test.js
git commit -m "refactor: migrate outbox table to extended ListTable with compound/status-meta/attempts/actions-advanced columns"
```

---

### Task 9: Visual cleanup — remove custom scoped classes

**Files:**
- Modify: `frontend/src/components/communication-center/CommunicationCenterAlerts.vue`
- Modify: `frontend/src/pages/CommunicationCenter.vue`

- [ ] **Step 1: Update CommunicationCenterAlerts.vue**

Replace `qc-error-banner` and `qc-error-banner__text` with AT utility classes.

Change:
```vue
<article v-if="snapshotErrorText" class="qc-error-banner">
  <p class="qc-error-banner__text font-semibold">{{ t('loadErrorTitle') }}</p>
  <p class="qc-error-banner__text mt-1">{{ snapshotErrorText }}</p>
</article>
```
To:
```vue
<article v-if="snapshotErrorText" class="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 mb-6">
  <p class="text-sm font-semibold text-rose-800">{{ t('loadErrorTitle') }}</p>
  <p class="mt-1 text-sm text-rose-700">{{ snapshotErrorText }}</p>
</article>
```

Same for the operation error:

```vue
<article v-if="operationErrorText" class="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 mb-6">
  <p class="text-sm font-semibold text-rose-800">{{ t('actions') }}</p>
  <p class="mt-1 text-sm text-rose-700">{{ operationErrorText }}</p>
</article>
```

- [ ] **Step 2: Clean up CommunicationCenter.vue scoped styles**

Remove the entire `<style scoped>` block since `.input` class is no longer used (ATSelect handles it now):

```vue
<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
```
→ (remove entirely)

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/pages/CommunicationCenter.test.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/communication-center/CommunicationCenterAlerts.vue frontend/src/pages/CommunicationCenter.vue
git commit -m "style: replace custom qc-error classes with AT tokens, remove unused .input scoped style"
```

---

### Task 10: Run full validation

**Files:** None

- [ ] **Step 1: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Run all unit tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Run production build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit if any fixes were needed**

(Only if previous steps required changes)
