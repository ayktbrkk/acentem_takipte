# Policy Pages Audit Fixes Implementation Plan

> **For agentic workers:** Execute tasks sequentially. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 13 issues identified in the /at/policies full-stack audit: 5 critical, 5 medium, 3 low priority.

**Architecture:** Frontend-only fixes in Vue composables, page templates, and translation config. No backend schema or API changes needed for any task in this plan.

**Tech Stack:** Vue 3 (Composition API), Pinia stores, frappe-ui resources, Frappe REST API

---

### Task 1: Fix Activity Timeline - Render Real Data

**Files:**
- Modify: `frontend/src/pages/PolicyDetail.vue:118-128`
- Modify: `frontend/src/composables/usePolicyDetailRuntime.js` (expose timeline data)

**Goal:** Replace the hardcoded EmptyState with a real timeline showing comments, communications, activities, and reminders merged and sorted by date.

- [ ] **Step 1: Expose timeline data from composable**

In `usePolicyDetailRuntime.js`, add a computed that merges and sorts timeline entries from the 360 payload.

Open `frontend/src/composables/usePolicyDetailRuntime.js` and add after the existing `data` computed (around line 78):

```js
const timelineEntries = computed(() => {
  const items = [];
  const addItems = (source, type, dateKey, extra = {}) => {
    (unref(source) || []).forEach((item) => {
      const dateStr = item[dateKey] || item.creation || item.modified;
      if (!dateStr) return;
      items.push({ ...item, _type: type, _date: dateStr, ...extra });
    });
  };
  addItems(data.value.comments || [], "comment", "creation", { _icon: "message-square" });
  addItems(data.value.communications || [], "communication", "communication_date", { _icon: "phone" });
  addItems(data.value.activities || [], "activity", "activity_at", { _icon: "calendar" });
  addItems(data.value.reminders || [], "reminder", "remind_at", { _icon: "bell" });
  addItems(data.value.snapshots || [], "snapshot", "captured_on", { _icon: "camera" });
  items.sort((a, b) => new Date(b._date) - new Date(a._date));
  return items.slice(0, 50);
});
```

Add `timelineEntries` to the return object (around line 369):

```js
return {
  // ... existing returns
  timelineEntries,
  // ...
};
```

- [ ] **Step 2: Replace EmptyState with timeline UI in template**

Open `frontend/src/pages/PolicyDetail.vue` and replace lines 118-128:

```html
        <SectionPanel :title="t('activity_timeline')">
          <EmptyState
            :title="t('emptyActivities')"
            compact
            compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center"
          >
            <template #icon>
              <FeatherIcon name="activity" class="h-6 w-6 text-slate-400" />
            </template>
          </EmptyState>
        </SectionPanel>
```

With:

```html
        <SectionPanel :title="t('activity_timeline')">
          <div v-if="!timelineEntries.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center">
            <FeatherIcon name="activity" class="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p class="text-sm text-slate-500">{{ t('emptyActivities') }}</p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(entry, idx) in timelineEntries"
              :key="`tl-${idx}`"
              class="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3 text-sm"
            >
              <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FeatherIcon :name="entry._icon || 'clock'" class="h-3.5 w-3.5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-slate-800 truncate">
                  {{ entry.subject || entry.activity_title || entry.reminder_title || entry.snapshot_type || entry.communication_type || entry.comment_type || t('unspecified') }}
                </p>
                <p v-if="entry.content || entry.notes" class="mt-0.5 line-clamp-2 text-xs text-slate-500">
                  {{ entry.content || entry.notes }}
                </p>
                <p class="mt-0.5 text-[10px] text-slate-400">{{ formatDate(entry._date) }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>
```

- [ ] **Step 3: Add timelineEntries to PolicyDetail.vue destructuring**

In the `<script setup>` of `PolicyDetail.vue`, add `timelineEntries` to the destructured return from `usePolicyDetailRuntime` (around line 260):

```
  timelineEntries,
```

