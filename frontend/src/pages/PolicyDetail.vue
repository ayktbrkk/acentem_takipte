<template>
  <WorkbenchPageLayout
    :breadcrumb="t('policies_breadcrumb')"
    :title="t('policyDetailTitle')"
    :subtitle="policy.policy_no || policy.name"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="reload">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t("refresh") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="handleExportPdf">
        <FeatherIcon name="printer" class="h-4 w-4" />
        {{ t("exportPdf") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="handleShareWhatsApp">
        <FeatherIcon name="share-2" class="h-4 w-4" />
        {{ t("shareWhatsApp") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="handleCreateEndorsement">
        <FeatherIcon name="plus" class="h-4 w-4" />
        {{ t("newEndorsement") }}
      </ActionButton>
      <ActionButton variant="link" size="sm" @click="backToList">
        {{ t("back_to_list") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="!loading" class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="(cell, idx) in heroCells"
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

    <div class="detail-body at-detail-split-wide">
      <!-- Sidebar (Sol Kolon - 4) -->
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
          <template #trailing>
            <ActionButton variant="ghost" size="xs">
              {{ t('manage') }}
            </ActionButton>
          </template>
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

        <SectionPanel :title="t('documents')">
          <template #trailing>
            <div class="flex flex-wrap items-center gap-2">
              <ActionButton v-if="canUploadDocuments" variant="secondary" size="xs" @click="openUploadModal">
                {{ t("upload") }}
              </ActionButton>
            </div>
          </template>
          <div v-if="!documents.length && !atDocuments.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <MetaListCard
              v-for="doc in atDocuments.slice(0, 5)" 
              :key="doc.name"
              :title="doc.display_name || doc.file_name || doc.name"
              :subtitle="doc.document_sub_type || doc.document_kind || ''"
              class="!p-3"
            >
              <template #trailing>
                <button class="text-slate-400 hover:text-brand-600" @click="openDocument(doc, 'AT Document')">
                  <FeatherIcon name="external-link" class="h-3.5 w-3.5" />
                </button>
              </template>
            </MetaListCard>
            <ActionButton variant="ghost" size="xs" class="w-full justify-center" @click="openPolicyDocuments">
              {{ t("view_all_documents") }}
            </ActionButton>
          </div>
        </SectionPanel>
      </aside>

      <!-- Main Content (Sağ Kolon - 8) -->
      <div class="detail-main space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableCard
            :title="t('policy_technical_details')"
            :fields="profileFields"
            :t="t"
            :saving="saving"
            :cols="1"
            @save="updatePolicy"
          />

          <EditableCard
            :title="t('premium_and_financial_details')"
            :fields="premiumFields"
            :t="t"
            :saving="saving"
            :cols="1"
            @save="updatePolicy"
          />
        </div>

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
              <StatusBadge domain="policy" :status="row.status === 'Applied' ? 'active' : 'waiting'" :label="row.status" />
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
              <StatusBadge domain="payment" :status="row.status === 'Paid' ? 'active' : 'waiting'" :label="row.status" />
            </template>
          </ListTable>
        </SectionPanel>

        <!-- New Section: Activities / Timeline -->
        <SectionPanel :title="t('activity_timeline')">
          <div class="at-empty-block text-center py-8">
            <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-3">
              <FeatherIcon name="activity" class="h-6 w-6" />
            </div>
            <p class="text-sm text-slate-500">{{ t('no_recent_activity') }}</p>
          </div>
        </SectionPanel>
      </div>
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
      attached-to-doctype="AT Policy"
      :attached-to-name="name"
      @close="closeUploadModal"
      @uploaded="handleUploadComplete"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Dialog, createResource, FeatherIcon } from "frappe-ui";
import { useAuthStore } from "../stores/auth";
import { uppercaseText } from "../utils/i18n";
import { usePolicyDetailRuntime } from "../composables/usePolicyDetailRuntime";
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

const router = useRouter();
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
  openPolicyDocuments,
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
  formatFileSize,
  heroCells,
  profileFields,
  premiumFields,
  customerFields,
  saving,
  customerSaving,
  notification,
  updatePolicy,
  updateCustomer,
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

function handleExportPdf() {
  window.print();
}

function handleShareWhatsApp() {
  const policyRef = policy.value?.policy_no || policy.value?.name || props.name;
  const customerRef = customer.value?.full_name || customer.value?.name || "-";
  const message = activeLocale.value === "tr"
    ? `Poliçe: ${policyRef}\nMüşteri: ${customerRef}`
    : `Policy: ${policyRef}\nCustomer: ${customerRef}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function handleCreateEndorsement() {
  router.push({
    name: "offer-board",
    query: {
      from_policy: policy.value?.name || props.name,
      intent: "endorsement",
    },
  });
}

async function openDocument(doc, referenceDoctype) {
  const opened = await openDocumentInNewTab(doc || {}, {
    referenceDoctype,
    referenceName: doc?.name || "",
  });

  if (opened) return;
  window.alert(t("fileLinkNotFound"));
}

function isPrivateDocument(doc) {
  return Boolean(doc?.is_private);
}

function isVerifiedDocument(doc) {
  return Boolean(doc?.is_verified);
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
