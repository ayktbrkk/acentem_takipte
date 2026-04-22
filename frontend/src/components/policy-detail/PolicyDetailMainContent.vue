<template>
  <div class="detail-main">
    <template v-if="activeTab === 'summary'">
      <SectionPanel :title="t('lifecycleTitle')">
        <template #trailing>
          <span class="badge badge-blue">v{{ selectedSnapshotVersion || '-' }}</span>
        </template>
        <StepBar :steps="lifecycleSteps" class="mb-4" />
        <FieldGroup :fields="lifecycleFields" :cols="4" />
      </SectionPanel>

      <SectionPanel :title="t('timelineTitle')">
        <template #trailing>
          <ActionButton variant="secondary" size="sm" type="button" @click="openQuickOwnershipAssignment">
            {{ t("newAssignment") }}
          </ActionButton>
        </template>
        <div v-if="timelineLoading" class="card-empty">{{ t("loading") }}</div>
        <div v-else-if="timelineItems.length === 0" class="card-empty">{{ t("emptyTimeline") }}</div>
        <div v-else>
          <div v-for="item in timelineItems" :key="item.key" class="timeline-item">
            <span class="tl-dot" :class="item.dotClass || 'tl-dot-active'" />
            <div class="min-w-0 flex-1">
              <p class="tl-text">{{ item.title }}</p>
              <p class="text-sm text-gray-500">{{ item.body }}</p>
              <p class="tl-time">{{ fmtDateTime(item.date) }} · {{ item.actor || '-' }}</p>
            </div>
          </div>
        </div>
      </SectionPanel>
    </template>

    <template v-else-if="activeTab === 'premiums'">
      <SectionPanel :title="t('premiumTitle')">
        <FieldGroup :fields="premiumFieldGroups" :cols="2" />
      </SectionPanel>
      <SectionPanel :title="t('payments')">
        <div v-if="paymentLoading" class="card-empty">{{ t("loading") }}</div>
        <div v-else-if="payments.length === 0" class="card-empty">{{ t("emptyPayments") }}</div>
        <div v-else class="space-y-3">
          <MetaListCard
            v-for="p in payments"
            :key="p.name"
            :title="p.payment_no || p.name"
            :description="`${p.payment_direction || '-'} / ${p.payment_purpose || '-'}`"
            :meta="fmtDate(p.payment_date)"
          >
            <template #trailing>
              <p class="text-xs text-slate-500">{{ paymentStatusLabel(p.status) }}</p>
            </template>
            <p class="mt-2 font-semibold text-slate-900">
              {{ fmtMoney(p.amount_try || p.amount, p.amount_try ? 'TRY' : p.currency) }}
            </p>
          </MetaListCard>
        </div>
      </SectionPanel>
    </template>

    <template v-else-if="activeTab === 'coverages'">
      <SectionPanel :title="t('coverageContext')">
        <FieldGroup :fields="coverageFieldGroups" :cols="2" />
      </SectionPanel>
      <SectionPanel :title="t('productProfileTitle')">
        <FieldGroup :fields="productProfileFieldGroups" :cols="2" />
      </SectionPanel>
      <SectionPanel :title="t('productReadinessTitle')">
        <FieldGroup :fields="productReadinessFieldGroups" :cols="3" />
      </SectionPanel>
    </template>

    <template v-else-if="activeTab === 'endorsements'">
      <SectionPanel :title="t('endorsementTitle')">
        <div v-if="endorsementLoading" class="card-empty">{{ t("loading") }}</div>
        <div v-else-if="endorsements.length === 0" class="card-empty">{{ t("emptyEndorsement") }}</div>
        <div v-else class="space-y-3">
          <MetaListCard
            v-for="e in endorsements"
            :key="e.name"
            :title="e.endorsement_type || '-'"
            :subtitle="fmtDate(e.endorsement_date)"
            :description="e.notes || '-'"
            :meta="`${t('version')}: v${e.snapshot_version || '-'}`"
          >
            <template #trailing>
              <p class="text-xs font-semibold" :class="endorsementStatusClass(e.status)">
                {{ endorsementStatusLabel(e.status) }}
              </p>
            </template>
          </MetaListCard>
        </div>
      </SectionPanel>
    </template>

    <template v-else>
      <SectionPanel :title="t('documents')">
        <template #trailing>
          <ActionButton
            v-if="canUploadDocuments"
            variant="secondary"
            size="sm"
            type="button"
            @click="openUploadModal"
          >
            {{ t("uploadDocument") }}
          </ActionButton>
          <button class="btn btn-sm" type="button" @click="openPolicyDocuments">{{ t("openDocumentCenter") }}</button>
        </template>
        <div v-if="fileLoading" class="card-empty">{{ t("loading") }}</div>
        <template v-else>
          <FieldGroup v-if="documentFieldGroups.length" :fields="documentFieldGroups" :cols="3" class="mb-4" />
          <template v-if="atDocuments.length">
            <div class="space-y-3">
              <MetaListCard
                v-for="d in atDocuments"
                :key="d.name"
                :title="d.display_name || d.file_name || d.name"
                :description="documentLabel(d)"
                :meta="d.document_date ? fmtDate(d.document_date) : fmtDateTime(d.creation)"
              >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <!-- is_sensitive: Red Lock Icon -->
                  <span v-if="d.is_sensitive" class="flex items-center" :title="t('sensitiveData')">
                      <svg class="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                      </svg>
                    </span>
                    <!-- is_verified: Green Check Icon -->
                    <span v-if="d.is_verified" class="flex items-center" :title="t('verified')">
                    <svg class="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  </span>
                  <ActionButton v-if="canArchiveDocument?.(d)" variant="secondary" size="xs" @click="archiveDocument(d)">
                    {{ t("archiveDocument") }}
                  </ActionButton>
                  <ActionButton v-if="canRestoreDocument?.(d)" variant="secondary" size="xs" @click="restoreDocument(d)">
                    {{ t("restoreDocument") }}
                  </ActionButton>
                  <ActionButton
                    v-if="canPermanentDeleteDocument?.(d)"
                    variant="secondary"
                    size="xs"
                    class="text-red-700"
                    @click="permanentDeleteDocument(d)"
                  >
                    {{ t("permanentDeleteDocument") }}
                  </ActionButton>
                  <button class="btn btn-sm" type="button" @click="openDocument(d)">{{ t("openDocument") }}</button>
                </div>
              </template>
                <p v-if="d.notes" class="mt-1 text-xs text-slate-500">{{ d.notes }}</p>
              </MetaListCard>
            </div>
          </template>
          <template v-else-if="files.length">
            <div class="space-y-3">
              <MetaListCard
                v-for="f in files"
                :key="f.name"
                :title="f.file_name || f.name"
                :description="fmtFileSize(f.file_size)"
                :meta="fmtDateTime(f.creation)"
              >
                <template #trailing>
                  <span v-if="f.is_private" class="badge badge-slate">{{ t("private") }}</span>
                  <button class="btn btn-sm" type="button" @click="openDocument(f)">{{ t("openDocument") }}</button>
                </template>
              </MetaListCard>
            </div>
          </template>
          <div v-else class="card-empty">{{ t("emptyDocuments") }}</div>
        </template>
      </SectionPanel>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";