Add it in the destructuring block alongside the other returned values.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PolicyDetail.vue frontend/src/composables/usePolicyDetailRuntime.js
git commit -m "fix: render real activity timeline data in policy detail page"
```

---

### Task 2: Wire Operations Panel Counters to Real Data

**Files:**
- Modify: `frontend/src/pages/PolicyDetail.vue:143-168`
- Modify: `frontend/src/composables/usePolicyDetailRuntime.js` (expose counts)

**Goal:** Replace hardcoded "0" badges with actual task and reminder counts from the 360 payload.

- [ ] **Step 1: Expose counts from composable**

In `usePolicyDetailRuntime.js`, add two computed properties after the existing `data` computed:

```js
const tasksCount = computed(() => (data.value.assignments || []).length);
const remindersCount = computed(() => (data.value.reminders || []).length);
```

Add `tasksCount` and `remindersCount` to the return object.

- [ ] **Step 2: Replace hardcoded 0 in template**

Open `frontend/src/pages/PolicyDetail.vue` and replace the two badge spans (lines 154 and 167):

Line 154:
```html
                 <span class="inline-flex items-center justify-center min-w-[20px] h-[18px] rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold px-1.5">0</span>
```
Replace 0 with:
```html
                 <span class="inline-flex items-center justify-center min-w-[20px] h-[18px] rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold px-1.5">{{ tasksCount }}</span>
```

Line 167:
```html
                 <span class="inline-flex items-center justify-center min-w-[20px] h-[18px] rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold px-1.5">0</span>
```
Replace 0 with:
```html
                 <span class="inline-flex items-center justify-center min-w-[20px] h-[18px] rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold px-1.5">{{ remindersCount }}</span>
```

- [ ] **Step 3: Add tasksCount/remindersCount to destructuring**

In PolicyDetail.vue's `<script setup>`, add `tasksCount, remindersCount` to the destructured return from `usePolicyDetailRuntime`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PolicyDetail.vue frontend/src/composables/usePolicyDetailRuntime.js
git commit -m "fix: wire operations panel counters to real task/reminder data"
```

---

### Task 3: Add Missing Translation Keys

**Files:**
- Modify: `frontend/src/config/policy_translations.js`

**Goal:** Add `whatsapp_share_message`, `colProduct`, `colVade`, `colPremium` to both TR and EN sections.

- [ ] **Step 1: Add TR translations**

In `policy_translations.js`, add inside the `tr:` block (before the closing `},` of TR):

```js
    whatsapp_share_message: "Poliçe: {policy}\nMüşteri: {customer}\n\nAcentem Takipte üzerinden paylaşıldı.",
    colProduct: "Ürün",
    colVade: "Vade",
    colPremium: "Prim",
```

- [ ] **Step 2: Add EN translations**

In the `en:` block, add:

```js
    whatsapp_share_message: "Policy: {policy}\nCustomer: {customer}\n\nShared via Acentem Takipte.",
    colProduct: "Product",
    colVade: "Term",
    colPremium: "Premium",
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/config/policy_translations.js
git commit -m "fix: add missing translation keys for whatsapp share and table columns"
```

---

### Task 4: Fix Endorsement Creation Flow

**Files:**
- Modify: `frontend/src/pages/PolicyDetail.vue:327-335`

**Goal:** Route "Create Endorsement" to the endorsement creation form, not the offer board.

- [ ] **Step 1: Check if an endorsement creation route exists**

Run:
```bash
rg "endorsement" frontend/src/router/index.js
```

If no direct endorsement-create route exists, route to `policy-detail` with a `createEndorsement` query param that opens the Frappe desk form, or use the desk form URL directly.

- [ ] **Step 2: Update handleCreateEndorsement**

Replace lines 327-335 in `PolicyDetail.vue`:

```js
function handleCreateEndorsement() {
  router.push({
    name: "offer-board",
    query: {
      from_policy: policy.value?.name || props.name,
      intent: "endorsement",
    },
  });
}
```

With:

```js
function handleCreateEndorsement() {
  const policyName = policy.value?.name || props.name;
  window.open(
    `/app/at-policy-endorsement/new?policy=${encodeURIComponent(policyName)}`,
    "_blank",
    "noopener,noreferrer"
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PolicyDetail.vue
git commit -m "fix: route endorsement creation directly to frappe desk form"
```

