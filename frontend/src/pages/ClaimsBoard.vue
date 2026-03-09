<template>
  <section class="space-y-4">
    <article class="surface-card rounded-2xl p-5">
      <PageToolbar
      :title="t('title')"
      :subtitle="t('subtitle')"
      :show-refresh="true"
      :busy="claimsResource.loading"
      :refresh-label="t('refresh')"
      @refresh="reloadClaims"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <QuickCreateLauncher
            variant="primary"
            size="sm"
            :label="t('newClaim')"
            @launch="showQuickClaimDialog = true"
          />
          <ActionButton variant="secondary" size="sm" :disabled="claimsResource.loading" @click="reloadClaims">
            {{ t("refresh") }}
          </ActionButton>
        </div>
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
          @apply="applyClaimFilters"
          @reset="resetClaimFilters"
        >
          <input
            v-model.trim="filters.query"
            class="input"
            type="search"
            :placeholder="t('searchPlaceholder')"
            @keyup.enter="applyClaimFilters"
          />
          <select v-model="filters.status" class="input">
            <option value="">{{ t("allStatuses") }}</option>
            <option v-for="option in claimStatusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select v-model.number="filters.limit" class="input">
            <option :value="20">20</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>

          <template #advanced>
            <input
              v-model.trim="filters.policyQuery"
              class="input"
              type="search"
              :placeholder="t('policyFilter')"
              @keyup.enter="applyClaimFilters"
            />
            <select v-model="filters.amountState" class="input">
              <option value="">{{ t("allAmountStates") }}</option>
              <option value="paid">{{ t("amountStatePaid") }}</option>
              <option value="unpaid">{{ t("amountStateUnpaid") }}</option>
              <option value="approved_only">{{ t("amountStateApprovedOnly") }}</option>
              <option value="pending_payment">{{ t("amountStatePendingPayment") }}</option>
            </select>
          </template>
        </WorkbenchFilterToolbar>
      </template>
      </PageToolbar>
    </article>

    <article class="surface-card rounded-2xl p-5">
      <DataTableShell
      :loading="claimsResource.loading"
      :error="claimsErrorText"
      :empty="claims.length === 0"
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
                <th class="at-table-head-cell">{{ t("claim") }}</th>
                <th class="at-table-head-cell">{{ t("policy") }}</th>
                <th class="at-table-head-cell">{{ t("status") }}</th>
                <th class="at-table-head-cell">{{ t("amounts") }}</th>
                <th class="at-table-head-cell">{{ t("actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="claim in claims" :key="claim.name" class="at-table-row">
                <DataTableCell>
                  <TableEntityCell :title="claim.claim_no || claim.name" :facts="claimIdentityFacts(claim)" />
                </DataTableCell>
                <TableFactsCell :items="claimPolicyFacts(claim)" />
                <DataTableCell>
                  <StatusBadge type="claim" :status="claim.claim_status" />
                </DataTableCell>
                <DataTableCell cell-class="min-w-[220px]">
                  <AmountPairSummary
                    :left-label="t('approved')"
                    :left-value="claim.approved_amount"
                    :right-label="t('paid')"
                    :right-value="claim.paid_amount"
                    :locale="localeCode"
                  />
                </DataTableCell>
                <DataTableCell>
                  <InlineActionRow>
                    <ActionButton
                      v-if="claim.policy"
                      variant="secondary"
                      size="xs"
                      @click="openPolicy(claim.policy)"
                    >
                      {{ t("openPolicy") }}
                    </ActionButton>
                  </InlineActionRow>
                </DataTableCell>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      </DataTableShell>
    </article>

    <QuickCreateManagedDialog
      v-model="showQuickClaimDialog"
      config-key="claim"
      :locale="activeLocale"
      :options-map="claimQuickOptionsMap"
      :show-save-and-open="false"
      :before-open="prepareQuickClaimDialog"
      :success-handlers="quickClaimSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useClaimStore } from "../stores/claim";
import ActionButton from "../components/app-shell/ActionButton.vue";
import AmountPairSummary from "../components/app-shell/AmountPairSummary.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import StatusBadge from "../components/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { subtleFact } from "../utils/factItems";

const copy = {
  tr: {
    title: "Hasarlar",
    subtitle: "Hasar dosyalari ve odeme durumu",
    refresh: "Yenile",
    newClaim: "Yeni Hasar",
    loading: "Yukleniyor...",
    loadErrorTitle: "Hasarlar Yuklenemedi",
    loadError: "Hasar kayitlari yuklenirken bir hata olustu.",
    emptyTitle: "Hasar Kaydi Yok",
    empty: "Kayit bulunamadi.",
    claim: "Hasar",
    policy: "Police",
    status: "Durum",
    amounts: "Tutarlar",
    approved: "Onaylanan",
    paid: "Odenen",
    recordId: "Kayit",
    actions: "Aksiyon",
    openDesk: "Yonetim",
    openPolicy: "Policeyi Ac",
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
    searchPlaceholder: "Hasar no / kayit no / police ara",
    allStatuses: "Tum durumlar",
    policyFilter: "Police (icerir)",
    allAmountStates: "Tum tutar durumlari",
    amountStatePaid: "Odenen kayitlar",
    amountStateUnpaid: "Odenmeyen kayitlar",
    amountStateApprovedOnly: "Onayli tutari olanlar",
    amountStatePendingPayment: "Onayli ama eksik odeme",
  },
  en: {
    title: "Claims",
    subtitle: "Claim files and payment status",
    refresh: "Refresh",
    newClaim: "New Claim",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Claims",
    loadError: "An error occurred while loading claim records.",
    emptyTitle: "No Claim Records",
    empty: "No records found.",
    claim: "Claim",
    policy: "Policy",
    status: "Status",
    amounts: "Amounts",
    approved: "Approved",
    paid: "Paid",
    recordId: "Record",
    actions: "Actions",
    openDesk: "Desk",
    openPolicy: "Open Policy",
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
    searchPlaceholder: "Search claim no / record id / policy",
    allStatuses: "All statuses",
    policyFilter: "Policy (contains)",
    allAmountStates: "All amount states",
    amountStatePaid: "Paid claims",
    amountStateUnpaid: "Unpaid claims",
    amountStateApprovedOnly: "Approved amount exists",
    amountStatePendingPayment: "Approved but underpaid",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const authStore = useAuthStore();
const branchStore = useBranchStore();
const claimStore = useClaimStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");

function buildOfficeBranchLookupFilters() {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

const filters = claimStore.state.filters;

const claimStatusOptions = computed(() =>
  [
    "Open",
    "Under Review",
    "Approved",
    "Paid",
    "Closed",
    "Rejected",
    "Cancelled",
  ].map((value) => ({ value, label: value }))
);
const activeFilterCount = computed(() => claimStore.activeFilterCount);
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
  screen: "claims_board",
  presetStorageKey: "at:claims-board:preset",
  presetListStorageKey: "at:claims-board:preset-list",
  t,
  getCurrentPayload: currentClaimPresetPayload,
  setFilterStateFromPayload: setClaimFilterStateFromPayload,
  resetFilterState: resetClaimFilterState,
  refresh: reloadClaims,
  getSortLocale: () => localeCode.value,
});

const claimsResource = createResource({
  url: "frappe.client.get_list",
  params: buildClaimListParams(),
  auto: true,
});

const claimQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Policy",
    fields: ["name", "policy_no", "customer"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const claimQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const claims = computed(() => claimStore.filteredItems);
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const showQuickClaimDialog = ref(false);
const claimQuickOptionsMap = computed(() => ({
  policies: (claimQuickPolicyResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  customers: (claimQuickCustomerResource.data || []).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  })),
}));
const quickClaimSuccessHandlers = {
  claim_list: async () => {
    await reloadClaims();
  },
};
const claimsErrorText = computed(() => {
  if (claimStore.state.error) return claimStore.state.error;
  const err = claimsResource.error;
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || t("loadError");
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase(localeCode.value);
}

function buildClaimListParams() {
  const params = {
    doctype: "AT Claim",
    fields: ["name", "claim_no", "policy", "claim_status", "approved_amount", "paid_amount"],
    order_by: "modified desc",
    limit_page_length: Number(filters.limit) || 30,
  };
  if (filters.status) {
    params.filters = { claim_status: filters.status };
  }
  return withOfficeBranchFilter(params);
}

function withOfficeBranchFilter(params) {
  const officeBranch = branchStore.requestBranch || "";
  if (!officeBranch) return params;
  return {
    ...params,
    filters: {
      ...(params.filters || {}),
      office_branch: officeBranch,
    },
  };
}

function reloadClaims() {
  claimsResource.params = buildClaimListParams();
  claimStore.setLocaleCode(localeCode.value);
  claimStore.setLoading(true);
  claimStore.clearError();
  return claimsResource
    .reload()
    .then((result) => {
      claimStore.setItems(result || []);
      claimStore.setLoading(false);
      return result;
    })
    .catch((error) => {
      claimStore.setItems([]);
      claimStore.setError(error?.messages?.join(" ") || error?.message || t("loadError"));
      claimStore.setLoading(false);
      throw error;
    });
}

function applyClaimFilters() {
  return reloadClaims();
}

function resetClaimFilterState() {
  claimStore.resetFilters();
}

function currentClaimPresetPayload() {
  return {
    query: filters.query,
    status: filters.status,
    policyQuery: filters.policyQuery,
    amountState: filters.amountState,
    limit: Number(filters.limit) || 30,
  };
}

function setClaimFilterStateFromPayload(payload) {
  filters.query = String(payload?.query || "");
  filters.status = String(payload?.status || "");
  filters.policyQuery = String(payload?.policyQuery || "");
  filters.amountState = String(payload?.amountState || "");
  filters.limit = Number(payload?.limit || 30) || 30;
}

function resetClaimFilters() {
  applyPreset("default", { refresh: false });
  void persistPresetStateToServer();
  return reloadClaims();
}

function prepareQuickClaimDialog({ form }) {
  if (!form.incident_date) form.incident_date = todayIso();
  if (!form.reported_date) form.reported_date = todayIso();
}

function claimIdentityFacts(claim) {
  return [subtleFact("record", t("recordId"), claim?.name || "-")];
}

function claimPolicyFacts(claim) {
  return [subtleFact("policy", t("policy"), claim?.policy || "-")];
}

function openPolicy(policyName) {
  if (!policyName) return;
  window.location.href = `/at/policies/${encodeURIComponent(policyName)}`;
}

onMounted(() => {
  claimStore.setLocaleCode(localeCode.value);
  applyPreset(presetKey.value, { refresh: false });
  if (String(presetKey.value || "default") !== "default") void reloadClaims();
  void hydratePresetStateFromServer();
});

watch(
  () => branchStore.selected,
  () => {
    claimStore.setLocaleCode(localeCode.value);
    const officeFilters = buildOfficeBranchLookupFilters();
    claimQuickPolicyResource.params = {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: officeFilters,
      order_by: "modified desc",
      limit_page_length: 500,
    };
    claimQuickCustomerResource.params = {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: officeFilters,
      order_by: "modified desc",
      limit_page_length: 500,
    };
    void claimQuickPolicyResource.reload();
    void claimQuickCustomerResource.reload();
    void reloadClaims();
  }
);

</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
