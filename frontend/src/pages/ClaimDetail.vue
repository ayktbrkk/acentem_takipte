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
                {{ uppercaseText((claim.customer_name || "?").charAt(0), activeLocale) }}
              </div>
              <div>
                <p class="font-bold text-slate-900">{{ claim.customer_name || t("all") }}</p>
                <p class="text-sm text-slate-500">{{ claim.customer }}</p>
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
              <ActionButton variant="secondary" size="xs" @click="openClaimDocuments">
                {{ t("openDocumentCenter") }}
              </ActionButton>
            </div>
          </template>
          <div v-if="!documents.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <MetaListCard
              v-for="doc in documents" 
              :key="doc.name"
              :title="doc.display_name || doc.file_name || doc.name"
              :subtitle="doc.document_sub_type || doc.document_kind || ''"
              :meta="formatDate(doc.document_date || doc.creation)"
            >
              <template #trailing>
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="doc.is_verified" class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
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
                  <ActionButton variant="secondary" size="xs" @click="openDocument(doc)">
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
import MetaListCard from "../components/app-shell/MetaListCard.vue";
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
  window.alert(activeLocale.value === "tr" ? "Dosya bağlantısı bulunamadı" : "File link not found");
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
