<template>
  <WorkbenchPageLayout
    :breadcrumb="t('customers_breadcrumb')"
    :title="t('customers')"
    :subtitle="t('subtitle')"
    :record-count="summary.total"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="downloadCustomerExport('xlsx')">
        <FeatherIcon name="download" class="h-4 w-4" />
        {{ t("exportXlsx") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="reload">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t("refresh") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="showQuickCreateCustomer = true">
        <FeatherIcon name="plus" class="h-4 w-4" />
        {{ t("new_customer") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="loading && !rows.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SaaSMetricCard :label="t('total')" :value="summary.total" />
        <SaaSMetricCard :label="t('active')" :value="summary.active" value-class="text-at-green" />
        <SaaSMetricCard :label="t('individual')" :value="summary.individual" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('corporate')" :value="summary.corporate" value-class="text-slate-900" />
      </div>
    </template>

    <div class="space-y-4">
      <SmartFilterBar
        v-model="filters.query"
        :placeholder="t('searchPlaceholder')"
        :advanced-label="t('filters')"
        @open-advanced="showAdvancedFilters = !showAdvancedFilters"
      >
        <template #primary-filters>
          <select
            v-model="filters.consent_status"
            class="input h-9 py-1 text-sm"
            @change="updateFilter('consent_status', filters.consent_status)"
          >
            <option value="">{{ t("consent") }}: {{ t("all") }}</option>
            <option v-for="opt in filterConfig[0].options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </template>
      </SmartFilterBar>

      <div v-if="showAdvancedFilters" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p class="text-sm text-slate-500">{{ t("advanced_filters_placeholder") }}</p>
      </div>
    </div>

    <div class="mt-8 space-y-4">
      <div
        v-if="loadErrorText"
        class="rounded-xl border border-at-red/20 bg-at-red/5 px-4 py-3 text-sm text-at-red shadow-sm"
      >
        {{ loadErrorText }}
      </div>
      <template v-if="loading && !rows.length && !loadErrorText">
        <SkeletonLoader variant="list" :rows="10" />
      </template>
      <template v-else>
        <ListTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          :empty-message="t('no_customers_found')"
          clickable
          @row-click="row => openCustomer(row.name)"
        />

        <ListPager
          :shown="rows.length"
          :total="summary.total"
          :page="pagination.page"
          :has-next="hasNextPage"
          :showing-label="t('showingRecords')"
          @previous="setPage(pagination.page - 1)"
          @next="setPage(pagination.page + 1)"
        />
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
import { buildCustomerListTableColumns } from "../composables/customerListTableModel";
import { useCustomerBoardRuntime } from "../composables/useCustomerBoardRuntime";
import { useAuthStore } from "../stores/auth";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import SmartFilterBar from "../components/app-shell/SmartFilterBar.vue";
import ListTable from "../components/ui/ListTable.vue";
import ListPager from "../components/app-shell/ListPager.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
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
  loadErrorText,
  hasNextPage,
  setPage,
  updateFilter,
  openCustomer,
  downloadCustomerExport,
} = useCustomerBoardRuntime({ activeLocale });

const columns = computed(() => buildCustomerListTableColumns(t));

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
