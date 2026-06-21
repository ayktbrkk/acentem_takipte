<template>
  <WorkbenchPageLayout
    :breadcrumb="t('claims_breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
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
      v-model:preset-key="presetKey"
      :claims-list-active-count="claimsListActiveCount"
      :claims-list-filter-config="claimsListFilterConfig"
      :filters="filters"
      :search-query="filters.query"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :t="t"
      @update:search-query="filters.query = $event"
      @filter-change="onClaimsListFilterChange"
      @reset="resetClaimFilters"
      @apply="applyClaimFilters"
      @preset-change="onPresetChange"
      @preset-save="savePreset"
      @preset-delete="deletePreset"
      @focus-search="focusClaimSearch"
    />

    <ClaimsBoardTableSection
      :claims-table-columns="claimsTableColumns"
      :rows="claimsListRowsWithActions"
      :locale="localeCode"
      :loading="claimsLoading"
      :error-text="claimsErrorText"
      :format-count="formatCount"
      :page="claimsListPagination.page"
      :total="claimSummary.total"
      :has-next-page="claimsHasNextPage"
      :showing-label="t('showing')"
      :t="t"
      @row-click="openClaimDetail"
      @retry="reloadClaims"
      @previous-page="setClaimsPage(claimsListPagination.page - 1)"
      @next-page="setClaimsPage(claimsListPagination.page + 1)"
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
import { buildClaimsListTableColumns } from "../composables/claimsListTableModel";
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
  claimsListFilterConfig,
  claimsListRowsWithActions,
  claimQuickOptionsMap,
  ownershipAssignmentEyebrow,
  claimSummary,
  claimsListActiveCount,
  claimsListPagination,
  claimsHasNextPage,
  filters,
  presetKey,
  presetOptions,
  canDeletePreset,
  onPresetChange,
  savePreset,
  deletePreset,
  applyClaimFilters,
  resetClaimFilters,
  setClaimsPage,
  claimsErrorText,
  quickClaimSuccessHandlers,
  ownershipAssignmentSuccessHandlers,
  onClaimsListFilterChange,
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
  ...buildClaimsListTableColumns(t).map((column) => ({
    ...column,
    width: column.key === "customer_label" ? "180px" : column.key === "incident_date_label" ? "120px" : column.key === "claim_status" ? "120px" : column.width,
  })),
  { key: "_actions", label: t("actions"), width: "240px", type: "actions", align: "right" },
]);

function focusClaimSearch() {
  const searchInput = document.querySelector('[data-search-input]');
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
    searchInput.select();
  }
}
</script>