---

### Task 5: Fix set_value Bypassing Validation

**Files:**
- Modify: `frontend/src/composables/usePolicyDetailRuntime.js:324-361`

**Goal:** Add client-side validation before `frappe.client.set_value` to catch date ordering and required field issues. Also validate financial equation (gross = net + tax + commission).

- [ ] **Step 1: Add client-side validation function**

Add this function before `updatePolicy` in `usePolicyDetailRuntime.js`:

```js
function validatePolicyUpdate(values) {
  const errors = [];
  const p = unref(policy);

  const merged = { ...p, ...values };

  const issue = merged.issue_date ? new Date(merged.issue_date) : null;
  const start = merged.start_date ? new Date(merged.start_date) : null;
  const end = merged.end_date ? new Date(merged.end_date) : null;

  if (issue && start && issue > start) {
    errors.push(t("Issue date cannot be later than start date."));
  }
  if (start && end && start > end) {
    errors.push(t("Start date cannot be later than end date."));
  }

  const net = Number(values.net_premium ?? p.net_premium ?? 0);
  const tax = Number(values.tax_amount ?? p.tax_amount ?? 0);
  const comm = Number(values.commission_amount ?? p.commission_amount ?? 0);
  const gross = Number(values.gross_premium ?? p.gross_premium ?? 0);

  if (gross > 0) {
    const expected = Math.round((net + tax + comm) * 100) / 100;
    const actual = Math.round(gross * 100) / 100;
    if (Math.abs(actual - expected) > 0.01) {
      errors.push(t("Gross Premium must equal Net Premium + Tax + Commission."));
    }
  }

  return errors;
}
```

- [ ] **Step 2: Add validation call to updatePolicy**

Modify the `updatePolicy` function to call validation before submitting:

```js
async function updatePolicy(values, onSuccess) {
  if (!unref(name)) return;

  const validationErrors = validatePolicyUpdate(values);
  if (validationErrors.length) {
    showNotification(validationErrors[0], "error");
    return;
  }

  saving.value = true;
  try {
    await updateResource.submit({
      doctype: "AT Policy",
      name: unref(name),
      fieldname: values,
    });
    showNotification(t("save_success"));
    if (onSuccess) onSuccess();
    await reload();
  } catch (err) {
    console.error(err);
    showNotification(t("save_failed"), "error");
  } finally {
    saving.value = false;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/composables/usePolicyDetailRuntime.js
git commit -m "fix: add client-side validation before policy field updates"
```

---

### Task 6: Add Product Profile Panel to Detail Page

**Files:**
- Modify: `frontend/src/pages/PolicyDetail.vue` (add sidebar section)
- Modify: `frontend/src/composables/usePolicyDetailRuntime.js` (expose productProfile)

**Goal:** Show product family, readiness score, and missing fields in the detail sidebar. `productProfile` is already exposed from the composable at line 85.

- [ ] **Step 1: Add product profile sidebar section**

In `PolicyDetail.vue`, add after the documents `SectionPanel` (around line 199), a new sidebar section:

```html
        <SectionPanel v-if="productProfile.product_family" :title="t('productProfileTitle')">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-500">{{ t('productFamily') }}</span>
              <span class="font-medium text-slate-800">{{ productProfile.product_family }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">{{ t('readinessScore') }}</span>
              <span class="font-bold" :class="productProfile.readiness_score >= 80 ? 'text-at-green' : productProfile.readiness_score >= 50 ? 'text-at-amber' : 'text-at-red'">
                %{{ productProfile.readiness_score }}
              </span>
            </div>
            <div v-if="productProfile.missing_field_count" class="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs">
              <p class="font-medium text-amber-800 mb-1">{{ t('missingProductFields') }} ({{ productProfile.missing_field_count }})</p>
              <ul class="list-disc list-inside text-amber-700 space-y-0.5">
                <li v-for="f in productProfile.missing_fields" :key="f.key">{{ f.label }}</li>
              </ul>
            </div>
            <div v-else class="text-xs text-slate-400">{{ t('noMissingProductField') }}</div>
          </div>
        </SectionPanel>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PolicyDetail.vue
git commit -m "feat: add product profile panel to policy detail sidebar"
```

