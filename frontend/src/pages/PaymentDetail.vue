<template>
  <WorkbenchPageLayout
    :breadcrumb="t('payments_breadcrumb')"
    :title="detailCopy.paymentTitle"
    :subtitle="payment.payment_no || payment.name"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="backToList">
        {{ t("back_to_list") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="reload">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t("refresh") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="!loading" class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="cell in heroCells"
          :key="cell.label"
          :label="cell.label"
          :value="cell.value"
          :value-class="cell.variant === 'success-pill' ? 'text-emerald-600' : cell.variant === 'cancel-pill' ? 'text-rose-600' : 'text-gray-900'"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <SectionPanel :title="detailCopy.paymentInfoTitle">
          <SkeletonLoader v-if="loading" variant="text" :rows="8" />
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="field in profileFields" :key="field.label">
              <p class="text-sm font-medium text-slate-500">{{ field.label }}</p>
              <p class="mt-1 text-base font-semibold text-slate-900">{{ field.value || "-" }}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="detailCopy.financialSummaryTitle">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p class="text-sm font-medium text-slate-500">{{ t("amount") }}</p>
              <p class="mt-1 text-base font-semibold text-slate-900">{{ formatCurrency(payment.amount, payment.currency) }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">{{ t("status") }}</p>
              <p class="mt-1 text-base font-semibold text-slate-900">{{ payment.status || "-" }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">{{ t("policy") }}</p>
              <p class="mt-1 text-base font-semibold text-slate-900">{{ payment.policy || "-" }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-slate-500">{{ t("claim_detail") }}</p>
              <p class="mt-1 text-base font-semibold text-slate-900">{{ payment.claim || "-" }}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="installments.length" :title="detailCopy.paymentPlanTitle">
          <ListTable
            :columns="installmentColumns"
            :rows="installments"
            :loading="loading"
          >
            <template #cell(due_date)="{ row }">
              {{ formatDate(row.due_date) }}
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
          <template #trailing>
            <ActionButton variant="secondary" size="xs" @click="openCustomer">
              {{ detailCopy.openCustomerLabel }}
            </ActionButton>
          </template>
          <SkeletonLoader v-if="loading" variant="card" />
          <div v-else class="space-y-4">
            <div class="flex items-center gap-4">
              <div class="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600">
                {{ uppercaseText((payment.customer_name || "?").charAt(0), activeLocale) }}
              </div>
              <div>
                <p class="font-bold text-slate-900">{{ payment.customer_name || t("all") }}</p>
                <p class="text-sm text-slate-500">{{ payment.customer }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="detailCopy.receiptTitle">
          <template #trailing>
            <div class="flex flex-wrap items-center gap-2">
              <ActionButton variant="secondary" size="xs" @click="openCollectPayment">
                {{ t("collectPayment") }}
              </ActionButton>
              <ActionButton v-if="canUploadDocuments" variant="secondary" size="xs" @click="openUploadModal">
                {{ t("addReceipt") }}
              </ActionButton>
              <ActionButton variant="secondary" size="xs" @click="openReminder">
                {{ t("sendReminder") }}
              </ActionButton>
              <ActionButton variant="secondary" size="xs" @click="openPaymentDocuments">
                {{ t("openDocumentCenter") }}
              </ActionButton>
            </div>
          </template>
          <div v-if="!documents.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <div 
              v-for="doc in documents" 
              :key="doc.name"
              class="flex items-center justify-between gap-3 p-2 rounded hover:bg-slate-50 text-sm text-slate-600 transition-colors"
            >
              <span class="truncate">{{ doc.display_name || doc.file_name }}</span>
              <ActionButton variant="secondary" size="xs" @click="openDocument(doc)">
                {{ t("openDocument") }}
              </ActionButton>
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>

    <WorkbenchFileUploadModal
      :open="showUploadModal"
      attached-to-doctype="AT Payment"
      :attached-to-name="name"
      @close="closeUploadModal"
      @uploaded="handleUploadComplete"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed } from "vue";
import { FeatherIcon } from "frappe-ui";
import { useAuthStore } from "../stores/auth";
import { uppercaseText } from "../utils/i18n";
import { usePaymentDetailRuntime } from "../composables/usePaymentDetailRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import ListTable from "../components/ui/ListTable.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import WorkbenchFileUploadModal from "../components/aux-workbench/WorkbenchFileUploadModal.vue";
import { openDocumentInNewTab } from "../utils/documentOpen";

const props = defineProps({
  name: { type: String, required: true },
});

const authStore = useAuthStore();
const activeLocale = computed(() => authStore.locale || "tr");
const detailCopy = computed(() => {
  const isTurkish = String(activeLocale.value || "tr").toLowerCase().startsWith("tr");
  return isTurkish
    ? {
        paymentTitle: "Ödeme Bilgileri",
        paymentInfoTitle: "Ödeme Bilgileri",
        financialSummaryTitle: "Finansal Özet",
        paymentPlanTitle: "Ödeme Planı",
        receiptTitle: "Dekont / Fatura",
        openCustomerLabel: "Müşteri kaydını aç",
      }
    : {
        paymentTitle: "Payment Details",
        paymentInfoTitle: "Payment Information",
        financialSummaryTitle: "Financial Summary",
        paymentPlanTitle: "Payment Plan",
        receiptTitle: "Receipt / Invoice",
        openCustomerLabel: "Open customer record",
      };
});

const {
  payment,
  installments,
  documents,
  showUploadModal,
  loading,
  t,
  reload,
  backToList,
  openCustomer,
  openReminder,
  openPaymentDocuments,
  openCollectPayment,
  openUploadModal,
  closeUploadModal,
  handleUploadComplete,
  canUploadDocuments,
  formatDate,
  formatCurrency,
  heroCells,
  profileFields,
} = usePaymentDetailRuntime({ 
  name: computed(() => props.name),
  activeLocale 
});

async function openDocument(doc) {
  await openDocumentInNewTab(doc || {}, {
    referenceDoctype: "AT Payment",
    referenceName: props.name,
  });
}

const installmentColumns = computed(() => [
  { key: "installment_no", label: t("installment_no"), width: "100px" },
  { key: "due_date", label: t("due_date"), width: "120px" },
  { key: "amount", label: t("amount"), width: "120px", align: "right" },
  { key: "status", label: t("status"), width: "100px" },
]);
</script>
