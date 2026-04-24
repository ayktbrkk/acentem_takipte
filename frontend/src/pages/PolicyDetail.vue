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

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <SectionPanel :title="t('overviewTitle')" panel-class="surface-card rounded-xl p-5 policy-equal-card">
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
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <SectionPanel :title="t('customer_details')" panel-class="surface-card rounded-xl p-5 policy-equal-card">
          <template #trailing>
            <ActionButton variant="secondary" size="xs" @click="openCustomer">
              {{ t("customer_details") }}
            </ActionButton>
          </template>
          <SkeletonLoader v-if="loading" variant="card" />
          <div v-else @click="openCustomer" class="cursor-pointer group">
            <div class="flex items-center gap-4 mb-4">
              <div class="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                {{ uppercaseText((customer.full_name || "?").charAt(0), activeLocale) }}
              </div>
              <div>
                <p class="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{{ customer.full_name || t("all") }}</p>
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
          <template #trailing>
            <div class="flex flex-wrap items-center gap-2">
              <ActionButton v-if="canUploadDocuments" variant="secondary" size="xs" @click="openUploadModal">
                {{ t("uploadDocument") }}
              </ActionButton>
              <ActionButton variant="secondary" size="xs" @click="openPolicyDocuments">
                {{ t("openDocumentCenter") }}
              </ActionButton>
            </div>
          </template>
          <div v-if="!documents.length && !atDocuments.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <MetaListCard
              v-for="doc in documents" 
              :key="doc.name"
              :title="doc.file_name || doc.name"
              :description="formatFileSize(doc.file_size)"
              :meta="formatDate(doc.creation)"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <span v-if="isPrivateDocument(doc)" class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {{ t("private") }}
                  </span>
                  <ActionButton variant="secondary" size="xs" @click="openDocument(doc, 'File')">
                    {{ t("openDocument") }}
                  </ActionButton>
                </div>
              </template>
            </MetaListCard>
            <MetaListCard
              v-for="doc in atDocuments" 
              :key="doc.name"
              :title="doc.display_name || doc.file_name || doc.name"
              :subtitle="doc.document_sub_type || doc.document_kind || ''"
              :description="formatFileSize(doc.file_size)"
              :meta="formatDate(doc.document_date || doc.creation)"
            >
              <template #trailing>
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="isPrivateDocument(doc)" class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {{ t("private") }}
                  </span>
                  <span v-if="isVerifiedDocument(doc)" class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                    {{ t("status_verified") }}
                  </span>
                  <ActionButton v-if="canArchiveDocument(doc)" variant="secondary" size="xs" @click="archiveDocument(doc)">
                    {{ t("archiveDocument") }}
                  </ActionButton>
                  <ActionButton v-if="canRestoreDocument(doc)" variant="secondary" size="xs" @click="restoreDocument(doc)">
                    {{ t("restoreDocument") }}
                  </ActionButton>
                  <ActionButton v-if="canPermanentDeleteDocument(doc)" variant="secondary" size="xs" @click="permanentDeleteDocument(doc)">
                    {{ t("permanentDeleteDocument") }}
                  </ActionButton>
                  <ActionButton variant="secondary" size="xs" @click="openDocument(doc, 'AT Document')">
                    {{ t("openDocument") }}
                  </ActionButton>
                </div>
              </template>
            </MetaListCard>
          </div>
        </SectionPanel>
      </div>
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
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
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