---

### Task 7: Add Renewal Task Info to Policy 360 Payload and Detail Page

**Files:**
- Modify: `acentem_takipte/acentem_takipte/domains/policies/services/policy_360.py`
- Modify: `frontend/src/composables/usePolicyDetailRuntime.js`
- Modify: `frontend/src/pages/PolicyDetail.vue` (optional sidebar section)

**Goal:** Include renewal tasks in the 360 payload and show them if present.

- [ ] **Step 1: Add renewal tasks to backend payload**

In `policy_360.py`, add after the reminders block (around line 123):

```python
        "renewal_tasks": _get_rows(
            "AT Renewal Task",
            fields=["name", "status", "renewal_date", "reminder_stage", "notes", "owner", "creation"],
            filters={"policy": policy_name},
            order_by="renewal_date desc",
            limit_page_length=20,
        ),
```

- [ ] **Step 2: Expose in composable**

In `usePolicyDetailRuntime.js`, add:

```js
const renewalTasks = computed(() => data.value.renewal_tasks || []);
```

Add `renewalTasks` to return object.

- [ ] **Step 3: Add renewal task section to detail sidebar**

In `PolicyDetail.vue`, add a `SectionPanel` if `renewalTasks.length` is truthy, showing the most recent renewal task:

```html
        <SectionPanel v-if="renewalTasks.length" :title="t('renewal_tasks')">
          <div class="space-y-2">
            <div v-for="rt in renewalTasks.slice(0, 3)" :key="rt.name" class="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2 text-xs">
              <div>
                <p class="font-medium text-slate-800">{{ formatDate(rt.renewal_date) }}</p>
                <p class="text-slate-500">{{ rt.reminder_stage || '-' }}</p>
              </div>
              <StatusBadge domain="renewal" :status="rt.status" />
            </div>
          </div>
        </SectionPanel>
```

- [ ] **Step 4: Add translation key**

In `policy_translations.js`, add to both TR and EN:

TR: `renewal_tasks: "Yenileme Görevleri"`
EN: `renewal_tasks: "Renewal Tasks"`

- [ ] **Step 5: Commit**

```bash
git add acentem_takipte/acentem_takipte/domains/policies/services/policy_360.py frontend/src/composables/usePolicyDetailRuntime.js frontend/src/pages/PolicyDetail.vue frontend/src/config/policy_translations.js
git commit -m "feat: add renewal task info to policy 360 payload and detail page"
```

---

### Task 8: Standardize Status Dropdown Values

**Files:**
- Modify: `frontend/src/pages/PolicyList.vue:38-42`

**Goal:** Align list page filter options with detail page EditableCard options. Use "Active", "Waiting", "Cancelled" consistently.

- [ ] **Step 1: Update list filter options**

In `PolicyList.vue`, replace lines 38-42:

```html
              <option value="">{{ t("allStatuses") }}</option>
              <option value="Active">{{ t("statusActive") }}</option>
              <option value="KYT">{{ t("statusWaiting") }}</option>
              <option value="IPT">{{ t("cancelled") }}</option>
```

With:

```html
              <option value="">{{ t("allStatuses") }}</option>
              <option value="Active">{{ t("statusActive") }}</option>
              <option value="KYT">{{ t("statusWaiting") }}</option>
              <option value="IPT">{{ t("statusCancelled") }}</option>
```

Also replace the translation lookup from `t("cancelled")` to `t("statusCancelled")`.

- [ ] **Step 2: Ensure `statusCancelled` exists in translations**

Check `policy_translations.js` - `statusCancelled` is missing but `status_cancelled` exists. Either add `statusCancelled` or use `status_cancelled`. Since the list filter uses camelCase keys elsewhere (`statusActive`, `statusWaiting`), add:

