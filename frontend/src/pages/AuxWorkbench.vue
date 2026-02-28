<template>
  <div class="space-y-6">
    <PageToolbar :title="label('list')" :subtitle="subtitleLabel" :show-refresh="true" :refresh-label="t('refresh')" :busy="isLoading" @refresh="refreshList">
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <QuickCreateLauncher
            v-if="auxQuickCreate && canLaunchAuxQuickCreate"
            variant="primary"
            size="sm"
            :label="localize(auxQuickCreate.label) || t('newRecord')"
            @launch="showAuxQuickCreateDialog = true"
          />
          <ActionButton
            v-for="action in visibleToolbarActions"
            :key="action.key || action.routeName || localize(action.label)"
            :variant="action.variant || 'secondary'"
            :size="action.size || 'sm'"
            @click="runToolbarAction(action)"
          >
            {{ localize(action.label) || t("panel") }}
          </ActionButton>
        </div>
      </template>
      <template #filters>
        <WorkbenchFilterToolbar
          :model-value="presetKey"
          :show-preset="true"
          :advanced-label="t('advanced')"
          :collapse-label="t('hideAdvanced')"
          :active-count="activeFilterCount"
          :active-count-label="t('activeFilters')"
          :preset-label="t('preset')"
          :preset-options="presetOptions"
          :can-delete-preset="canDeletePreset"
          :save-label="t('savePreset')"
          :delete-label="t('deletePreset')"
          :apply-label="t('apply')"
          :reset-label="t('reset')"
          :disabled="isLoading"
          @update:modelValue="onPresetModelValue"
          @presetChange="onPresetChange"
          @presetSave="savePreset"
          @presetDelete="deletePreset"
          @apply="applyFilters"
          @reset="resetFilters"
        >
          <input v-model.trim="draft.query" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" :placeholder="t('searchPlaceholder')" />

          <template v-for="fd in quickFilterDefs" :key="'q-'+fd.key">
            <component
              :is="fd.type === 'select' ? 'select' : 'input'"
              v-model="draft[fd.key]"
              :type="fd.type === 'number' ? 'number' : 'text'"
              class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option v-if="fd.type === 'select'" v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
                {{ optionLabel(fd, opt) }}
              </option>
            </component>
          </template>

          <select v-model="draft.sort" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model.number="draft.pageLength" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option v-for="n in [10,20,50]" :key="n" :value="n">{{ n }}</option>
          </select>

          <template #advanced>
            <template v-for="fd in advancedFilterDefs" :key="'a-'+fd.key">
              <component
                :is="fd.type === 'select' ? 'select' : 'input'"
                v-model="draft[fd.key]"
                :type="fd.type === 'number' ? 'number' : 'text'"
                class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                :placeholder="fieldLabel(fd.field)"
              >
                <option v-if="fd.type === 'select'" v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
                  {{ optionLabel(fd, opt) }}
                </option>
              </component>
            </template>
          </template>
        </WorkbenchFilterToolbar>
      </template>
    </PageToolbar>

    <DataTableShell
      :loading="isLoading && rows.length === 0"
      :error="loadError.text"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty="!isLoading && !loadError.text && rows.length === 0"
      :empty-title="t('emptyTitle')"
      :empty-description="t('emptyDescription')"
    >
      <template #header>
        <p class="text-xs text-slate-500">{{ t("showing") }} {{ startRow }}-{{ endRow }} / {{ pagination.total }}</p>
      </template>

      <div class="at-table-wrap">
        <table class="at-table w-full min-w-[980px]">
          <thead>
            <tr class="at-table-head-row">
              <th class="at-table-head-cell">{{ t("record") }}</th>
              <th class="at-table-head-cell">{{ t("details") }}</th>
              <th class="at-table-head-cell">{{ t("status") }}</th>
              <th class="at-table-head-cell">{{ t("info") }}</th>
              <th class="at-table-head-cell">{{ t("actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.name"
              class="at-table-row cursor-pointer"
              @click="openDetail(row)"
            >
              <DataTableCell>
                <TableEntityCell :title="rowTitle(row)" :facts="factItems(row, config.primaryFields)">
                  <p class="text-xs text-slate-500">{{ fieldLabel('modified') }}: {{ formatField(row.modified, 'modified') }}</p>
                </TableEntityCell>
              </DataTableCell>

              <TableFactsCell :items="factItems(row, config.detailFields)" />

              <DataTableCell>
                <div class="flex flex-wrap items-center gap-2">
                  <StatusBadge v-if="config.statusField && row[config.statusField] !== undefined && row[config.statusField] !== null && row[config.statusField] !== ''" :type="config.statusType || 'policy'" :status="statusValue(row, config.statusField, config.statusType)" />
                  <StatusBadge v-if="config.secondaryStatusField && row[config.secondaryStatusField]" :type="config.secondaryStatusType || 'policy'" :status="statusValue(row, config.secondaryStatusField, config.secondaryStatusType)" />
                  <span v-if="!config.statusField && !config.secondaryStatusField" class="text-xs text-slate-400">-</span>
                </div>
              </DataTableCell>

              <TableFactsCell :items="factItems(row, config.metricFields)" />

              <DataTableCell>
                <InlineActionRow>
                  <ActionButton
                    v-if="canSendDraftNowRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="sendDraftNowRow(row)"
                  >
                    {{ rowActionBusyName === row.name ? t("running") : t("sendNow") }}
                  </ActionButton>
                  <ActionButton
                    v-if="canRetryOutboxRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="retryOutboxRow(row)"
                  >
                    {{ rowActionBusyName === row.name ? t("running") : t("retry") }}
                  </ActionButton>
                  <ActionButton
                    v-if="canRequeueOutboxRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="requeueOutboxRow(row)"
                  >
                    {{ rowActionBusyName === row.name ? t("running") : t("requeue") }}
                  </ActionButton>
                  <ActionButton variant="secondary" size="xs" @click.stop="openDetail(row)">{{ t("openDetail") }}</ActionButton>
                  <ActionButton v-if="panelCfg(row)" variant="link" size="xs" trailing-icon=">" @click.stop="openPanel(row)">{{ t("panel") }}</ActionButton>
                </InlineActionRow>
              </DataTableCell>
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <TablePagerFooter
          :page="pagination.page"
          :total-pages="totalPages"
          :page-label="t('page')"
          :previous-label="t('prev')"
          :next-label="t('next')"
          :prev-disabled="pagination.page <= 1 || isLoading"
          :next-disabled="!hasNextPage || isLoading"
          @previous="previousPage"
          @next="nextPage"
        />
      </template>
    </DataTableShell>

    <QuickCreateManagedDialog
      v-if="auxQuickCreate && canLaunchAuxQuickCreate"
      v-model="showAuxQuickCreateDialog"
      :config-key="auxQuickCreate.registryKey"
      :locale="sessionState.locale"
      :options-map="auxQuickOptionsMap"
      :show-save-and-open="auxQuickCreate.showSaveAndOpen !== false"
      :before-open="prepareAuxQuickCreateDialog"
      :after-submit="handleAuxQuickCreateAfterSubmit"
      :success-handlers="auxQuickCreateSuccessHandlers"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { hasSessionCapability, sessionState } from "../state/session";
import { getAuxWorkbenchConfig } from "../config/auxWorkbenchConfigs";
import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import {
  extractCustomFilterPresetId,
  isCustomFilterPresetValue,
  makeCustomFilterPresetValue,
  readFilterPresetKey,
  readFilterPresetList,
  writeFilterPresetKey,
  writeFilterPresetList,
} from "../utils/filterPresetState";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import TablePagerFooter from "../components/app-shell/TablePagerFooter.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import StatusBadge from "../components/StatusBadge.vue";

const props = defineProps({
  screenKey: { type: String, required: true },
});

const router = useRouter();
const config = getAuxWorkbenchConfig(props.screenKey);

if (!config) {
  throw new Error(`Unknown aux workbench screen: ${props.screenKey}`);
}

const copy = {
  tr: {
    refresh: "Yenile",
    advanced: "Gelismis Filtreler",
    hideAdvanced: "Gelismis Filtreleri Gizle",
    activeFilters: "aktif filtre",
    preset: "Filtre Sablonu",
    presetDefault: "Standart",
    apply: "Uygula",
    reset: "Temizle",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre sabloni adi",
    deletePresetConfirm: "Bu ozel sablon silinsin mi?",
    searchPlaceholder: "Kayit ara...",
    loading: "Liste yukleniyor...",
    loadErrorTitle: "Liste Yuklenemedi",
    emptyTitle: "Kayit bulunamadi",
    emptyDescription: "Filtreleri degistirip tekrar deneyin.",
    showing: "Gosterilen",
    record: "Kayit",
    details: "Detaylar",
    status: "Durum",
    info: "Bilgiler",
    actions: "Aksiyon",
    newRecord: "Yeni Kayit",
    openDetail: "Detay",
    openDesk: "Yonetim",
    panel: "Panel",
    sendNow: "Hemen Gonder",
    retry: "Tekrar Dene",
    requeue: "Kuyruga Al",
    running: "Calisiyor...",
    page: "Sayfa",
    prev: "Onceki",
    next: "Sonraki",
  },
  en: {
    refresh: "Refresh",
    advanced: "Advanced Filters",
    hideAdvanced: "Hide Advanced",
    activeFilters: "active filters",
    preset: "Filter Preset",
    presetDefault: "Standard",
    apply: "Apply",
    reset: "Reset",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Preset name",
    deletePresetConfirm: "Delete this custom preset?",
    searchPlaceholder: "Search records...",
    loading: "Loading records...",
    loadErrorTitle: "Failed to Load",
    emptyTitle: "No records found",
    emptyDescription: "Adjust filters and try again.",
    showing: "Showing",
    record: "Record",
    details: "Details",
    status: "Status",
    info: "Info",
    actions: "Actions",
    newRecord: "New Record",
    openDetail: "Detail",
    openDesk: "Desk",
    panel: "Panel",
    sendNow: "Send Now",
    retry: "Retry",
    requeue: "Requeue",
    running: "Running...",
    page: "Page",
    prev: "Previous",
    next: "Next",
  },
};

function t(key) {
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

function localize(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v[sessionState.locale] || v.en || v.tr || "";
}

const draft = reactive({ query: "", sort: config.defaultSort || "modified desc", pageLength: 20 });
const filters = reactive({ query: "", sort: config.defaultSort || "modified desc" });
for (const fd of config.filterDefs || []) {
  draft[fd.key] = "";
  filters[fd.key] = "";
}

const pagination = reactive({ page: 1, pageLength: 20, total: 0 });
const loadError = reactive({ text: "" });
const localeCode = computed(() => (sessionState.locale === "tr" ? "tr-TR" : "en-US"));

const PRESET_STORAGE_KEY = `at:aux:${config.key}:preset`;
const PRESET_LIST_STORAGE_KEY = `at:aux:${config.key}:preset-list`;
const presetKey = ref(readFilterPresetKey(PRESET_STORAGE_KEY, "default"));
const customPresets = ref(readFilterPresetList(PRESET_LIST_STORAGE_KEY));
const showAuxQuickCreateDialog = ref(false);
const rowActionBusyName = ref("");

const listResource = createResource({ url: "frappe.client.get_list", auto: false });
const countResource = createResource({ url: "frappe.client.count", auto: false });
const presetServerReadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
  auto: false,
});
const presetServerWriteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
  auto: false,
});
const sendDraftNowRowResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.send_draft_now",
  auto: false,
});
const retryOutboxRowResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.retry_outbox_item",
  auto: false,
});
const requeueOutboxRowResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.requeue_outbox_item",
  auto: false,
});
const auxQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const auxQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Policy",
    fields: ["name", "policy_no", "customer"],
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const auxQuickTemplateResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Notification Template",
    fields: ["name", "template_key", "event_key", "channel", "language", "is_active"],
    filters: { is_active: 1 },
    order_by: "template_key asc",
    limit_page_length: 500,
  },
});
const auxQuickInsuranceCompanyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Insurance Company",
    fields: ["name", "company_name", "company_code"],
    filters: { is_active: 1 },
    order_by: "company_name asc",
    limit_page_length: 500,
  },
});
const auxQuickSalesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Sales Entity",
    fields: ["name", "full_name", "entity_type"],
    order_by: "full_name asc",
    limit_page_length: 500,
  },
});
const auxQuickAccountingEntryResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Accounting Entry",
    fields: ["name", "source_doctype", "source_name", "status"],
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const rows = computed(() => listResource.data || []);
const isLoading = computed(() => Boolean(listResource.loading || countResource.loading));
const auxQuickCreate = computed(() => config.quickCreate || null);
const canLaunchAuxQuickCreate = computed(() => {
  const registryKey = auxQuickCreate.value?.registryKey;
  if (!registryKey) return false;
  return hasSessionCapability(["quickCreate", registryKey]);
});
const toolbarActions = computed(() => (Array.isArray(config.toolbarActions) ? config.toolbarActions : []));
const visibleToolbarActions = computed(() =>
  toolbarActions.value.filter((action) => {
    const capabilityPath = action?.capabilityPath;
    if (!capabilityPath) return true;
    return hasSessionCapability(capabilityPath);
  })
);
const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / (pagination.pageLength || 1))));
const hasNextPage = computed(() => pagination.page < totalPages.value);
const startRow = computed(() => (pagination.total ? (pagination.page - 1) * pagination.pageLength + 1 : 0));
const endRow = computed(() => (pagination.total ? Math.min(pagination.total, pagination.page * pagination.pageLength) : 0));
const activeFilterCount = computed(() => {
  let count = filters.query ? 1 : 0;
  for (const fd of config.filterDefs || []) if (String(filters[fd.key] ?? "").trim() !== "") count += 1;
  return count;
});

