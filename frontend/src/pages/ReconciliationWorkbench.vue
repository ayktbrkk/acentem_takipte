<template>
  <section class="space-y-4">
    <article class="surface-card rounded-2xl p-5">
      <PageToolbar
        :title="t('title')"
        :subtitle="t('subtitle')"
        :show-refresh="true"
        :busy="workbenchResource.loading || syncing || reconciling"
        :refresh-label="t('refresh')"
        @refresh="reloadWorkbench"
      >
        <template #actions>
          <ActionButton variant="secondary" size="sm" :disabled="syncing" @click="runSync">
            {{ syncing ? t("syncing") : t("sync") }}
          </ActionButton>
          <ActionButton variant="primary" size="sm" :disabled="reconciling" @click="runReconciliation">
            {{ reconciling ? t("reconciling") : t("reconcile") }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" @click="reloadWorkbench">
            {{ t("refresh") }}
          </ActionButton>
        </template>
        <template #filters>
          <WorkbenchFilterToolbar
            v-model="presetKey"
            :advanced-label="t('advancedFilters')"
            :collapse-label="t('hideAdvancedFilters')"
            :active-count="activeFilterCount"
            :active-count-label="t('activeFilters')"
            :preset-label="t('presetLabel')"
            :preset-options="presetOptions"
            :can-delete-preset="canDeletePreset"
            :save-label="t('savePreset')"
            :delete-label="t('deletePreset')"
            :apply-label="t('applyFilters')"
            :reset-label="t('clearFilters')"
            @preset-change="onPresetChange"
            @preset-save="savePreset"
            @preset-delete="deletePreset"
            @apply="applyWorkbenchFilters"
            @reset="resetWorkbenchFilters"
          >
            <select v-model="filters.status" class="input">
              <option value="Open">{{ t("statusOpen") }}</option>
              <option value="Resolved">{{ t("statusResolved") }}</option>
              <option value="Ignored">{{ t("statusIgnored") }}</option>
              <option value="">{{ t("allStatuses") }}</option>
            </select>
            <select v-model="filters.mismatchType" class="input">
              <option value="">{{ t("allTypes") }}</option>
              <option v-for="option in mismatchOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <template #advanced>
              <input
                v-model.trim="filters.sourceQuery"
                class="input"
                type="search"
                :placeholder="t('sourceSearchPlaceholder')"
                @keyup.enter="applyWorkbenchFilters"
              />
              <select v-model="filters.sourceDoctype" class="input">
                <option value="">{{ t("allSources") }}</option>
                <option v-for="option in sourceDoctypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <select v-model.number="filters.limit" class="input">
                <option :value="20">20</option>
                <option :value="50">50</option>
                <option :value="100">100</option>
              </select>
            </template>
          </WorkbenchFilterToolbar>
        </template>
      </PageToolbar>
    </article>

    <div v-if="operationError" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ operationError }}
    </div>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricOpen") }}</p>
        <p class="at-metric-value !text-amber-700">{{ metrics.open || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricResolved") }}</p>
        <p class="at-metric-value !text-emerald-700">{{ metrics.resolved || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricIgnored") }}</p>
        <p class="at-metric-value">{{ metrics.ignored || 0 }}</p>
      </article>
      <article class="at-metric-card">
        <p class="at-metric-label">{{ t("metricFailed") }}</p>
        <p class="at-metric-value !text-rose-700">{{ metrics.failed_entries || 0 }}</p>
      </article>
    </div>

    <DataTableShell
      :loading="workbenchResource.loading"
      :error="workbenchErrorText"
      :empty="rows.length === 0"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('empty')"
    >
      <template #default>
        <div class="overflow-auto">
        <table class="at-table">
          <thead>
            <tr class="at-table-head-row">
              <th class="at-table-head-cell">{{ t("source") }}</th>
              <th class="at-table-head-cell">{{ t("type") }}</th>
              <th class="at-table-head-cell">{{ t("status") }}</th>
              <th class="at-table-head-cell">{{ t("localTry") }}</th>
              <th class="at-table-head-cell">{{ t("externalTry") }}</th>
              <th class="at-table-head-cell">{{ t("difference") }}</th>
              <th class="at-table-head-cell">{{ t("actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.name" class="at-table-row">
              <td class="at-table-cell">
                <TableEntityCell
                  :title="`${row.source_doctype} / ${row.source_name}`"
                  :facts="sourceRowFacts(row)"
                >
                  <InlineActionRow v-if="canOpenSourcePanel(row)">
                    <ActionButton variant="link" size="xs" trailing-icon=">" @click="openSourcePanel(row)">
                      {{ sourcePanelLabel(row) }}
                    </ActionButton>
                  </InlineActionRow>
                </TableEntityCell>
              </td>
              <TableFactsCell :items="mismatchTypeFacts(row)" />
              <td class="at-table-cell">
                <StatusBadge type="reconciliation" :status="row.status" />
              </td>
              <td class="at-table-cell">
                <FormattedCurrencyValue :value="row.local_amount_try" :locale="localeCode" :maximum-fraction-digits="2" />
              </td>
              <td class="at-table-cell">
                <FormattedCurrencyValue :value="row.external_amount_try" :locale="localeCode" :maximum-fraction-digits="2" />
              </td>
              <td class="at-table-cell">
                <FormattedCurrencyValue :value="row.difference_try" :locale="localeCode" :maximum-fraction-digits="2" />
              </td>
              <td class="at-table-cell">
                <InlineActionRow>
                  <ActionButton v-if="row.status === 'Open'" variant="secondary" size="xs" @click="openReconciliationActionDialog(row, 'Matched')">
                    {{ t("resolve") }}
                  </ActionButton>
                  <ActionButton v-if="row.status === 'Open'" variant="secondary" size="xs" @click="openReconciliationActionDialog(row, 'Ignored')">
                    {{ t("ignore") }}
                  </ActionButton>
                  <ActionButton variant="secondary" size="xs" @click="openReconciliationActionDialog(row, 'Note')">
                    {{ t("addNote") }}
                  </ActionButton>
                </InlineActionRow>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      </template>
    </DataTableShell>

    <Dialog v-model="showActionDialog" :options="{ title: reconciliationActionDialogTitle, size: 'lg' }">
      <template #body-content>
        <QuickCreateDialogShell
          :error="actionDialogError"
          :subtitle="reconciliationActionDialogSubtitle"
          :loading="actionDialogLoading"
          :show-save-and-open="false"
          :labels="actionDialogLabels"
          @cancel="closeReconciliationActionDialog"
          @save="submitReconciliationActionDialog"
        >
          <div class="space-y-3">
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p class="font-medium text-slate-700">
                {{ actionDialogRow?.source_doctype || "-" }} / {{ actionDialogRow?.source_name || "-" }}
              </p>
              <p class="mt-1">
                {{ t("difference") }}:
                {{ formatMoney(actionDialogRow?.difference_try) }}
              </p>
              <p v-if="actionDialogRow?.notes" class="mt-1">
                {{ t("currentNote") }}: {{ actionDialogRow.notes }}
              </p>
            </div>
            <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">
              {{ t("noteLabel") }}
            </label>
            <textarea
              v-model="actionDialogNotes"
              class="input min-h-[120px]"
              :placeholder="t('notePlaceholder')"
              :disabled="actionDialogLoading"
            />
          </div>
        </QuickCreateDialogShell>
      </template>
    </Dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { Dialog, createResource } from "frappe-ui";

import { sessionState } from "../state/session";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import FormattedCurrencyValue from "../components/app-shell/FormattedCurrencyValue.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateDialogShell from "../components/app-shell/QuickCreateDialogShell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import StatusBadge from "../components/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { mutedFact, subtleFact } from "../utils/factItems";
import { getSourcePanelConfig } from "../utils/sourcePanel";

const copy = {
  tr: {
    title: "Mutabakat Masasi",
    subtitle: "Muhasebe uyumsuzluklarini izle, eslestir ve kapat",
    sync: "Sync Calistir",
    syncing: "Sync...",
    reconcile: "Mutabakat Calistir",
    reconciling: "Calisiyor...",
    refresh: "Yenile",
    statusOpen: "Acik",
    statusResolved: "Cozuldu",
    statusIgnored: "Yoksayildi",
    allStatuses: "Tum durumlar",
    allTypes: "Tum uyumsuzluk tipleri",
    advancedFilters: "Gelismis Filtreler",
    hideAdvancedFilters: "Gelismis Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Sablonu",
    presetDefault: "Standart",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre sablonu adi",
    deletePresetConfirm: "Secili ozel filtre sablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    sourceSearchPlaceholder: "Kaynak kayit / ref ara",
    allSources: "Tum kaynak tipleri",
    metricOpen: "Acik Fark",
    metricResolved: "Cozulen",
    metricIgnored: "Yoksayilan",
    metricFailed: "Basarisiz Entry",
    loading: "Yukleniyor...",
    loadErrorTitle: "Mutabakat Verileri Yuklenemedi",
    loadError: "Mutabakat masasi verileri yuklenirken bir hata olustu.",
    permissionDeniedRead: "Mutabakat verilerini gormek icin yetkiniz yok.",
    permissionDeniedAction: "Bu mutabakat islemini yapmaya yetkiniz yok.",
    emptyTitle: "Mutabakat Kaydi Yok",
    empty: "Gosterilecek mutabakat kaydi bulunamadi.",
    source: "Kaynak",
    type: "Uyumsuzluk",
    status: "Durum",
    localTry: "Yerel TRY",
    externalTry: "Harici TRY",
    difference: "Fark",
    actions: "Aksiyon",
    resolve: "Coz",
    ignore: "Yoksay",
    addNote: "Aciklama",
    open: "Ac",
    noteLabel: "Aciklama",
    notePlaceholder: "Mutabakat notu / aciklama girin",
    currentNote: "Mevcut Not",
    actionNoteTitle: "Mutabakat Aciklamasi",
    actionResolveTitle: "Mutabakat Coz",
    actionIgnoreTitle: "Mutabakat Yoksay",
    actionNoteSubtitle: "Kayit icin aciklama notu guncelle",
    actionResolveSubtitle: "Kaydi not ile birlikte cozulmus olarak isaretle",
    actionIgnoreSubtitle: "Kaydi not ile birlikte yoksayilmis olarak isaretle",
    actionSaveNote: "Aciklamayi Kaydet",
    actionSaveResolve: "Coz ve Kaydet",
    actionSaveIgnore: "Yoksay ve Kaydet",
    actionFailed: "Mutabakat aksiyonu tamamlanamadi.",
    openPanel: "Panel",
    openPolicyPanel: "Policeyi Ac",
    openCustomerPanel: "Musteriyi Ac",
    openOffersPanel: "Teklif Panosu",
    openClaimsPanel: "Hasar Panosu",
    openPaymentsPanel: "Odeme Panosu",
    openRenewalsPanel: "Yenileme Panosu",
    openReconciliationPanel: "Mutabakat Panosu",
    openCommunicationPanel: "Iletisim Kaydi",
    openMasterDataPanel: "Ana Veri Kaydi",
    externalRef: "Harici Ref",
    mismatchAmount: "Tutar",
    mismatchCurrency: "Para Birimi",
    mismatchMissingExternal: "Harici Kayit Eksik",
    mismatchMissingLocal: "Yerel Kayit Eksik",
    mismatchStatus: "Durum Uyumsuzlugu",
    mismatchOther: "Diger",
  },
  en: {
    title: "Reconciliation Workbench",
    subtitle: "Track, match and close accounting mismatches",
    sync: "Run Sync",
    syncing: "Syncing...",
    reconcile: "Run Reconciliation",
    reconciling: "Running...",
    refresh: "Refresh",
    statusOpen: "Open",
    statusResolved: "Resolved",
    statusIgnored: "Ignored",
    allStatuses: "All statuses",
    allTypes: "All mismatch types",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    sourceSearchPlaceholder: "Search source record / external ref",
    allSources: "All source types",
    metricOpen: "Open Items",
    metricResolved: "Resolved",
    metricIgnored: "Ignored",
    metricFailed: "Failed Entries",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Reconciliation Data",
    loadError: "An error occurred while loading reconciliation workbench data.",
    permissionDeniedRead: "You do not have permission to view reconciliation data.",
    permissionDeniedAction: "You do not have permission to perform this reconciliation action.",
    emptyTitle: "No Reconciliation Rows",
    empty: "No reconciliation rows found.",
    source: "Source",
    type: "Mismatch",
    status: "Status",
    localTry: "Local TRY",
    externalTry: "External TRY",
    difference: "Difference",
    actions: "Actions",
    resolve: "Resolve",
    ignore: "Ignore",
    addNote: "Note",
    open: "Open",
    noteLabel: "Note",
    notePlaceholder: "Enter reconciliation note / comment",
    currentNote: "Current Note",
    actionNoteTitle: "Reconciliation Note",
    actionResolveTitle: "Resolve Reconciliation Item",
    actionIgnoreTitle: "Ignore Reconciliation Item",
    actionNoteSubtitle: "Update a note for this reconciliation row",
    actionResolveSubtitle: "Resolve this row and save an optional note",
    actionIgnoreSubtitle: "Ignore this row and save an optional note",
    actionSaveNote: "Save Note",
    actionSaveResolve: "Resolve & Save",
    actionSaveIgnore: "Ignore & Save",
    actionFailed: "Reconciliation action could not be completed.",
    openPanel: "Open Panel",
    openPolicyPanel: "Open Policy",
    openCustomerPanel: "Open Customer",
    openOffersPanel: "Open Offers Board",
    openClaimsPanel: "Open Claims Board",
    openPaymentsPanel: "Open Payments Board",
    openRenewalsPanel: "Open Renewals Board",
    openReconciliationPanel: "Open Reconciliation",
    openCommunicationPanel: "Communication Record",
    openMasterDataPanel: "Master Data Record",
    externalRef: "External Ref",
    mismatchAmount: "Amount",
    mismatchCurrency: "Currency",
    mismatchMissingExternal: "Missing External",
    mismatchMissingLocal: "Missing Local",
    mismatchStatus: "Status",
    mismatchOther: "Other",
  },
};

function t(key) {
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const filters = reactive({
  status: "Open",
  mismatchType: "",
  sourceQuery: "",
  sourceDoctype: "",
  limit: 50,
});

const syncing = ref(false);
const reconciling = ref(false);
const operationError = ref("");

const workbenchResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.get_reconciliation_workbench",
  params: buildParams(),
  auto: true,
});

const syncResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.run_sync",
});

const runReconciliationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.run_reconciliation_job",
});

const resolveResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.resolve_item",
});
const setValueResource = createResource({
  url: "frappe.client.set_value",
});