TR: `statusCancelled: "İptal",`
EN: `statusCancelled: "Cancelled",`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PolicyList.vue frontend/src/config/policy_translations.js
git commit -m "fix: standardize status options between list filter and detail editor"
```

---

### Task 9: Add Sort Dropdown to List Page

**Files:**
- Modify: `frontend/src/pages/PolicyList.vue` (add sort dropdown to filter bar)
- Modify: `frontend/src/composables/usePolicyListRuntime.js` (expose sort change handler)
- Modify: `frontend/src/stores/policy.js` (expose sort property)

**Goal:** Add a sort dropdown next to the status filter so users can sort by modified date, end date, or premium.

- [ ] **Step 1: Add sort dropdown to template**

In `PolicyList.vue`, add a sort dropdown next to the status filter inside the `#primary-filters` slot (around line 37):

```html
            <select v-model="sortValue" class="input h-9 py-1 text-sm" @change="onSortChange">
              <option value="modified desc">{{ t("sortModifiedDesc") }}</option>
              <option value="end_date asc">{{ t("sortEndDateAsc") }}</option>
              <option value="end_date desc">{{ t("sortEndDateDesc") }}</option>
              <option value="gross_premium desc">{{ t("sortGrossDesc") }}</option>
            </select>
```

- [ ] **Step 2: Add sort handling in script setup**

In PolicyList.vue `<script setup>`, add:

```js
const sortValue = computed({
  get: () => filters.sort || "modified desc",
  set: (val) => { filters.sort = val; },
});

function onSortChange() {
  applyFilters();
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PolicyList.vue
git commit -m "feat: add sort dropdown to policy list page"
```

---

### Task 10: Add Page Size Selector to List Page

**Files:**
- Modify: `frontend/src/pages/PolicyList.vue`

**Goal:** Add a page size dropdown (20/50/100) so users can control how many rows are shown.

- [ ] **Step 1: Add page size selector next to ListPager**

In `PolicyList.vue`, add a small select next to or inside the ListPager area (around line 91):

```html
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center gap-2 text-sm text-slate-500">
            <span>{{ t("pageSize") }}</span>
            <select v-model.number="pagination.pageLength" class="input h-8 py-0.5 text-xs w-16" @change="onPageLengthChange">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>
```

Add above or integrate with the existing `ListPager` component area.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PolicyList.vue
git commit -m "feat: add page size selector to policy list page"
```

---

### Task 11: English Branch Icon Matching

**Files:**
- Modify: `frontend/src/pages/PolicyDetail.vue:252-258`

**Goal:** Make branch icon detection case-insensitive and cover English branch names.

- [ ] **Step 1: Update branchIcon computed**

Replace the current `branchIcon` computed in `PolicyDetail.vue`:

```js
const branchIcon = computed(() => {
  const branch = String(policy.value.branch || "").toLowerCase();
  if (branch.includes("kasko") || branch.includes("trafik") || branch.includes("oto") || branch.includes("araç")) return "truck";
  if (branch.includes("konut") || branch.includes("dask") || branch.includes("ev") || branch.includes("işyeri")) return "home";
  if (branch.includes("sağlık") || branch.includes("saglik") || branch.includes("health")) return "heart";
  return "shield";
});
```

With:

```js
const branchIcon = computed(() => {
  const branch = String(policy.value.branch || "").toLowerCase();
  if (branch.includes("kasko") || branch.includes("trafik") || branch.includes("oto") || branch.includes("araç") || branch.includes("motor") || branch.includes("car") || branch.includes("vehicle") || branch.includes("auto")) return "truck";
  if (branch.includes("konut") || branch.includes("dask") || branch.includes("ev") || branch.includes("işyeri") || branch.includes("home") || branch.includes("property") || branch.includes("building")) return "home";
  if (branch.includes("sağlık") || branch.includes("saglik") || branch.includes("health") || branch.includes("medical")) return "heart";
  if (branch.includes("seyahat") || branch.includes("travel")) return "map";
  if (branch.includes("hayat") || branch.includes("life") || branch.includes("bes") || branch.includes("emeklilik")) return "user";
  return "shield";
});
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PolicyDetail.vue
git commit -m "fix: improve branch icon matching for English branch names"
```

---

### Task 12: Clear Notification Timeout on Unmount

**Files:**
- Modify: `frontend/src/composables/usePolicyDetailRuntime.js:96-103`

**Goal:** Clear the `setTimeout` on component unmount to prevent memory leaks and stale notifications on destroyed components.

- [ ] **Step 1: Track and clean up timeout**

In `usePolicyDetailRuntime.js`, modify the notification section. Import `onUnmounted` from vue (already imported at top). Replace the `showNotification` function and add cleanup:

```js
import { computed, reactive, ref, unref, watch, onUnmounted } from "vue";