const subtitleLabel = computed(() => localize(config.subtitle));
const quickFilterDefs = computed(() => (config.filterDefs || []).slice(0, 2));
const advancedFilterDefs = computed(() => (config.filterDefs || []).slice(2));
const sortOptions = computed(() =>
  (config.sortOptions || ["modified desc"]).map((value) =>
    typeof value === "string" ? { value, label: sortLabel(value) } : { value: value.value, label: localize(value.label) }
  )
);
const presetOptions = computed(() => [
  { value: "default", label: t("presetDefault") },
  ...(config.presetDefs || []).map((preset) => ({
    value: preset.key,
    label: localize(preset.label),
  })),
  ...customPresets.value.map((preset) => ({
    value: makeCustomFilterPresetValue(preset.id),
    label: preset.label,
  })),
]);
const canDeletePreset = computed(() => isCustomFilterPresetValue(presetKey.value));
const auxQuickOptionsMap = computed(() => ({
  customers: (auxQuickCustomerResource.data || []).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  })),
  policies: (auxQuickPolicyResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  notificationTemplates: (auxQuickTemplateResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.template_key || row.name}${row.channel ? ` (${row.channel})` : ""}`,
  })),
  insuranceCompanies: (auxQuickInsuranceCompanyResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.company_name || row.name}${row.company_code ? ` (${row.company_code})` : ""}`,
  })),
  salesEntities: (auxQuickSalesEntityResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.full_name || row.name}${row.entity_type ? ` (${row.entity_type})` : ""}`,
  })),
  accountingEntries: (auxQuickAccountingEntryResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.name}${row.source_doctype ? ` (${row.source_doctype})` : ""}`,
  })),
}));
const auxQuickCreateSuccessHandlers = {
  aux_list: async () => {
    await refreshList();
  },
  notification_draft_list: async () => {
    if (config.key === "notification-drafts") await refreshList();
  },
  renewal_list: async () => {
    if (config.key === "tasks") await refreshList();
  },
};

