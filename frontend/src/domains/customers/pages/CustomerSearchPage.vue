<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="accessRequestHistory.length"
    :record-count-label="t('request_count')"
  >
    <template #actions>
      <ActionButton v-if="hasSearched" variant="secondary" size="sm" @click="resetSearch">
        {{ t("clear_search") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SaaSMetricCard :label="t('recent_access_requests')" :value="accessRequestHistory.length" />
        <SaaSMetricCard :label="t('visibility_summary')" :value="visibilityLabel" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('scope_summary')" :value="scopeLabel" value-class="text-at-green" />
      </div>
    </template>

    <div class="space-y-8">
      <!-- Help Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionPanel :title="t('how_to_use')">
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">1</div>
              <p class="text-sm text-slate-600 leading-relaxed">{{ t("help_tax_id") }}</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">2</div>
              <p class="text-sm text-slate-600 leading-relaxed">{{ t("help_masked") }}</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="h-6 w-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">3</div>
              <p class="text-sm text-slate-600 leading-relaxed">{{ t("help_request") }}</p>
            </div>
          </div>
        </SectionPanel>

        <!-- Global Search Component -->
        <SectionPanel :title="t('global_search_title')">
          <GlobalCustomerSearch
            :title="''"
            :description="t('global_search_subtitle')"
            @customer-selected="onCustomerSelected"
          />
        </SectionPanel>
      </div>

      <!-- Request History Section -->
      <SectionPanel :title="t('recent_access_requests')">
        <SkeletonLoader v-if="historyLoading" variant="list" :rows="4" />
        <div
          v-else-if="historyError"
          class="rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 flex flex-wrap items-center justify-between gap-4"
          role="alert"
          aria-live="polite"
        >
          <div>
            <p class="text-sm font-semibold text-at-red">{{ t("loadErrorTitle") }}</p>
            <p class="mt-1 text-sm text-at-red/90">{{ historyError }}</p>
          </div>
          <ActionButton variant="secondary" size="sm" @click="loadRequestHistory">
            {{ t("retry") }}
          </ActionButton>
        </div>
        <EmptyState
          v-else-if="accessRequestHistory.length === 0"
          compact
          :title="t('no_access_requests')"
          :description="t('help_history')"
        />
        <ListTable
          v-else
          :columns="columns"
          :rows="accessRequestHistory"
          :locale="activeLocale"
        >
          <template #cell(customer_name)="{ row }">
            {{ row.customer_name || t("unspecified") }}
          </template>
            <template #cell(request_kind)="{ row }">
              {{ mapRequestKind(row.request_kind) }}
            </template>
            <template #cell(created)="{ row }">
              {{ formatDate(row.created) }}
            </template>
            <template #cell(status)="{ row }">
              <StatusBadge 
                domain="renewal" 
                :status="normalizeStatus(row.status, 'breakGlass')" 
                :label="mapStatus(row.status)" 
              />
            </template>
          </ListTable>
      </SectionPanel>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup lang="ts">
import { computed, unref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { normalizeStatus } from "../utils/statusMapping";
import { useCustomerSearchPage } from "../composables/useCustomerSearchPage";
import { CUSTOMER_SEARCH_TRANSLATIONS } from "../config/customer_search_translations";
import { translateText } from "../utils/i18n";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import EmptyState from "../components/app-shell/EmptyState.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import ListTable from "../components/ui/ListTable.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import GlobalCustomerSearch from "../components/app-shell/GlobalCustomerSearch.vue";

const authStore = useAuthStore();
const branchStore = useBranchStore();
const activeLocale = computed(() => (String(unref(authStore.locale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));

const visibilityLabel = computed(() => {
  if (
    authStore.hasAnyRole("AT Manager", "AT System Manager", "System Manager", "Administrator")
  ) {
    return t("visibility_full");
  }
  return t("role_based");
});

const scopeLabel = computed(() => {
  if (authStore.canAccessAllOfficeBranches || !branchStore.requestBranch) {
    return t("all_branches");
  }
  return branchStore.requestBranch || t("scope_branch_only");
});

function t(key: string) {
  return CUSTOMER_SEARCH_TRANSLATIONS[activeLocale.value]?.[key]
    || CUSTOMER_SEARCH_TRANSLATIONS.en?.[key]
    || translateText(key, activeLocale.value);
}

const columns = computed(() => [
  { key: "customer_name", label: t("customer_name"), width: "250px" },
  { key: "request_kind", label: t("request_kind"), width: "150px" },
  { key: "created", label: t("date"), width: "150px" },
  { key: "status", label: t("status"), width: "120px" },
]);

function mapStatus(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "pending") return t("status_pending");
  if (normalized === "submitted") return t("status_submitted");
  if (normalized === "approved") return t("status_approved");
  if (normalized === "rejected") return t("status_rejected");
  return value || t("unspecified");
}

function mapRequestKind(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "access") return t("request_kind_access");
  if (normalized === "transfer") return t("request_kind_transfer");
  if (normalized === "share") return t("request_kind_share");
  return value || t("unspecified");
}

const {
  hasSearched,
  accessRequestHistory,
  historyLoading,
  historyError,
  onCustomerSelected,
  resetSearch,
  formatDate,
  loadRequestHistory,
} = useCustomerSearchPage({ activeLocale, t, authStore });
</script>
