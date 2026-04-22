<template>
  <WorkbenchPageLayout
    :breadcrumb="t('claims_breadcrumb')"
    :title="t('claim_detail')"
    :subtitle="claim.name"
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
          <SkeletonLoader v-if="loading" variant="text" :rows="8" />
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="field in profileFields" :key="field.label">
              <p class="text-sm font-medium text-slate-500">{{ field.label }}</p>
              <p class="mt-1 text-base font-semibold text-slate-900">{{ field.value || "-" }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">{{ t("total_amount") }}</p>
              <p class="mt-1 text-base font-bold text-slate-900">{{ formatCurrency(claim.total_amount, claim.currency) }}</p>
            </div>
          </div>
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
          <div v-else class="space-y-4">
            <div class="flex items-center gap-4">
              <div class="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
                {{ (claim.customer_name || "?").charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="font-bold text-slate-900">{{ claim.customer_name || t("all") }}</p>
                <p class="text-sm text-slate-500">{{ claim.customer }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('documents')">
          <div v-if="!documents.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <a 
              v-for="doc in documents" 
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
import { useClaimDetailRuntime } from "../composables/useClaimDetailRuntime";
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
  claim,
  documents,
  payments,
  loading,
  t,
  reload,
  backToList,
  formatDate,
  formatCurrency,
  heroCells,
  profileFields,
} = useClaimDetailRuntime({ 
  name: computed(() => props.name),
  activeLocale 
});

const paymentColumns = computed(() => [
  { key: "payment_no", label: t("payment_no"), width: "150px" },
  { key: "payment_date", label: t("date"), width: "120px" },
  { key: "amount", label: t("amount"), width: "120px", align: "right" },
  { key: "status", label: t("status"), width: "100px" },
]);
</script>
