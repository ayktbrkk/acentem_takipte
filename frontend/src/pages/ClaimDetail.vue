<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ claim.claim_no || claim.name || name }}
          <StatusBadge domain="claim" :status="claimStatus" />
        </h1>
        <div class="mt-1.5 flex items-center gap-2">
          <span class="copy-tag">{{ claim.name || name }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" @click="backToList">{{ t("back") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="detail-body">
      <div class="detail-main">
        <SectionPanel :title="t('process')">
          <StepBar :steps="claimSteps" class="mb-4" />
          <FieldGroup :fields="processFields" :cols="4" />
        </SectionPanel>

        <SectionPanel :title="t('details')">
          <FieldGroup :fields="detailFields" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('policy')">
          <div class="cursor-pointer rounded-lg bg-gray-50 p-3 hover:bg-gray-100" @click="openPolicy">
            <p class="text-sm font-medium text-gray-900">{{ claim.policy || '-' }}</p>
            <p class="mt-0.5 text-xs text-gray-400">{{ claim.branch || '-' }}</p>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('documents')">
          <template #trailing>
            <div class="flex items-center gap-2">
              <ActionButton v-if="canUploadDocuments" variant="primary" size="xs" @click="openUploadModal">
                {{ t("uploadDocument") }}
              </ActionButton>
              <ActionButton variant="secondary" size="xs" @click="openClaimDocuments">
                {{ t("openDocuments") }}
              </ActionButton>
              <span class="badge badge-blue">{{ atDocuments.length }}</span>
            </div>
          </template>
          <div v-if="atDocuments.length === 0" class="at-empty-block">{{ t("emptyDocuments") }}</div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="doc in atDocuments"
              :key="doc.name"
              :title="doc.display_name || doc.file || doc.name"
              :description="doc.document_sub_type || doc.document_kind || '-'"
              :meta="doc.document_date || formatDate(doc.creation)"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <span v-if="doc.is_sensitive" class="flex items-center" :title="t('sensitiveData')">
                    <svg class="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                  </span>
                  <span v-if="doc.is_verified" class="flex items-center" :title="t('verified')">
                    <svg class="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  </span>
                    <a href="#" class="btn btn-xs btn-secondary" @click.prevent="openClaimDocument(doc)">{{ t("openDocument") }}</a>
                </div>
              </template>
            </MetaListCard>
          </div>
        </SectionPanel>

        <WorkbenchFileUploadModal
          :open="showUploadModal"
          :attached-to-doctype="'AT Claim'"
          :attached-to-name="claim.name || String(name)"
          :t="t"
          @close="closeUploadModal"
          @uploaded="handleUploadComplete"
        />

        <SectionPanel :title="t('paymentHistory')">
          <div v-if="!payments.length" class="card-empty">{{ t("noPayments") }}</div>
          <table v-else class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">{{ t("claimDate") }}</th>
                <th class="table-header">{{ t("claimNo") }}</th>
                <th class="table-header text-right">{{ t("amount") }}</th>
                <th class="table-header">{{ t("status") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in payments" :key="row.name">
                <td class="table-cell">{{ formatDate(row.payment_date || row.creation) }}</td>
                <td class="table-cell">{{ row.payment_no || row.name }}</td>
                <td class="table-cell text-right">{{ formatCurrency(row.amount_try || row.amount || 0) }}</td>
                <td class="table-cell">{{ row.status || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </SectionPanel>

        <SectionPanel :title="t('expertReports')">
          <FieldGroup :fields="expertiseFields" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('timeline')">
          <div class="mb-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("notes") }}</p>
            <p class="text-sm text-gray-700">{{ claim.rejection_reason || claim.notes || '-' }}</p>
          </div>
          <div>
            <div class="timeline-item">
              <div class="tl-dot tl-dot-active" />
              <div>
                <p class="tl-text">{{ t("updated") }}</p>
                <p class="tl-time">{{ formatDate(claim.modified) }}</p>
              </div>
            </div>
            <div class="timeline-item">
              <div class="tl-dot" />
              <div>
                <p class="tl-text">{{ t("created") }}</p>
                <p class="tl-time">{{ formatDate(claim.creation) }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>
      </div>

      <aside class="detail-sidebar space-y-4">
        <SectionPanel :title="t('relatedPeople')">
          <FieldGroup :fields="peopleFields" :cols="1" />
        </SectionPanel>

        <SectionPanel :title="t('reserveInformation')">
          <FieldGroup :fields="reserveFields" :cols="1" />
        </SectionPanel>

        <SectionPanel :title="t('paymentInformation')">
          <FieldGroup :fields="paymentFields" :cols="1" />
        </SectionPanel>

        <SectionPanel :title="t('recordMetadata')">
          <FieldGroup :fields="recordMetaFields" :cols="1" />
          <button class="mt-3 btn btn-full btn-sm" @click="openCustomer">{{ t("customerRecord") }}</button>
        </SectionPanel>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, unref } from "vue";
import { useAuthStore } from "../stores/auth";
import StatusBadge from "@/components/ui/StatusBadge.vue";
import HeroStrip from "@/components/ui/HeroStrip.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import FieldGroup from "@/components/ui/FieldGroup.vue";
import StepBar from "@/components/ui/StepBar.vue";
import WorkbenchFileUploadModal from "../components/aux-workbench/WorkbenchFileUploadModal.vue";
import { useClaimDetailRuntime } from "../composables/useClaimDetailRuntime";
import { openDocumentInNewTab } from "../utils/documentOpen";

const props = defineProps({ name: { type: String, default: "" } });
const authStore = useAuthStore();

const {
  t,
  claim,
  atDocuments,
  payments,
  claimStatus,
  heroCells,
  processFields,
  detailFields,
  claimSteps,
  peopleFields,
  reserveFields,
  paymentFields,
  expertiseFields,
  recordMetaFields,
  formatDate,
  formatCurrency,
  backToList,
  openPolicy,
  openCustomer,
  openClaimDocuments,
  showUploadModal,
  openUploadModal,
  closeUploadModal,
  handleUploadComplete,
  canUploadDocuments,
} = useClaimDetailRuntime({
  name: computed(() => props.name || ""),
  activeLocale: computed(() => unref(authStore.locale) || "en"),
});

async function openClaimDocument(doc) {
  const opened = await openDocumentInNewTab(doc || {});
  if (opened) return;
  window.alert(String(unref(authStore.locale) || "en").startsWith("tr") ? "Dosya bağlantısı bulunamadı" : "File link not found");
}
</script>