function label(kind) {
  return localize(config.labels?.[kind]);
}

function sortLabel(orderBy) {
  const [field, dir] = String(orderBy || "").split(/\s+/);
  const base = fieldLabel(field);
  const suffix = String(dir || "").toLowerCase() === "asc" ? (sessionState.locale === "tr" ? "artan" : "asc") : (sessionState.locale === "tr" ? "azalan" : "desc");
  return `${base} (${suffix})`;
}

function humanizeField(field) {
  return String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function fieldLabel(field) {
  return humanizeField(field);
}

function optionLabel(fd, opt) {
  if (opt === "") return sessionState.locale === "tr" ? "Tum" : "All";
  if (fd.field === "is_active") {
    if (String(opt) === "1") return sessionState.locale === "tr" ? "Aktif" : "Active";
    if (String(opt) === "0") return sessionState.locale === "tr" ? "Pasif" : "Inactive";
  }
  return String(opt);
}

function normalizeBoolStatus(v) {
  if (v === true || String(v) === "1") return "1";
  if (v === false || String(v) === "0") return "0";
  return String(v ?? "");
}

function statusValue(row, field, type) {
  const raw = row?.[field];
  if (type === "boolean_active") return normalizeBoolStatus(raw);
  return String(raw ?? "");
}

function isFieldType(field, typeName) {
  const list = config[`${typeName}Fields`] || [];
  return list.includes(field);
}

function formatField(value, field) {
  if (value == null || value === "") return "-";
  if (isFieldType(field, "bool")) {
    const active = value === true || String(value) === "1";
    return active ? (sessionState.locale === "tr" ? "Evet" : "Yes") : (sessionState.locale === "tr" ? "Hayir" : "No");
  }
  if (isFieldType(field, "currency")) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return new Intl.NumberFormat(sessionState.locale === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
  }
  if (isFieldType(field, "number")) {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat(sessionState.locale === "tr" ? "tr-TR" : "en-US").format(n) : String(value);
  }
  if (isFieldType(field, "date")) {
    try { return new Intl.DateTimeFormat(sessionState.locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "short" }).format(new Date(value)); } catch { return String(value); }
  }
  if (isFieldType(field, "dateTime")) {
    try { return new Intl.DateTimeFormat(sessionState.locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return String(value); }
  }
  if (["modified", "creation", "resolved_on", "sent_at", "next_retry_on", "last_attempt_on"].includes(field)) {
    try { return new Intl.DateTimeFormat(sessionState.locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
  }
  if (["due_date", "renewal_date", "policy_end_date"].includes(field)) {
    try { return new Intl.DateTimeFormat(sessionState.locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
  }
  return String(value);
}

function factItems(row, fields) {
  return (fields || [])
    .filter((field) => row?.[field] !== undefined && row?.[field] !== null && row?.[field] !== "")
    .map((field) => ({ label: fieldLabel(field), value: formatField(row[field], field) }));
}

function rowTitle(row) {
  return String(row?.[config.titleField] || row?.name || "-");
}

function buildOrFilters() {
  const q = String(filters.query || "").trim();
  if (!q || !Array.isArray(config.searchFields) || !config.searchFields.length) return null;
  const like = `%${q}%`;
  return config.searchFields.map((f) => [config.doctype, f, "like", like]);
}

function buildFilters() {
  const out = {};
  for (const fd of config.filterDefs || []) {
    const raw = draftToAppliedValue(filters[fd.key]);
    if (raw === "") continue;
    if (fd.mode === "like") out[fd.field] = ["like", `%${raw}%`];
    else if (fd.type === "number") out[fd.field] = Number(raw);
    else if (fd.type === "select" && fd.field === "is_active") out[fd.field] = Number(raw);
    else out[fd.field] = raw;
  }
  return out;
}

function draftToAppliedValue(v) {
  return v == null ? "" : String(v).trim();
}

function buildListParams() {
  return {
    doctype: config.doctype,
    fields: config.listFields,
    filters: buildFilters(),
    or_filters: buildOrFilters() || undefined,
    order_by: filters.sort || config.defaultSort || "modified desc",
    limit_start: (pagination.page - 1) * pagination.pageLength,
    limit_page_length: pagination.pageLength,
  };
}

function buildCountParams() {
  return {
    doctype: config.doctype,
    filters: buildFilters(),
    or_filters: buildOrFilters() || undefined,
  };
}

function setFilterStateFromPayload(payload = {}) {
  filters.query = String(payload.query || "");
  draft.query = filters.query;

  const sortValue = String(payload.sort || config.defaultSort || "modified desc");
  filters.sort = sortValue;
  draft.sort = sortValue;

  const pageLength = Number(payload.pageLength || 20) || 20;
  pagination.pageLength = pageLength;
  draft.pageLength = pageLength;

  for (const fd of config.filterDefs || []) {
    const nextValue = payload[fd.key];
    const normalized =
      fd.type === "number" && nextValue !== "" && nextValue != null
        ? String(nextValue)
        : nextValue == null
          ? ""
          : String(nextValue);
    filters[fd.key] = normalized;
    draft[fd.key] = normalized;
  }
}

async function refreshList() {
  loadError.text = "";
  const listParams = buildListParams();
  const countParams = buildCountParams();
  const [rowsResult, countResult] = await Promise.allSettled([
    listResource.reload(listParams),
    countResource.reload(countParams),
  ]);
  if (rowsResult.status === "fulfilled") {
    const payload = rowsResult.value?.message ?? rowsResult.value;
    listResource.setData(Array.isArray(payload) ? payload : []);
  } else {
    listResource.setData([]);
    loadError.text = rowsResult.reason?.messages?.[0] || rowsResult.reason?.message || String(rowsResult.reason || "");
  }
  if (countResult.status === "fulfilled") {
    const c = Number(countResult.value?.message ?? countResult.value ?? 0);
    pagination.total = Number.isFinite(c) ? c : rows.value.length;
  } else {
    pagination.total = rows.value.length;
  }
}

function applyFilters() {
  filters.query = draft.query || "";
  filters.sort = draft.sort || config.defaultSort || "modified desc";
  pagination.pageLength = Number(draft.pageLength || 20);
  for (const fd of config.filterDefs || []) filters[fd.key] = draft[fd.key] || "";
  pagination.page = 1;
  refreshList();
}

function resetFilters() {
  presetKey.value = "default";
  writeFilterPresetKey(PRESET_STORAGE_KEY, "default");
  setFilterStateFromPayload({});
  pagination.page = 1;
  void persistPresetStateToServer();
  refreshList();
}

function previousPage() {
  if (pagination.page <= 1) return;
  pagination.page -= 1;
  refreshList();
}
function nextPage() {
  if (!hasNextPage.value) return;
  pagination.page += 1;
  refreshList();
}

async function ensureAuxQuickOptionSources() {
  const registryKey = auxQuickCreate.value?.registryKey;
  if (!registryKey) return;
  if (["renewal_task", "notification_draft", "communication_message", "accounting_entry"].includes(registryKey)) {
    await Promise.allSettled([auxQuickCustomerResource.reload(), auxQuickPolicyResource.reload()]);
  }
  if (["notification_draft", "communication_message"].includes(registryKey)) {
    await auxQuickTemplateResource.reload().catch(() => {});
  }
  if (["branch_master", "accounting_entry"].includes(registryKey)) {
    await auxQuickInsuranceCompanyResource.reload().catch(() => {});
  }
  if (["sales_entity_master", "accounting_entry"].includes(registryKey)) {
    await auxQuickSalesEntityResource.reload().catch(() => {});
  }
  if (["reconciliation_item"].includes(registryKey)) {
    await auxQuickAccountingEntryResource.reload().catch(() => {});
  }
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

async function prepareAuxQuickCreateDialog({ form }) {
  await ensureAuxQuickOptionSources();
  if (auxQuickCreate.value?.registryKey === "renewal_task") {
    if (!form.renewal_date) form.renewal_date = addDaysIso(30);
    if (!form.due_date) form.due_date = addDaysIso(15);
  }
  if (auxQuickCreate.value?.registryKey === "notification_draft") {
    if (!form.language) form.language = "tr";
    if (!form.status) form.status = "Draft";
  }
}

async function handleAuxQuickCreateAfterSubmit({ recordName, openAfter }) {
  if (!openAfter || !recordName) return;
  const registryCfg = getQuickCreateConfig(auxQuickCreate.value?.registryKey || "");
  if (registryCfg?.openRouteName) return;
  await router.push({ name: `${config.key}-detail`, params: { name: recordName } }).catch(() => {});
}

async function runRowQuickAction(rowName, resource, payloadBuilder) {
  if (!rowName || !resource || typeof payloadBuilder !== "function") return;
  if (rowActionBusyName.value) return;
  rowActionBusyName.value = rowName;
  try {
    await resource.submit(payloadBuilder(rowName));
    await refreshList();
  } finally {
    rowActionBusyName.value = "";
  }
}

function canSendDraftNowRow(row) {
  return (
    config.key === "notification-drafts" &&
    hasSessionCapability(["actions", "communication", "sendDraftNow"]) &&
    row?.name &&
    row?.status !== "Sent"
  );
}
function canRetryOutboxRow(row) {
  return (
    config.key === "notification-outbox" &&
    hasSessionCapability(["actions", "communication", "retryOutbox"]) &&
    row?.name &&
    ["Failed", "Dead"].includes(String(row.status || ""))
  );
}
function canRequeueOutboxRow(row) {
  return (
    config.key === "notification-outbox" &&
    hasSessionCapability(["actions", "communication", "requeueOutbox"]) &&
    row?.name &&
    ["Queued", "Processing"].includes(String(row.status || ""))
  );
}
async function sendDraftNowRow(row) {
  if (!hasSessionCapability(["actions", "communication", "sendDraftNow"])) return;
  await runRowQuickAction(row?.name, sendDraftNowRowResource, (name) => ({ draft_name: name }));
}
async function retryOutboxRow(row) {
  if (!hasSessionCapability(["actions", "communication", "retryOutbox"])) return;
  await runRowQuickAction(row?.name, retryOutboxRowResource, (name) => ({ outbox_name: name }));
}
async function requeueOutboxRow(row) {
  if (!hasSessionCapability(["actions", "communication", "requeueOutbox"])) return;
  await runRowQuickAction(row?.name, requeueOutboxRowResource, (name) => ({ outbox_name: name }));
}

function openDetail(row) {
  router.push({ name: `${config.key}-detail`, params: { name: row.name } });
}
function panelCfg(row) {
  if (!config.panelRef) return null;
  return getSourcePanelConfig(row?.[config.panelRef.doctypeField], row?.[config.panelRef.nameField]);
}
function openPanel(row) {
  const cfg = panelCfg(row);
  if (!cfg?.url) return;
  window.location.href = cfg.url;
}

function runToolbarAction(action) {
  if (!action || typeof action !== "object") return;
  if (action.capabilityPath && !hasSessionCapability(action.capabilityPath)) return;

  if (action.type === "route" || action.routeName) {
    router.push({
      name: action.routeName,
      params: action.params || undefined,
      query: action.query || undefined,
    }).catch(() => {});
    return;
  }

  if (typeof action.href === "string" && action.href.trim()) {
    window.location.href = action.href;
  }
}

function currentPresetPayload() {
  const payload = {
    query: filters.query,
    sort: filters.sort,
    pageLength: pagination.pageLength,
  };
  for (const fd of config.filterDefs || []) {
    payload[fd.key] = filters[fd.key] ?? "";
  }
  return payload;
}

function applyPreset(key, { refresh = true } = {}) {
  const requested = String(key || "default");

  if (isCustomFilterPresetValue(requested)) {
    const customId = extractCustomFilterPresetId(requested);
    const presetRow = customPresets.value.find((item) => item.id === customId);
    if (!presetRow) {
      applyPreset("default", { refresh });
      return;
    }
    presetKey.value = requested;
    writeFilterPresetKey(PRESET_STORAGE_KEY, requested);
    setFilterStateFromPayload(presetRow.payload || {});
    pagination.page = 1;
    if (refresh) refreshList();
    return;
  }

  presetKey.value = "default";
  writeFilterPresetKey(PRESET_STORAGE_KEY, requested);
  const builtInPreset = (config.presetDefs || []).find((item) => item.key === requested);
  presetKey.value = requested;
  setFilterStateFromPayload(builtInPreset?.payload || {});
  pagination.page = 1;
  if (refresh) refreshList();
}

function onPresetChange() {
  applyPreset(presetKey.value, { refresh: true });
  void persistPresetStateToServer();
}

function onPresetModelValue(value) {
  presetKey.value = String(value || "default");
}

function savePreset() {
  const currentCustomId = extractCustomFilterPresetId(presetKey.value);
  const currentCustom = currentCustomId ? customPresets.value.find((item) => item.id === currentCustomId) : null;
  const initialName = currentCustom?.label || "";
  const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
  if (!name) return;

  const existing = customPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
  const targetId = currentCustomId || existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const nextList = customPresets.value.filter((item) => item.id !== targetId);
  nextList.push({ id: targetId, label: name, payload: currentPresetPayload() });
  customPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, localeCode.value));
  writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
  presetKey.value = makeCustomFilterPresetValue(targetId);
  writeFilterPresetKey(PRESET_STORAGE_KEY, presetKey.value);
  void persistPresetStateToServer();
}

function deletePreset() {
  if (!canDeletePreset.value) return;
  if (!window.confirm(t("deletePresetConfirm"))) return;
  const customId = extractCustomFilterPresetId(presetKey.value);
  if (!customId) return;
  customPresets.value = customPresets.value.filter((item) => item.id !== customId);
  writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
  applyPreset("default", { refresh: true });
  void persistPresetStateToServer();
}

function hasMeaningfulPresetState(selectedKey, presets) {
  return String(selectedKey || "default") !== "default" || (Array.isArray(presets) && presets.length > 0);
}

async function persistPresetStateToServer() {
  try {
    await presetServerWriteResource.submit({
      screen: config.key,
      selected_key: presetKey.value,
      custom_presets: customPresets.value,
    });
  } catch {
    // local fallback
  }
}

async function hydratePresetStateFromServer() {
  try {
    const remote = await presetServerReadResource.reload({ screen: config.key });
    const remoteSelectedKey = String(remote?.selected_key || "default");
    const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

    const localHasState = hasMeaningfulPresetState(presetKey.value, customPresets.value);
    const remoteHasState = hasMeaningfulPresetState(remoteSelectedKey, remoteCustomPresets);
    if (!remoteHasState) {
      if (localHasState) void persistPresetStateToServer();
      return;
    }

    const localSnapshot = JSON.stringify({ selected_key: presetKey.value, custom_presets: customPresets.value });
    const remoteSnapshot = JSON.stringify({ selected_key: remoteSelectedKey, custom_presets: remoteCustomPresets });
    if (localSnapshot === remoteSnapshot) return;

    customPresets.value = remoteCustomPresets;
    writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
    applyPreset(remoteSelectedKey, { refresh: true });
  } catch {
    // local fallback
  }
}

onMounted(() => {
  applyPreset(presetKey.value, { refresh: false });
  refreshList();
  void hydratePresetStateFromServer();
});
</script>
