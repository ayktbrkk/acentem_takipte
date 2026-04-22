<template>
  <WorkbenchPageLayout
    :breadcrumb="t('policies_breadcrumb')"
    :title="t('policy_detail')"
    :subtitle="policy.policy_no || policy.name"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="backToList">
        {{ t("back_to_list") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="reload">
        {{ t("refresh") }}
      </ActionButton>
    </template>

    <template #metrics>
      <HeroStrip v-if="!loading" :cells="heroCells" />
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <SectionPanel :title="t('overview')">
          <SkeletonLoader v-if="loading" variant="text" :rows="10" />
          <div v-else class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div v-for="field in profileFields" :key="field.label">
                <p class="text-sm font-medium text-slate-500">{{ field.label }}</p>
                <p class="mt-1 text-base font-semibold text-slate-900">{{ field.value || "-" }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="endorsements.length" :title="t('endorsements')">
          <ListTable
            :columns="endorsementColumns"
            :rows="endorsements"
            :loading="loading"
          >
            <template #cell(endorsement_date)="{ row }">
              {{ formatDate(row.endorsement_date) }}
            </template>
            <template #cell(status)="{ row }">
              <StatusBadge domain="policy" :status="row.status === 'Applied' ? 'active' : 'hold'" :label="row.status" />
            </template>
          </ListTable>
        </SectionPanel>

        <SectionPanel v-if="payments.length" :title="t('payments')">
          <ListTable
            :columns="paymentColumns"
            :rows="payments"
            :loading="loading"
          >
            <template #cell(payment_date)="{ row }">
              {{ formatDate(row.payment_date) }}
            </template>
            <template #cell(amount)="{ row }">
              {{ formatCurrency(row.amount, row.currency) }}
            </template>
            <template #cell(status)="{ row }">
              <StatusBadge domain="payment" :status="row.status === 'Paid' ? 'active' : 'hold'" :label="row.status" />
            </template>
          </ListTable>
        </SectionPanel>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <SectionPanel :title="t('customer_details')">
          <SkeletonLoader v-if="loading" variant="card" />
          <div v-else @click="openCustomer" class="cursor-pointer group">
            <div class="flex items-center gap-4 mb-4">
              <div class="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                {{ (customer.full_name || "?").charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{{ customer.full_name || t("all") }}</p>
                <p class="text-sm text-slate-500">{{ customer.name }}</p>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="field in customerFields" :key="field.label">
                <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">{{ field.label }}</p>
                <p class="text-sm font-medium text-slate-700">{{ field.value || "-" }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('documents')">
          <div v-if="!documents.length && !atDocuments.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <a 
              v-for="doc in documents" 
              :key="doc.name"
              :href="doc.file_url"
              target="_blank"
              class="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-600 transition-colors"
            >
              <span class="truncate">{{ doc.file_name }}</span>
            </a>
            <a 
              v-for="doc in atDocuments" 
              :key="doc.name"
              :href="doc.file_url"
              target="_blank"
              class="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-600 transition-colors"
            >
              <span class="truncate">{{ doc.display_name || doc.file_name }}</span>
            </a>
          </div>
        </SectionPanel>
      </div>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { usePolicyDetailRuntime } from "../composables/usePolicyDetailRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import HeroStrip from "../components/ui/HeroStrip.vue";
import ListTable from "../components/ui/ListTable.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";

const props = defineProps({
  name: { type: String, required: true },
});

const authStore = useAuthStore();
const activeLocale = computed(() => authStore.locale || "tr");

const {
  policy,
  customer,
  endorsements,
  payments,
  documents,
  atDocuments,
  loading,
  t,
  reload,
  backToList,
  openCustomer,
  formatDate,
  formatCurrency,
  heroCells,
  profileFields,
  customerFields,
} = usePolicyDetailRuntime({ 
  name: computed(() => props.name),
  activeLocale 
});

const endorsementColumns = computed(() => [
  { key: "endorsement_type", label: t("endorsement_type"), width: "150px" },
  { key: "endorsement_date", label: t("date"), width: "120px" },
  { key: "status", label: t("status"), width: "100px" },
]);

const paymentColumns = computed(() => [
  { key: "payment_no", label: t("payment_no"), width: "150px" },
  { key: "payment_date", label: t("date"), width: "120px" },
  { key: "amount", label: t("amount"), width: "120px", align: "right" },
  { key: "status", label: t("status"), width: "100px" },
]);
</script>
