<template>
  <WorkbenchPageLayout
    :breadcrumb="t('claims_breadcrumb')"
    :title="t('title')"
    :record-count="claimSummary.total"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <ClaimsBoardActionBar
        :claims-loading="claimsLoading"
        :t="t"
        @launch-quick-claim="showQuickClaimDialog = true"
        @refresh="reloadClaims"
        @download-xlsx="downloadClaimExport('xlsx')"
        @download-pdf="downloadClaimExport('pdf')"
      />
    </template>

    <template #metrics>
      <ClaimsBoardMetricsPanel :claim-summary="claimSummary" :format-count="formatCount" :t="t" />
    </template>

    <ClaimsBoardFilterSection
      :claims-list-active-count="claimsListActiveCount"
      :claims-list-filter-config="claimsListFilterConfig"
      :search-query="claimsListSearchQuery"
      :t="t"
      @update:search-query="claimsListSearchQuery = $event"
      @filter-change="onClaimsListFilterChange"
      @reset="onClaimsListFilterReset"
      @focus-search="focusClaimSearch"
    />

    <ClaimsBoardTableSection
      :claims-table-columns="claimsTableColumns"
      :rows="claimsListRowsWithActions"
      :locale="localeCode"
      :loading="claimsLoading"
      :format-count="formatCount"
      :t="t"
      @row-click="openClaimDetail"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

import ClaimsBoardActionBar from "../components/claims-board/ClaimsBoardActionBar.vue";
import ClaimsBoardFilterSection from "../components/claims-board/ClaimsBoardFilterSection.vue";
import ClaimsBoardMetricsPanel from "../components/claims-board/ClaimsBoardMetricsPanel.vue";
import ClaimsBoardTableSection from "../components/claims-board/ClaimsBoardTableSection.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { useClaimsBoardRuntime } from "../composables/useClaimsBoardRuntime";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useClaimStore } from "../stores/claim";

const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const claimStore = useClaimStore();

const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

const {
  claimsLoading,
  showQuickClaimDialog,
  claimsListSearchQuery,
  claimsListFilterConfig,
  claimsListRowsWithActions,
  claimSummary,
  claimsListActiveCount,
  onClaimsListFilterChange,
  onClaimsListFilterReset,
  formatCount,
  reloadClaims,
  downloadClaimExport,
  openClaimDetail,
  t,
} = useClaimsBoardRuntime({
  authStore,
  branchStore,
  claimStore,
  route,
  activeLocale,
  localeCode,
});

const claimsTableColumns = computed(() => [
  { key: "claim_no", label: t("claim_id"), width: "150px" },
  { key: "customer_label", label: t("customer"), width: "200px" },
  { key: "policy_no_display", label: t("policy_no"), width: "150px" },
  { key: "approved_amount", label: t("total_amount"), width: "150px", align: "right" },
  { key: "incident_date_label", label: t("claim_date"), width: "120px" },
  { key: "claim_status", label: t("status"), width: "120px", type: "status", domain: "claim" },
  { key: "_actions", label: t("payments"), width: "240px", type: "actions", align: "right" },
]);

function focusClaimSearch() {
  const searchInput = document.querySelector('input[placeholder*="Hasar"], input[placeholder*="claim"]');
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
    searchInput.select();
  }
}
</script>
