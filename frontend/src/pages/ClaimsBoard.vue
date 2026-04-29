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

    <ClaimsBoardDialogs
      :show-quick-claim-dialog="showQuickClaimDialog"
      :show-ownership-assignment-dialog="showOwnershipAssignmentDialog"
      :active-locale="activeLocale"
      :claim-quick-options-map="claimQuickOptionsMap"
      :claim-dialog-title="t('newClaim')"
      :ownership-assignment-eyebrow="ownershipAssignmentEyebrow"
      :prepare-quick-claim-dialog="prepareQuickClaimDialog"
      :quick-claim-success-handlers="quickClaimSuccessHandlers"
      :prepare-ownership-assignment-dialog="prepareOwnershipAssignmentDialog"
      :ownership-assignment-success-handlers="ownershipAssignmentSuccessHandlers"
      @update:show-quick-claim-dialog="showQuickClaimDialog = $event"
      @update:show-ownership-assignment-dialog="showOwnershipAssignmentDialog = $event"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

import ClaimsBoardActionBar from "../components/claims-board/ClaimsBoardActionBar.vue";
import ClaimsBoardDialogs from "../components/claims-board/ClaimsBoardDialogs.vue";
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
  showOwnershipAssignmentDialog,
  claimsListSearchQuery,
  claimsListFilterConfig,
  claimsListRowsWithActions,
  claimQuickOptionsMap,
  ownershipAssignmentEyebrow,
  claimSummary,
  claimsListActiveCount,
  quickClaimSuccessHandlers,
  ownershipAssignmentSuccessHandlers,
  onClaimsListFilterChange,
  onClaimsListFilterReset,
  formatCount,
  reloadClaims,
  downloadClaimExport,
  prepareQuickClaimDialog,
  prepareOwnershipAssignmentDialog,
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
  { key: "claim_primary", secondaryKey: "claim_secondary", label: t("colClaim"), type: "stacked" },
  { key: "customer_label", label: t("colCustomer"), width: "180px" },
  { key: "type_primary", secondaryKey: "type_secondary", label: t("colDetail"), type: "stacked" },
  { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colFinance"), type: "stacked" },
  { key: "incident_date_label", label: t("colIncidentDate"), width: "120px" },
  { key: "claim_status", label: t("colStatus"), width: "120px", type: "status", domain: "claim" },
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
