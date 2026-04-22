<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="resetSearch">
        {{ hasSearched ? t("clear_search") : t("search") }}
      </ActionButton>
    </template>

    <div class="space-y-8">
      <!-- Help Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionPanel :title="t('how_to_use')">
          <div class="space-y-4">
            <div class="flex items-start gap-3">
              <div class="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">1</div>
              <p class="text-sm text-slate-600 leading-relaxed">{{ t("help_tax_id") }}</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">2</div>
              <p class="text-sm text-slate-600 leading-relaxed">{{ t("help_masked") }}</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">3</div>
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
        <div v-if="accessRequestHistory.length === 0" class="py-12 text-center">
          <div class="mx-auto h-12 w-12 text-slate-300 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p class="text-sm text-slate-500 font-medium">{{ t("no_access_requests") }}</p>
        </div>
        <div v-else>
          <ListTable
            :columns="columns"
            :rows="accessRequestHistory"
          >
            <template #cell(created)="{ row }">
              {{ formatDate(row.created) }}
            </template>
            <template #cell(status)="{ row }">
              <StatusBadge 
                domain="renewal" 
                :status="row.status === 'Approved' ? 'active' : row.status === 'Pending' ? 'hold' : 'cancel'" 
                :label="mapStatus(row.status)" 
              />
            </template>
          </ListTable>
        </div>
      </SectionPanel>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup lang="ts">
import { computed, unref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useCustomerSearchPage } from "../composables/useCustomerSearchPage";
import { CUSTOMER_SEARCH_TRANSLATIONS } from "../config/customer_search_translations";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import ListTable from "../components/ui/ListTable.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import GlobalCustomerSearch from "../components/app-shell/GlobalCustomerSearch.vue";

const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "tr");

function t(key: string) {
  const locale = activeLocale.value as "tr" | "en";
  return CUSTOMER_SEARCH_TRANSLATIONS[locale]?.[key] || CUSTOMER_SEARCH_TRANSLATIONS.en?.[key] || key;
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
  if (normalized === "approved") return t("status_approved");
  if (normalized === "rejected") return t("status_rejected");
  return value || "-";
}

const {
  hasSearched,
  accessRequestHistory,
  onCustomerSelected,
  resetSearch,
  formatDate,
} = useCustomerSearchPage();
</script>