import ActionButton from "../app-shell/ActionButton.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import FieldGroup from "../ui/FieldGroup.vue";
import StepBar from "../ui/StepBar.vue";
import { useAuthStore } from "../../stores/auth";
import { translateText } from "../../utils/i18n";
import { openDocumentInNewTab } from "../../utils/documentOpen";

const authStore = useAuthStore();
const activeLocale = computed(() => {
  const rawLocale = String(authStore.locale || "en").toLowerCase();
  return rawLocale.startsWith("tr") ? "tr" : "en";
});

function documentLabel(doc) {
  const raw = String(doc?.document_sub_type || doc?.document_kind || "").trim();
  if (!raw) return "-";

  const map = {
    Policy: "Policy",
    policy: "Policy",
    Endorsement: "Endorsement",
    endorsement: "Endorsement",
    Claim: "Claim",
    claim: "Claim",
    Other: "Other",
    other: "Other",
    Ruhsat: "Ruhsat",
    ruhsat: "Ruhsat",
    Kimlik: "Kimlik",
    kimlik: "Kimlik",
    "Poliçe Kopyası": "Poliçe Kopyası",
    "poliçe kopyası": "Poliçe Kopyası",
    "police kopyasi": "Poliçe Kopyası",
    "Hasar Fotoğrafı": "Hasar Fotoğrafı",
    "hasar fotoğrafı": "Hasar Fotoğrafı",
    "hasar fotografi": "Hasar Fotoğrafı",
    "Diğer": "Diğer",
    "diğer": "Diğer",
    diger: "Diğer",
  };

  const source = map[raw] || raw;
  return translateText(source, activeLocale.value);
}

async function openDocument(doc) {
  const opened = await openDocumentInNewTab(doc || {});
  if (opened) return;
  window.alert(activeLocale.value === "tr" ? "Dosya bağlantısı bulunamadı" : "File link not found");
}

defineProps({
  t: { type: Function, required: true },
  activeTab: { type: String, required: true },
  selectedSnapshotVersion: { type: [String, Number], default: "" },
  lifecycleSteps: { type: Array, required: true },
  lifecycleFields: { type: Array, required: true },
  timelineItems: { type: Array, required: true },
  timelineLoading: { type: Boolean, required: true },
  premiumFieldGroups: { type: Array, required: true },
  paymentLoading: { type: Boolean, required: true },
  payments: { type: Array, required: true },
  coverageFieldGroups: { type: Array, required: true },
  productProfileFieldGroups: { type: Array, required: true },
  productReadinessFieldGroups: { type: Array, required: true },
  endorsementLoading: { type: Boolean, required: true },
  endorsements: { type: Array, required: true },
  fileLoading: { type: Boolean, required: true },
  files: { type: Array, required: true },
  atDocuments: { type: Array, default: () => [] },
  documentFieldGroups: { type: Array, required: true },
  fmtDate: { type: Function, required: true },
  fmtDateTime: { type: Function, required: true },
  fmtMoney: { type: Function, required: true },
  paymentStatusLabel: { type: Function, required: true },
  endorsementStatusLabel: { type: Function, required: true },
  endorsementStatusClass: { type: Function, required: true },
  openQuickOwnershipAssignment: { type: Function, required: true },
  openPolicyDocuments: { type: Function, required: true },
  openUploadModal: { type: Function, required: true },
  canUploadDocuments: { type: Boolean, default: false },
  canArchiveDocument: { type: Function, default: null },
  canRestoreDocument: { type: Function, default: null },
  canPermanentDeleteDocument: { type: Function, default: null },
  archiveDocument: { type: Function, default: null },
  restoreDocument: { type: Function, default: null },
  permanentDeleteDocument: { type: Function, default: null },
  fmtFileSize: { type: Function, required: true },
});
</script>
