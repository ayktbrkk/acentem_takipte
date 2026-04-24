<template>
  <WorkbenchPageLayout
    :breadcrumb="t('customers_breadcrumb')"
    :title="t('customers')"
    :record-count="summary.total"
    :record-count-label="t('total_customers')"
  >
    <template #actions>
      <button class="btn btn-primary" @click="showQuickCreateCustomer = true">
        <FeatherIcon name="plus" class="h-4 w-4" />
        {{ t("new_customer") }}
      </button>
      <button class="btn btn-outline" @click="reload">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t("refresh") }}
      </button>
    </template>

    <template #metrics>
      <div v-if="loading && !rows.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaaSMetricCard :label="t('total')" :value="summary.total" />
        <SaaSMetricCard :label="t('active')" :value="summary.active" value-class="text-emerald-600" />
        <SaaSMetricCard :label="t('individual')" :value="summary.individual" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('corporate')" :value="summary.corporate" value-class="text-violet-600" />
      </div>
    </template>

    <div class="space-y-4">
      <SmartFilterBar
        v-model="filters.query"
        :placeholder="t('search')"
        :advanced-label="t('filters')"
        @open-advanced="showAdvancedFilters = !showAdvancedFilters"
      >
        <template #primary-filters>
          <select
            class="input h-9 py-1 text-sm"
            @change="updateFilter('consent_status', $event.target.value)"
          >
            <option value="">{{ t("consent") }}: {{ t("all") }}</option>
            <option v-for="opt in filterConfig[0].options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </template>
      </SmartFilterBar>

      <div v-if="showAdvancedFilters" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-gray-500">{{ t("advanced_filters_placeholder") || 'Gelişmiş filtreleme seçenekleri yakında eklenecek.' }}</p>
      </div>
    </div>

    <div class="mt-8 space-y-4">
      <template v-if="loading && !rows.length">
        <SkeletonLoader variant="list" :rows="10" />
      </template>
      <template v-else>
        <ListTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          clickable
          @row-click="row => openCustomer(row.name)"
        />

        <div class="mt-4 flex items-center justify-between px-2">
          <p class="text-xs font-medium text-slate-400">
            {{ t("showing") }} {{ rows.length }} / {{ summary.total }} {{ t('total_customers') }}
          </p>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-outline btn-sm"
              :disabled="pagination.page <= 1"
              @click="setPage(pagination.page - 1)"
            >
              <FeatherIcon name="chevron-left" class="h-3 w-3" />
            </button>
            <span class="text-xs font-bold text-slate-900 w-8 text-center">{{ pagination.page }}</span>
            <button
              class="btn btn-outline btn-sm"
              :disabled="rows.length < pagination.pageLength"
              @click="setPage(pagination.page + 1)"
            >
              <FeatherIcon name="chevron-right" class="h-3 w-3" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <QuickCreateCustomer
      v-model="showQuickCreateCustomer"
      :locale="activeLocale"
      @created="reload"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, ref, unref } from "vue";
import { useCustomerBoardRuntime } from "../composables/useCustomerBoardRuntime";
import { useAuthStore } from "../stores/auth";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import SmartFilterBar from "../components/app-shell/SmartFilterBar.vue";
import ListTable from "../components/ui/ListTable.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import QuickCreateCustomer from "../components/QuickCreateCustomer.vue";
import { FeatherIcon } from "frappe-ui";

const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "tr");
const showQuickCreateCustomer = ref(false);
const showAdvancedFilters = ref(false);

const {
  filters,
  pagination,
  summary,
  rows,
  loading,
  t,
  reload,
  setPage,
  updateFilter,
  openCustomer,
} = useCustomerBoardRuntime({ activeLocale });

const columns = computed(() => [
  { key: "identity_primary", secondaryKey: "identity_secondary", label: t("colIdentity"), type: "stacked" },
  { key: "contact_primary", secondaryKey: "contact_secondary", label: t("colContact"), type: "stacked" },
  { key: "personal_primary", secondaryKey: "personal_secondary", label: t("colPersonal"), type: "stacked" },
  { key: "mgmt_primary", secondaryKey: "mgmt_secondary", label: t("colManagement"), type: "stacked" },
]);

const filterConfig = computed(() => [
  {
    key: "consent_status",
    label: t("consent"),
    options: [
      { value: "", label: t("all") },
      { value: "Granted", label: t("consent_granted") },
      { value: "Revoked", label: t("consent_revoked") },
      { value: "Unknown", label: t("consent_unknown") },
    ],
  },
]);
</script>