// After the reactive notification declaration:
let notifyTimer = null;

function showNotification(message, type = "success") {
  notification.message = message;
  notification.type = type;
  notification.show = true;
  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => {
    notification.show = false;
    notifyTimer = null;
  }, 4000);
}

onUnmounted(() => {
  if (notifyTimer) {
    clearTimeout(notifyTimer);
    notifyTimer = null;
  }
});
```

- [ ] **Step 2: Remove the old inline setTimeout from showNotification**

Ensure the old `setTimeout` block inside `showNotification` (lines 100-102) is replaced by the new implementation above.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/composables/usePolicyDetailRuntime.js
git commit -m "fix: clear notification timeout on unmount to prevent memory leak"
```

---

### Task 13: Remove Duplicate Client-Side Search Overlay

**Files:**
- Modify: `frontend/src/composables/usePolicyListTableData.js:53-73`

**Goal:** Remove the client-side `policyListFilteredRows` search since server-side `or_filters` already handles text search. Keep only the status/branch local filters.

- [ ] **Step 1: Remove text search from client-side filter**

In `usePolicyListTableData.js`, modify `policyListFilteredRows` to remove the `matchesQuery` check:

Replace lines 53-73:

```js
  const policyListFilteredRows = computed(() => {
    const q = String(unref(policyListSearchQuery) || "")
      .trim()
      .toLocaleLowerCase(unref(localeCode));
    return policyListMappedRows.value.filter((row) => {
      const matchesQuery =
        !q ||
        [row.name, row.carrier_policy_no, row.customer_label, row.customer, row.branch, row.status]
          .map((value) => String(value || "").toLocaleLowerCase(unref(localeCode)))
          .some((value) => value.includes(q));

      const matchesStatus =
        !unref(policyListLocalFilters).status ||
        normalizePolicyListStatus(row.status) === unref(policyListLocalFilters).status;

      const matchesBranch =
        !unref(policyListLocalFilters).branch || String(row.branch || "") === unref(policyListLocalFilters).branch;

      return matchesQuery && matchesStatus && matchesBranch;
    });
  });
```

With:

```js
  const policyListFilteredRows = computed(() => {
    return policyListMappedRows.value.filter((row) => {
      const matchesStatus =
        !unref(policyListLocalFilters).status ||
        normalizePolicyListStatus(row.status) === unref(policyListLocalFilters).status;

      const matchesBranch =
        !unref(policyListLocalFilters).branch || String(row.branch || "") === unref(policyListLocalFilters).branch;

      return matchesStatus && matchesBranch;
    });
  });
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/composables/usePolicyListTableData.js
git commit -m "refactor: remove duplicate client-side text search, rely on server-side or_filters"
```

---

### Task 14: Run Tests and Build

**Files:** None (validation only)

- [ ] **Step 1: Run frontend unit tests**

```bash
cd frontend && npm run test:unit -- --run
```

Verify all existing tests pass. If test expectations need updating due to our changes, fix the tests.

- [ ] **Step 2: Run lint and typecheck**

```bash
cd frontend && npm run lint && npm run typecheck
```

Fix any lint or type errors introduced by our changes.

- [ ] **Step 3: Build frontend assets**

```bash
cd frontend && npm run build
```

Verify the build completes without errors.

- [ ] **Step 4: Commit if any test/build fixes were needed**

```bash
git add -A
git commit -m "chore: update tests and fix lint/type errors after policy audit fixes"
```

- [ ] **Step 5: Final status check**

```bash
git status && git log --oneline -5
```
