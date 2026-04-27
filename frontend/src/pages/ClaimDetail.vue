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
          :value-class="cell.variant === 'success-pill' ? 'text-at-green' : cell.variant === 'cancel-pill' ? 'text-at-red' : 'text-slate-900'"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <div class="detail-body at-detail-split-wide">
      <!-- Main Content (8) -->
      <div class="detail-main space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableCard
            :title="t('claim_profile')"
            icon="briefcase"
            :fields="profileFields"
            :t="t"
            :saving="saving"
            layout="list"
            @save="updateClaim"
          />

          <EditableCard
            :title="t('financial_summary')"
            icon="pie-chart"
            :fields="financialFields"
            :t="t"
            :saving="saving"
            layout="list"
            @save="updateClaim"
          />
        </div>

        <SectionPanel v-if="payments.length" :title="t('claim_payments')">
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

        <SectionPanel :title="t('documents')">
          <template #trailing>
            <div class="flex flex-wrap items-center gap-2">
              <ActionButton v-if="canUploadDocuments" variant="secondary" size="xs" @click="openUploadModal">
                {{ t("upload") }}
              </ActionButton>
            </div>
          </template>
          <div v-if="!documents.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <MetaListCard
              v-for="doc in documents.slice(0, 5)" 
              :key="doc.name"
              :title="doc.display_name || doc.file_name || doc.name"
              :subtitle="doc.document_sub_type || doc.document_kind || ''"
              class="!p-3"
            >
              <template #trailing>
                 <button class="text-slate-400 hover:text-brand-600" @click="openDocument(doc)">
                  <FeatherIcon name="external-link" class="h-3.5 w-3.5" />
                </button>
              </template>
            </MetaListCard>
            <ActionButton variant="ghost" size="xs" class="w-full justify-center" @click="openClaimDocuments">
              {{ t("view_all_documents") }}
            </ActionButton>
          </div>
        </SectionPanel>
      </aside>
    </div>

    <!-- Notifications -->
    <div class="fixed right-6 top-24 z-[100] w-full max-w-sm pointer-events-none">
      <ToastNotification
        :show="notification.show"
        :message="notification.message"
        :type="notification.type"
        @close="notification.show = false"
      />
    </div>

    <WorkbenchFileUploadModal
      :open="showUploadModal"
      attached-to-doctype="AT Claim"
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
import { useClaimDetailRuntime } from "../composables/useClaimDetailRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import EditableCard from "../components/app-shell/EditableCard.vue";
import StandardCustomerCard from "../components/app-shell/StandardCustomerCard.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import ToastNotification from "../components/ui/ToastNotification.vue";
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

const {
  claim,
  documents,
  payments,
  loading,
  t,
  reload,
  backToList,
  openClaimDocuments,
  showUploadModal,
  openUploadModal,
  closeUploadModal,
  handleUploadComplete,
  canUploadDocuments,
  atDocumentLifecycle,
  archiveDocument,
  restoreDocument,
  permanentDeleteDocument,
  formatDate,
  formatCurrency,
  heroCells,
  profileFields,
  financialFields,
  customerFields,
  saving,
  customerSaving,
  notification,
  updateClaim,
  updateCustomer,
  customer,
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

async function openDocument(doc) {
  const opened = await openDocumentInNewTab(doc || {}, {
    referenceDoctype: "AT Document",
    referenceName: doc?.name || "",
  });
  if (opened) return;
  window.alert(t("file_link_not_found"));
}

function canArchiveDocument(doc) {
  return atDocumentLifecycle.canArchiveDocument(doc);
}

function canRestoreDocument(doc) {
  return atDocumentLifecycle.canRestoreDocument(doc);
}

function canPermanentDeleteDocument(doc) {
  return atDocumentLifecycle.canPermanentDeleteDocument(doc);
}
</script>
