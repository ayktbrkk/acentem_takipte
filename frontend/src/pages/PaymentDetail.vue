<template>
  <WorkbenchPageLayout
    :breadcrumb="t('payments_breadcrumb')"
    :title="t('payment_detail')"
    :subtitle="payment.payment_no || payment.name"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="backToList">
        {{ t("back_to_list") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="reload">
        <FeatherIcon name="refresh-cw" :class="['h-4 w-4', loading && 'animate-spin']" />
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
          :value-class="cell.variant === 'success-pill' ? 'text-at-green' : cell.variant === 'cancel-pill' ? 'text-at-red' : 'text-slate-900'"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <div class="detail-body at-detail-split-wide">
      <!-- Sidebar (4) -->
      <aside class="detail-sidebar at-detail-aside space-y-6">
        <StandardCustomerCard
          :title="t('customer_details')"
          :customer="customer"
          :saving="customerSaving"
          :t="t"
          @save="updateCustomer"
          @view-full="openCustomer"
        />

        <SectionPanel :title="t('operations')">
          <div class="space-y-4">
             <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
               <div class="flex items-center gap-3">
                 <div class="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
                   <FeatherIcon name="check-circle" class="h-4 w-4" />
                 </div>
                 <div>
                   <p class="text-xs font-bold text-slate-800">{{ t('tasks') }}</p>
                   <p class="text-[10px] text-slate-500">{{ t('active_tasks_hint') }}</p>
                 </div>
               </div>
               <span class="badge badge-blue">0</span>
             </div>

             <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
               <div class="flex items-center gap-3">
                 <div class="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
                   <FeatherIcon name="bell" class="h-4 w-4" />
                 </div>
                 <div>
                   <p class="text-xs font-bold text-slate-800">{{ t('reminders') }}</p>
                   <p class="text-[10px] text-slate-500">{{ t('active_reminders_hint') }}</p>
                 </div>
               </div>
               <span class="badge badge-amber">0</span>
             </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('receipt_title')">
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
          <div v-if="!documents.length" class="flex flex-col items-center justify-center py-8 card-empty-compact">
            <div class="card-empty-icon">
              <FeatherIcon name="file" class="h-6 w-6" />
            </div>
            <p class="card-empty-text">{{ t("no_activities") }}</p>
          </div>
          <div v-else class="divide-y divide-slate-100">
            <div 
              v-for="doc in documents" 
              :key="doc.name"
              class="flex items-center justify-between gap-3 py-3 text-sm text-slate-600"
            >
              <div class="flex items-center gap-3 truncate">
                <FeatherIcon name="file-text" class="h-4 w-4 text-slate-400" />
                <span class="truncate font-medium text-slate-700">{{ doc.display_name || doc.file_name }}</span>
              </div>
              <ActionButton variant="secondary" size="xs" @click="openDocument(doc)">
                {{ t("openDocument") }}
              </ActionButton>
            </div>
          </div>
        </SectionPanel>
      </aside>

      <!-- Main Content (8) -->
      <div class="detail-main space-y-6">
        <EditableCard
          :title="t('payment_info')"
          :fields="profileFields"
          layout="list"
          :t="t"
          :saving="saving"
          @save="savePayment"
        />

        <EditableCard
          :title="t('financial_summary')"
          :fields="financialFields"
          layout="list"
          :t="t"
          :saving="saving"
          @save="savePayment"
        />

        <SectionPanel v-if="installments.length" :title="t('payment_plan')">
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
              <StatusBadge 
                domain="payment" 
                :status="row.status === 'Paid' ? 'active' : 'hold'" 
                :label="t('status_' + String(row.status || 'draft').toLowerCase())" 
              />
            </template>
          </ListTable>
        </SectionPanel>

        <SectionPanel :title="t('activity_timeline')">
          <div class="card-empty">
            <div class="card-empty-icon">
              <FeatherIcon name="activity" class="h-6 w-6" />
            </div>
            <p class="card-empty-text">{{ t('no_recent_activity') }}</p>
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

    <!-- Notifications -->
    <div class="fixed right-6 top-24 z-[100] w-full max-w-sm pointer-events-none">
      <ToastNotification
        :show="notification.show"
        :message="notification.message"
        :type="notification.type"
        @close="notification.show = false"
      />
    </div>
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
import EditableCard from "../components/app-shell/EditableCard.vue";
import StandardCustomerCard from "../components/app-shell/StandardCustomerCard.vue";
import ToastNotification from "../components/ui/ToastNotification.vue";
import WorkbenchFileUploadModal from "../components/aux-workbench/WorkbenchFileUploadModal.vue";
import { openDocumentInNewTab } from "../utils/documentOpen";

const props = defineProps({
  name: { type: String, required: true },
});

const authStore = useAuthStore();
const activeLocale = computed(() => authStore.locale || "tr");

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
  financialFields,
  saving,
  customerSaving,
  notification,
  savePayment,
  updateCustomer,
  customer,
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
  { key: "installment_no", label: t("colInstallmentNo"), width: "100px" },
  { key: "due_date", label: t("colTerminDate"), width: "120px" },
  { key: "amount", label: t("colAmount"), width: "120px", align: "right" },
  { key: "status", label: t("colStatus"), width: "100px" },
]);
</script>