const workbenchData = computed(() => workbenchResource.data || {});
const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.status && filters.status !== "Open") count += 1;
  if (filters.mismatchType) count += 1;
  if (filters.sourceQuery) count += 1;
  if (filters.sourceDoctype) count += 1;
  if (Number(filters.limit) !== 50) count += 1;
  return count;
});
const {
  presetKey,
  presetOptions,
  canDeletePreset,
  applyPreset,
  onPresetChange,
  savePreset,
  deletePreset,
  persistPresetStateToServer,
  hydratePresetStateFromServer,
} = useCustomFilterPresets({
  screen: "reconciliation_workbench",
  presetStorageKey: "at:reconciliation-workbench:preset",
  presetListStorageKey: "at:reconciliation-workbench:preset-list",
  t,
  getCurrentPayload: currentWorkbenchPresetPayload,
  setFilterStateFromPayload: setWorkbenchFilterStateFromPayload,
  resetFilterState: resetWorkbenchFilterState,
  refresh: reloadWorkbench,
  getSortLocale: () => (sessionState.locale === "tr" ? "tr-TR" : "en-US"),
});
const sourceDoctypeOptions = computed(() => {
  const seen = new Set();
  const options = [];
  for (const row of workbenchData.value.rows || []) {
    const value = String(row?.source_doctype || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
});
const rows = computed(() => {
  let list = Array.isArray(workbenchData.value.rows) ? workbenchData.value.rows.slice() : [];
  const sourceDoctype = String(filters.sourceDoctype || "").trim();
  if (sourceDoctype) {
    list = list.filter((row) => String(row?.source_doctype || "").trim() === sourceDoctype);
  }
  const sourceQuery = normalizeText(filters.sourceQuery);
  if (sourceQuery) {
    list = list.filter((row) =>
      [
        row?.source_doctype,
        row?.source_name,
        row?.accounting?.external_ref,
        row?.accounting?.entry_no,
      ].some((value) => normalizeText(value).includes(sourceQuery))
    );
  }
  return list;
});
const metrics = computed(() => workbenchData.value.metrics || {});
const localeCode = computed(() => (sessionState.locale === "tr" ? "tr-TR" : "en-US"));
const workbenchErrorText = computed(() => {
  const err = workbenchResource.error;
  if (!err) return "";
  if (isPermissionDeniedError(err)) return t("permissionDeniedRead");
  return err?.messages?.join(" ") || err?.message || t("loadError");
});
const mismatchOptions = computed(() => [
  { value: "Amount", label: t("mismatchAmount") },
  { value: "Currency", label: t("mismatchCurrency") },
  { value: "Missing External", label: t("mismatchMissingExternal") },
  { value: "Missing Local", label: t("mismatchMissingLocal") },
  { value: "Status", label: t("mismatchStatus") },
  { value: "Other", label: t("mismatchOther") },
]);
const showActionDialog = ref(false);
const actionDialogMode = ref("Note");
const actionDialogRow = ref(null);
const actionDialogNotes = ref("");
const actionDialogLoading = ref(false);
const actionDialogError = ref("");
const actionDialogLabels = computed(() => ({
  cancel: sessionState.locale === "tr" ? "Vazgec" : "Cancel",
  save:
    actionDialogMode.value === "Matched"
      ? t("actionSaveResolve")
      : actionDialogMode.value === "Ignored"
        ? t("actionSaveIgnore")
        : t("actionSaveNote"),
}));
const reconciliationActionDialogTitle = computed(() => {
  if (actionDialogMode.value === "Matched") return t("actionResolveTitle");
  if (actionDialogMode.value === "Ignored") return t("actionIgnoreTitle");
  return t("actionNoteTitle");
});
const reconciliationActionDialogSubtitle = computed(() => {
  if (actionDialogMode.value === "Matched") return t("actionResolveSubtitle");
  if (actionDialogMode.value === "Ignored") return t("actionIgnoreSubtitle");
  return t("actionNoteSubtitle");
});

function buildParams() {
  return {
    status: filters.status || null,
    mismatch_type: filters.mismatchType || null,
    limit: filters.limit,
  };
}

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase(sessionState.locale === "tr" ? "tr-TR" : "en-US");
}

function reloadWorkbench() {
  operationError.value = "";
  workbenchResource.params = buildParams();
  workbenchResource.reload();
}

function applyWorkbenchFilters() {
  return reloadWorkbench();
}

function resetWorkbenchFilterState() {
  filters.status = "Open";
  filters.mismatchType = "";
  filters.sourceQuery = "";
  filters.sourceDoctype = "";
  filters.limit = 50;
}

function currentWorkbenchPresetPayload() {
  return {
    status: filters.status,
    mismatchType: filters.mismatchType,
    sourceQuery: filters.sourceQuery,
    sourceDoctype: filters.sourceDoctype,
    limit: Number(filters.limit) || 50,
  };
}

function setWorkbenchFilterStateFromPayload(payload) {
  filters.status = String(payload?.status || "Open");
  filters.mismatchType = String(payload?.mismatchType || "");
  filters.sourceQuery = String(payload?.sourceQuery || "");
  filters.sourceDoctype = String(payload?.sourceDoctype || "");
  filters.limit = Number(payload?.limit || 50) || 50;
}

function resetWorkbenchFilters() {
  applyPreset("default", { refresh: false });
  void persistPresetStateToServer();
  return reloadWorkbench();
}

async function runSync() {
  syncing.value = true;
  operationError.value = "";
  try {
    await syncResource.submit({ limit: 250 });
    await reloadWorkbench();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    syncing.value = false;
  }
}

async function runReconciliation() {
  reconciling.value = true;
  operationError.value = "";
  try {
    await runReconciliationResource.submit({ limit: 400 });
    await reloadWorkbench();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    reconciling.value = false;
  }
}

async function resolveRow(row, action) {
  operationError.value = "";
  await resolveResource.submit({
    item_name: row.name,
    resolution_action: action,
  });
  await reloadWorkbench();
}

function openReconciliationActionDialog(row, mode = "Note") {
  actionDialogRow.value = row || null;
  actionDialogMode.value = mode || "Note";
  actionDialogNotes.value = row?.notes || "";
  actionDialogError.value = "";
  showActionDialog.value = true;
}

function closeReconciliationActionDialog(force = false) {
  if (!force && actionDialogLoading.value) return;
  showActionDialog.value = false;
  actionDialogError.value = "";
  actionDialogRow.value = null;
  actionDialogMode.value = "Note";
  actionDialogNotes.value = "";
}

async function submitReconciliationActionDialog() {
  if (!actionDialogRow.value?.name || actionDialogLoading.value) return;
  actionDialogLoading.value = true;
  actionDialogError.value = "";
  try {
    if (actionDialogMode.value === "Matched" || actionDialogMode.value === "Ignored") {
      await resolveResource.submit({
        item_name: actionDialogRow.value.name,
        resolution_action: actionDialogMode.value,
        notes: String(actionDialogNotes.value || "").trim() || null,
      });
    } else {
      await setValueResource.submit({
        doctype: "AT Reconciliation Item",
        name: actionDialogRow.value.name,
        fieldname: "notes",
        value: String(actionDialogNotes.value || "").trim() || null,
      });
    }
    await reloadWorkbench();
    closeReconciliationActionDialog(true);
  } catch (error) {
    actionDialogError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("actionFailed");
  } finally {
    actionDialogLoading.value = false;
  }
}

function isPermissionDeniedError(error) {
  const status = Number(
    error?.statusCode ??
      error?.status ??
      error?.httpStatus ??
      error?.response?.status ??
      0
  );
  const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    text.includes("permission") ||
    text.includes("not permitted") ||
    text.includes("not authorized")
  );
}

