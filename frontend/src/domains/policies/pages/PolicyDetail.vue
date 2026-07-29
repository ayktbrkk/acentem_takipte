<template>
  <WorkbenchPageLayout
    :breadcrumb="t('policies_breadcrumb')"
    :title="t('policyDetailTitle')"
    :subtitle="policy.policy_no || policy.name || name"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" :aria-label="t('refresh')" @click="reload">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
      </ActionButton>
      <ActionButton variant="secondary" size="sm" :aria-label="t('exportPdf')" @click="handleExportPdf">
        <FeatherIcon name="printer" class="h-4 w-4" />
      </ActionButton>
      <ActionButton variant="secondary" size="sm" :aria-label="t('shareWhatsApp')" @click="handleShareWhatsApp">
        <FeatherIcon name="share-2" class="h-4 w-4" />
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="handleCreateEndorsement">
        <FeatherIcon name="plus" class="h-4 w-4" />
        {{ t("newEndorsement") }}
      </ActionButton>
      <ActionButton v-if="!policy.parent_policy && policy.status !== 'Cancelled' && policy.status !== 'Archived'" variant="secondary" size="sm" class="!text-at-red !border-at-red/30 hover:!bg-at-red/5" @click="handleArchivePolicy">
        <FeatherIcon name="trash-2" class="h-4 w-4" />
        {{ t("cancel_policy") }}
      </ActionButton>
      <ActionButton v-if="policy.parent_policy" variant="secondary" size="sm" class="!text-at-red !border-at-red/30 hover:!bg-at-red/5" @click="handleDeleteVersionedPolicy">
        <FeatherIcon name="trash-2" class="h-4 w-4" />
        {{ t("delete_versioned_policy") }}
      </ActionButton>
      <ActionButton v-if="policy.status === 'Archived'" variant="secondary" size="sm" class="!text-at-green !border-at-green/30 hover:!bg-at-green/5" @click="handleRestorePolicy">
        <FeatherIcon name="rotate-ccw" class="h-4 w-4" />
        {{ t("restore_policy") }}
      </ActionButton>
      <ActionButton v-if="policy.status === 'Archived'" variant="secondary" size="sm" class="!text-at-red !border-at-red/30 hover:!bg-at-red/5" @click="handlePermanentDeletePolicy">
        <FeatherIcon name="x-circle" class="h-4 w-4" />
        {{ t("permanent_delete_policy") }}
      </ActionButton>
      <ActionButton variant="link" size="sm" @click="backToList">
        <FeatherIcon name="arrow-left" class="h-4 w-4" />
        {{ t("back_to_list") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="!loading" class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="cell in heroCells"
          :key="cell.label"
          :label="cell.label"
          :value="cell.value"
          :value-class="cell.variant === 'success-pill' ? 'text-at-green' : cell.variant === 'cancel-pill' ? 'text-at-red' : cell.variant === 'waiting-pill' ? 'text-at-amber' : 'text-slate-900'"
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
            :title="t('policy_technical_details')"
            :icon="branchIcon"
            :fields="profileFields"
            :t="t"
            :locale="activeLocale"
            :saving="saving"
            layout="list"
            @save="updatePolicy"
          />

          <EditableCard
            :title="t('premium_and_financial_details')"
            :fields="premiumFields"
            :t="t"
            :locale="activeLocale"
            :saving="saving"
            layout="list"
            @save="updatePolicy"
          />

          <SectionPanel v-if="commissionDistribution.length" :title="t('commissionDistributionTitle')">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase">
                    <th class="py-2 px-3">{{ t('level') }}</th>
                    <th class="py-2 px-3">{{ t('salesEntity') }}</th>
                    <th class="py-2 px-3 text-right">{{ t('sharePct') }}</th>
                    <th class="py-2 px-3 text-right">{{ t('amount') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(entry, idx) in commissionDistribution"
                    :key="idx"
                    :class="[
                      'border-b border-slate-100',
                      idx === 0 ? 'bg-brand-50/30 font-medium' : '',
                      entry.status === 'Paid' ? 'text-slate-400' : '',
                    ]"
                  >
                    <td class="py-2 px-3 text-slate-500">{{ entry.level }}</td>
                    <td class="py-2 px-3">{{ entry.entity_label || entry.entity_name || entry.entity }}</td>
                    <td class="py-2 px-3 text-right font-mono">{{ isTurkish ? '%' + entry.share_pct : entry.share_pct + '%' }}</td>
                    <td class="py-2 px-3 text-right font-mono">{{ formatCurrency(entry.amount, policy.currency) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionPanel>

          <EditableCard
            v-if="riskFields.length"
            :title="t('risk_info')"
            :fields="riskFields"
            :t="t"
            :locale="activeLocale"
            :saving="saving"
            layout="list"
            class="md:col-span-2"
            @save="updatePolicy"
          />
        </div>

        <SectionPanel v-if="endorsements.length" :title="t('endorsementTitle')">
          <ListTable
            :columns="endorsementColumns"
            :rows="endorsements"
            :loading="loading"
            :locale="activeLocale"
          >
            <template #cell(endorsement_type)="{ row }">
              {{ translateEndorsementType(t, row.endorsement_type) }}
            </template>
            <template #cell(endorsement_date)="{ row }">
              {{ formatDate(row.endorsement_date) }}
            </template>
            <template #cell(notes)="{ row }">
              <span class="text-xs text-slate-500 line-clamp-1">{{ row.notes || '-' }}</span>
            </template>
            <template #cell(status)="{ row }">
              <StatusBadge 
                domain="policy" 
                :status="normalizeEndorsementStatus(row.status)" 
                :label="translateEndorsementStatus(t, row.status)" 
              />
            </template>
            <template #cell(actions)="{ row }">
              <div class="flex items-center gap-1 justify-end">
                <ActionButton
                  variant="ghost"
                  size="xs"
                  @click="handleEditEndorsement(row.name)"
                >
                  {{ t("edit_endorsement") }}
                </ActionButton>
                <ActionButton
                  v-if="String(row.status || '').toLowerCase() === 'draft'"
                  variant="primary"
                  size="xs"
                  @click="handleApplyEndorsement(row.name)"
                >
                  {{ t("apply_endorsement") }}
                </ActionButton>
                <ActionButton
                  v-if="String(row.status || '').toLowerCase() === 'applied'"
                  variant="secondary"
                  size="xs"
                  class="!text-at-red !border-at-red/30 hover:!bg-at-red/5"
                  @click="handleDeleteAppliedEndorsement(row.name)"
                >
                  {{ t("delete_endorsement") }}
                </ActionButton>
                <ActionButton
                  v-if="String(row.status || '').toLowerCase() !== 'applied'"
                  variant="secondary"
                  size="xs"
                  class="!text-at-red !border-at-red/30 hover:!bg-at-red/5"
                  @click="handleDeleteEndorsement(row.name)"
                >
                  {{ t("delete_endorsement") }}
                </ActionButton>
              </div>
            </template>
          </ListTable>
        </SectionPanel>

        <SectionPanel v-if="payments.length" :title="t('payments')">
          <ListTable
            :columns="paymentColumns"
            :rows="payments"
            :loading="loading"
            :locale="activeLocale"
          >
            <template #cell(payment_date)="{ row }">
              {{ formatDate(row.payment_date) }}
            </template>
            <template #cell(amount)="{ row }">
              <span class="font-bold">{{ formatCurrency(row.amount, row.currency) }}</span>
            </template>
            <template #cell(status)="{ row }">
              <StatusBadge domain="payment" :status="row.status" />
            </template>
          </ListTable>
        </SectionPanel>

        <SectionPanel :title="t('activity_timeline')">
          <div v-if="!timelineEntries.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center">
            <FeatherIcon name="activity" class="mx-auto mb-2 h-6 w-6 text-slate-400" />
            <p class="text-sm text-slate-500">{{ t('emptyActivities') }}</p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(entry, idx) in timelineEntries"
              :key="`tl-${idx}`"
              class="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3 text-sm"
            >
              <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FeatherIcon :name="entry._icon || 'clock'" class="h-3.5 w-3.5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium text-slate-800 truncate">
                  {{ entry.subject || entry.activity_title || entry.reminder_title || entry.snapshot_type || entry._typeLabel || entry.communication_type || entry.comment_type || t('unspecified') }}
                </p>
                <p v-if="entry.content || entry.notes" class="mt-0.5 line-clamp-2 text-xs text-slate-500">{{ entry.content || entry.notes }}</p>
                <p class="mt-0.5 text-[10px] text-slate-400">{{ formatDate(entry._date) }}</p>
              </div>
            </div>
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
                 <span class="inline-flex items-center justify-center min-w-[20px] h-[18px] rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold px-1.5">{{ tasksCount }}</span>
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
                 <span class="inline-flex items-center justify-center min-w-[20px] h-[18px] rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold px-1.5">{{ remindersCount }}</span>
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
          <div v-if="!documents.length && !atDocuments.length" class="text-sm text-slate-400 py-2">{{ t("emptyDocuments") }}</div>
          <div v-else class="space-y-2">
            <MetaListCard
              v-for="doc in atDocuments.slice(0, 5)" 
              :key="doc.name"
              :title="doc.display_name || doc.file_name || doc.name"
              :subtitle="doc.document_sub_type || doc.document_kind || ''"
              class="!p-3"
            >
              <template #trailing>
                <ActionButton variant="ghost" size="xs" :aria-label="t('openDocument')" @click="openDocument(doc, 'AT Document')">
                  <FeatherIcon name="external-link" class="h-3.5 w-3.5" />
                </ActionButton>
              </template>
            </MetaListCard>
            <ActionButton variant="ghost" size="xs" class="w-full justify-center" @click="openPolicyDocuments">
              {{ t("openDocumentCenter") }}
            </ActionButton>
          </div>
        </SectionPanel>

        <SectionPanel v-if="productProfile.product_family" :title="t('productProfileTitle')">
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-500">{{ t('productFamily') }}</span>
              <span class="font-medium text-slate-800">{{ translateProductLabel(t, productProfile.product_family) || productProfile.product_family }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">{{ t('readinessScore') }}</span>
              <span
                class="font-bold"
                :class="productProfile.readiness_score >= 80 ? 'text-at-green' : productProfile.readiness_score >= 50 ? 'text-at-amber' : 'text-at-red'"
              >
                <template v-if="isTurkish">%{{ productProfile.readiness_score }}</template>
                <template v-else>{{ productProfile.readiness_score }}%</template>
              </span>
            </div>
            <div v-if="productProfile.missing_field_count" class="mt-2 rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs">
              <p class="font-medium text-amber-800 mb-1">{{ t('missingProductFields') }} ({{ productProfile.missing_field_count }})</p>
              <ul class="list-disc list-inside text-amber-700 space-y-0.5">
                 <li v-for="f in productProfile.missing_fields" :key="f.key">{{ translateProductLabel(t, f.label) }}</li>
              </ul>
            </div>
            <div v-else class="text-xs text-slate-400">{{ t('noMissingProductField') }}</div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="renewalTasks.length" :title="t('renewal_tasks')">
          <div class="space-y-2">
            <div
              v-for="rt in renewalTasks.slice(0, 3)"
              :key="rt.name"
              class="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2 text-xs"
            >
              <div>
                <p class="font-medium text-slate-800">{{ formatDate(rt.renewal_date) }}</p>
                <p class="text-slate-500">{{ translateRenewalStage(rt.reminder_stage) }}</p>
              </div>
              <StatusBadge domain="renewal" :status="rt.status" />
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="versionChain.length > 1" :title="t('version_chain')">
          <div class="space-y-1">
            <div
              v-for="(v, idx) in versionChain"
              :key="v.name"
              class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer hover:bg-slate-100 transition-colors"
              :class="v.is_current ? 'bg-brand-50 border border-brand-100' : 'bg-white border border-slate-100'"
              @click="navigateToVersion(v.name)"
            >
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                :class="v.is_current ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'">
                {{ v.policy_version ?? idx }}
              </span>
              <span class="font-medium truncate" :class="v.is_current ? 'text-brand-800' : 'text-slate-700'">{{ v.name }}</span>
              <StatusBadge v-if="v.status" domain="policy" :status="normalizeStatus(v.status)" />
            </div>
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
      attached-to-doctype="AT Policy"
      :attached-to-name="name"
      @close="closeUploadModal"
      @uploaded="handleUploadComplete"
    />

    <PolicyEndorsementQuickDialog
      :show="showEndorsementDialog"
      :form="endorsementForm"
      :field-errors="endorsementFieldErrors"
      :type-options="endorsementTypeOptions"
      :error="endorsementError"
      :loading="endorsementLoading"
      :show-financial-fields="endorsementShowFinancial"
      :title="endorsementDialogTitle"
      :subtitle="endorsementEditMode ? t('edit_endorsement_subtitle') : t('endorsement_dialog_subtitle')"
      :show-delete="endorsementEditMode"
      :t="endorsementT"
      @cancel="closeEndorsementDialog"
      @submit="handleSubmitEndorsement"
      @delete="handleDeleteEndorsementFromDialog"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { FeatherIcon } from "frappe-ui";
import { useAuthStore } from "../../../stores/auth";
import { usePolicyDetailRuntime } from "../../../composables/usePolicyDetailRuntime";
import { usePolicyEndorsementQuickRuntime } from "../../../composables/usePolicyEndorsementQuickRuntime";
import WorkbenchPageLayout from "../../../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../../../components/app-shell/SectionPanel.vue";
import ActionButton from "../../../components/app-shell/ActionButton.vue";
import EditableCard from "../../../components/app-shell/EditableCard.vue";
import StandardCustomerCard from "../../../components/app-shell/StandardCustomerCard.vue";
import MetaListCard from "../../../components/app-shell/MetaListCard.vue";
import SaaSMetricCard from "../../../components/app-shell/SaaSMetricCard.vue";
import ToastNotification from "../../../components/ui/ToastNotification.vue";
import ListTable from "../../../components/ui/ListTable.vue";
import StatusBadge from "../../../components/ui/StatusBadge.vue";
import SkeletonLoader from "../../../components/ui/SkeletonLoader.vue";
import WorkbenchFileUploadModal from "../../../components/aux-workbench/WorkbenchFileUploadModal.vue";
import PolicyEndorsementQuickDialog from "../../../components/policy-list/PolicyEndorsementQuickDialog.vue";
import { openDocumentInNewTab } from "../../../utils/documentOpen";

const props = defineProps({
  name: { type: String, required: true },
});

const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => authStore.locale || "tr");
const isTurkish = computed(() => String(activeLocale.value || "tr").toLowerCase().startsWith("tr"));
const showEndorsementDialog = ref(false);
const editingEndorsementName = ref("");

import { useLinkLabelCache } from "../../../composables/useLinkLabelCache";

const { getLinkLabel } = useLinkLabelCache();

const branchIcon = computed(() => {
  const branch = String(policy.value.branch_name || getLinkLabel(policy.value.branch) || "").toLowerCase();
  if (branch.includes("kasko") || branch.includes("trafik") || branch.includes("oto") || branch.includes("araç") || branch.includes("motor") || branch.includes("car") || branch.includes("vehicle") || branch.includes("auto")) return "truck";
  if (branch.includes("konut") || branch.includes("dask") || branch.includes("ev") || branch.includes("işyeri") || branch.includes("home") || branch.includes("property") || branch.includes("building")) return "home";
  if (branch.includes("sağlık") || branch.includes("saglik") || branch.includes("health") || branch.includes("medical")) return "heart";
  if (branch.includes("seyahat") || branch.includes("travel")) return "map";
  if (branch.includes("hayat") || branch.includes("life") || branch.includes("bes") || branch.includes("emeklilik")) return "user";
  return "shield";
});

const {
  policy,
  customer,
  endorsements,
  payments,
  documents,
  atDocuments,
  productProfile,
  renewalTasks,
  translateRenewalStage,
  versionChain,
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
  formatDate,
  formatCurrency,
  heroCells,
  profileFields,
  riskFields,
  premiumFields,
  saving,
  customerSaving,
  notification,
  timelineEntries,
  tasksCount,
  remindersCount,
  updatePolicy,
  updateCustomer,
  normalizeStatus,
  normalizeEndorsementStatus,
  translateEndorsementType,
  translateEndorsementStatus,
  translateProductLabel,
  showNotification,
  applyEndorsement,
  deleteEndorsement,
  deleteAppliedEndorsement,
  deletePolicy,
  commissionDistribution,
} = usePolicyDetailRuntime({ 
  name: computed(() => props.name),
  activeLocale 
});

const {
  form: endorsementForm,
  fieldErrors: endorsementFieldErrors,
  error: endorsementError,
  loading: endorsementLoading,
  typeOptions: endorsementTypeOptions,
  showFinancialFields: endorsementShowFinancial,
  editMode: endorsementEditMode,
  dialogTitle: endorsementDialogTitle,
  t: endorsementT,
  resetForm: resetEndorsementForm,
  loadForEdit: loadEndorsementForEdit,
  submitEndorsement: submitEndorsementFn,
} = usePolicyEndorsementQuickRuntime({
  policyName: computed(() => policy.value?.name || props.name),
  t,
  onCreated: reload,
  onSuccess: (msg) => showNotification(msg),
});

function openEndorsementDialog() {
  resetEndorsementForm();
  showEndorsementDialog.value = true;
}

function closeEndorsementDialog() {
  showEndorsementDialog.value = false;
}

async function handleSubmitEndorsement() {
  const ok = await submitEndorsementFn();
  if (ok) showEndorsementDialog.value = false;
}

const endorsementColumns = computed(() => [
  { key: "endorsement_type", label: t("endorsement_type"), width: "140px" },
  { key: "endorsement_date", label: t("date"), width: "110px" },
  { key: "notes", label: t("notes"), width: "auto" },
  { key: "status", label: t("status"), width: "90px" },
  { key: "actions", label: "", width: "70px", align: "right" },
]);

const paymentColumns = computed(() => [
  { key: "payment_no", label: t("payment_no"), width: "150px" },
  { key: "payment_date", label: t("date"), width: "120px" },
  { key: "amount", label: t("amount"), width: "120px", align: "right" },
  { key: "status", label: t("status"), width: "100px" },
]);

function handleExportPdf() {
  const policyName = policy.value?.name || props.name;
  window.open(
    `/api/method/frappe.utils.print_format.download_pdf?doctype=AT+Policy&name=${encodeURIComponent(policyName)}&format=Standard`,
    "_blank",
    "noopener,noreferrer"
  );
}

function handleShareWhatsApp() {
  const policyRef = policy.value?.policy_no || policy.value?.name || props.name;
  const customerRef = customer.value?.full_name || customer.value?.name || "-";
  
  const message = t("whatsapp_share_message")
    .replace("{policy}", policyRef)
    .replace("{customer}", customerRef);
    
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function handleCreateEndorsement() {
  openEndorsementDialog();
}

async function handleArchivePolicy() {
  if (!confirm(t("cancel_policy_confirm"))) return;
  try {
    await updatePolicy({ status: "Archived" });
    showNotification(t("policy_cancelled"));
    await reload();
  } catch {}
}

async function handleDeleteVersionedPolicy() {
  if (!confirm(t("delete_versioned_policy_confirm"))) return;
  const endorsementName = policy.value?.endorsement_reference;
  if (!endorsementName) {
    showNotification(t("endorsement_not_found"), "error");
    return;
  }
  await deleteAppliedEndorsement(endorsementName);
  router.push({ name: "policy-detail", params: { name: policy.value?.parent_policy || "policy-list" } });
}

async function handleRestorePolicy() {
  if (!confirm(t("restore_policy_confirm"))) return;
  try {
    await updatePolicy({ status: "Record" });
    showNotification(t("policy_restored"));
    await reload();
  } catch {
    // updatePolicy already shows save_failed notification
  }
}

async function handlePermanentDeletePolicy() {
  if (!confirm(t("permanent_delete_policy_confirm"))) return;
  await deletePolicy();
}

function navigateToVersion(policyName) {
  if (!policyName || policyName === props.name) return;
  router.push({ name: "policy-detail", params: { name: policyName } });
}

async function handleApplyEndorsement(endorsementName) {
  if (!confirm(t("apply_endorsement_confirm"))) return;
  await applyEndorsement(endorsementName);
}

function handleEditEndorsement(endorsementName) {
  const endorsement = endorsements.value.find((e) => e.name === endorsementName);
  if (!endorsement) return;
  editingEndorsementName.value = endorsementName;
  loadEndorsementForEdit(endorsement);
  showEndorsementDialog.value = true;
}

async function handleDeleteEndorsementFromDialog() {
  if (!confirm(t("delete_endorsement_confirm"))) return;
  const name = editingEndorsementName.value;
  const endorsement = endorsements.value.find((e) => e.name === name);
  const isApplied = String(endorsement?.status || "").toLowerCase() === "applied";
  if (isApplied) {
    await deleteAppliedEndorsement(name);
  } else {
    await deleteEndorsement(name);
  }
  showEndorsementDialog.value = false;
}

async function handleDeleteEndorsement(endorsementName) {
  if (!confirm(t("delete_endorsement_confirm"))) return;
  await deleteEndorsement(endorsementName);
}

async function handleDeleteAppliedEndorsement(endorsementName) {
  if (!confirm(t("delete_endorsement_confirm"))) return;
  await deleteAppliedEndorsement(endorsementName);
}

async function openDocument(doc, referenceDoctype) {
  const opened = await openDocumentInNewTab(doc || {}, {
    referenceDoctype,
    referenceName: doc?.name || "",
  });

  if (opened) return;
  notification.message = t("fileLinkNotFound");
  notification.type = "error";
  notification.show = true;
}
</script>
