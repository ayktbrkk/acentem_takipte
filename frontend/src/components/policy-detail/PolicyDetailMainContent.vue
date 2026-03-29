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
          <button class="btn btn-sm" type="button" @click="openPolicyDocuments">{{ t("open") }}</button>
        </template>
        <div v-if="fileLoading" class="card-empty">{{ t("loading") }}</div>
        <div v-else-if="files.length === 0" class="card-empty">{{ t("emptyFiles") }}</div>
        <div v-else class="space-y-3">
          <FieldGroup :fields="documentFieldGroups" :cols="3" />
          <MetaListCard v-for="f in files" :key="f.name" :title="f.file_name || f.name" :meta="fmtDateTime(f.creation)">
            <template #trailing>
              <a class="btn btn-sm" :href="f.file_url || '#'" target="_blank" rel="noreferrer">{{ t("open") }}</a>
            </template>
          </MetaListCard>
        </div>
      </SectionPanel>
    </template>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import FieldGroup from "../ui/FieldGroup.vue";
import StepBar from "../ui/StepBar.vue";

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
  documentFieldGroups: { type: Array, required: true },
  fmtDate: { type: Function, required: true },
  fmtDateTime: { type: Function, required: true },
  fmtMoney: { type: Function, required: true },
  paymentStatusLabel: { type: Function, required: true },
  endorsementStatusLabel: { type: Function, required: true },
  endorsementStatusClass: { type: Function, required: true },
  openQuickOwnershipAssignment: { type: Function, required: true },
  openPolicyDocuments: { type: Function, required: true },
});
</script>