function sourcePanelUrl(row) {
  return getSourcePanelConfig(row?.source_doctype, row?.source_name)?.url || "";
}

function canOpenSourcePanel(row) {
  return Boolean(sourcePanelUrl(row));
}

function openSourcePanel(row) {
  const url = sourcePanelUrl(row);
  if (!url) return;
  window.location.href = url;
}

function sourcePanelLabel(row) {
  const labelKey = getSourcePanelConfig(row?.source_doctype, row?.source_name)?.labelKey;
  return labelKey ? t(labelKey) : t("openPanel");
}

function mismatchTypeLabel(type) {
  if (type === "Amount") return t("mismatchAmount");
  if (type === "Currency") return t("mismatchCurrency");
  if (type === "Missing External") return t("mismatchMissingExternal");
  if (type === "Missing Local") return t("mismatchMissingLocal");
  if (type === "Status") return t("mismatchStatus");
  if (type === "Other") return t("mismatchOther");
  return type || "-";
}

function sourceRowFacts(row) {
  return [
    subtleFact("externalRef", t("externalRef"), row?.accounting?.external_ref || "-"),
  ];
}

function mismatchTypeFacts(row) {
  return [
    mutedFact("mismatchType", t("type"), mismatchTypeLabel(row?.mismatch_type)),
  ];
}

function formatMoney(value) {
  try {
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return String(value ?? 0);
  }
}

onMounted(() => {
  applyPreset(presetKey.value, { refresh: false });
  if (String(presetKey.value || "default") !== "default") void reloadWorkbench();
  void hydratePresetStateFromServer();
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
