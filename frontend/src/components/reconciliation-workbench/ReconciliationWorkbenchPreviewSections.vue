<template>
  <SectionPanel :title="props.t('collectionPreviewTitle')" :count="props.collectionPreviewRows.length">
    <div v-if="props.workbenchLoading" class="mt-4">
      <SkeletonLoader variant="list" :rows="3" />
    </div>
    <div v-else-if="props.collectionPreviewRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="props.t('emptyCollectionPreviewTitle')" :description="props.t('emptyCollectionPreview')" compact />
    </div>
    <ul v-else class="space-y-2 text-sm">
      <MetaListCard
        v-for="row in props.collectionPreviewRows"
        :key="row.name"
        :title="row.payment_no || row.name"
        :description="`${row.customer || props.t('unspecified')} / ${row.policy || props.t('unspecified')}`"
        :meta="props.formatMoney(row.amount_try || row.amount)"
      >
        <template #trailing>
          <div class="text-right">
            <p class="text-xs text-slate-500">{{ props.t("dueDate") }}: {{ row.due_date || props.t("unspecified") }}</p>
            <p class="text-xs text-amber-700">{{ statusLabel(row.status) }}</p>
          </div>
        </template>
      </MetaListCard>
    </ul>
  </SectionPanel>

  <SectionPanel :title="props.t('commissionPreviewTitle')" :count="props.commissionPreviewRows.length">
    <div v-if="props.workbenchLoading" class="mt-4">
      <SkeletonLoader variant="list" :rows="3" />
    </div>
    <div v-else-if="props.commissionPreviewRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="props.t('emptyCommissionPreviewTitle')" :description="props.t('emptyCommissionPreview')" compact />
    </div>
    <div v-else>
      <div v-if="props.commissionAging" class="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>{{ props.t('commissionAgingSummary') }}</span>
          <span class="font-medium">{{ props.formatMoney(props.commissionAging.total_amount) }}</span>
        </div>
        <div class="flex h-3 gap-1 rounded-full overflow-hidden">
          <div v-if="props.commissionAging.buckets.current > 0"
               class="h-full bg-emerald-400"
               :style="{ width: `${pct(props.commissionAging.buckets.current)}%` }"
               :title="`${props.t('agingCurrent')}: ${props.formatMoney(props.commissionAging.buckets.current)}`" />
          <div v-if="props.commissionAging.buckets['1_30'] > 0"
               class="h-full bg-amber-400"
               :style="{ width: `${pct(props.commissionAging.buckets['1_30'])}%` }"
               :title="`${props.t('aging1to30')}: ${props.formatMoney(props.commissionAging.buckets['1_30'])}`" />
          <div v-if="props.commissionAging.buckets['31_60'] > 0"
               class="h-full bg-orange-400"
               :style="{ width: `${pct(props.commissionAging.buckets['31_60'])}%` }"
               :title="`${props.t('aging31to60')}: ${props.formatMoney(props.commissionAging.buckets['31_60'])}`" />
          <div v-if="props.commissionAging.buckets['61_90'] > 0"
               class="h-full bg-red-400"
               :style="{ width: `${pct(props.commissionAging.buckets['61_90'])}%` }"
               :title="`${props.t('aging61to90')}: ${props.formatMoney(props.commissionAging.buckets['61_90'])}`" />
          <div v-if="props.commissionAging.buckets['90_plus'] > 0"
               class="h-full bg-red-600"
               :style="{ width: `${pct(props.commissionAging.buckets['90_plus'])}%` }"
               :title="`${props.t('aging90plus')}: ${props.formatMoney(props.commissionAging.buckets['90_plus'])}`" />
        </div>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span v-if="props.commissionAging.buckets.current > 0" class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            {{ props.t('agingCurrentLabel') }}: {{ props.formatMoney(props.commissionAging.buckets.current) }}
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-amber-400" />
            {{ props.t('aging1to30Label') }}: {{ props.formatMoney(props.commissionAging.buckets['1_30']) }}
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-orange-400" />
            {{ props.t('aging31to60Label') }}: {{ props.formatMoney(props.commissionAging.buckets['31_60']) }}
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-red-400" />
            {{ props.t('aging61to90Label') }}: {{ props.formatMoney(props.commissionAging.buckets['61_90']) }}
          </span>
          <span class="flex items-center gap-1">
            <span class="inline-block h-2 w-2 rounded-full bg-red-600" />
            {{ props.t('aging90plusLabel') }}: {{ props.formatMoney(props.commissionAging.buckets['90_plus']) }}
          </span>
        </div>
      </div>
      <ul class="space-y-2 text-sm">
        <MetaListCard
          v-for="row in props.commissionPreviewRows"
          :key="row.name"
          :title="row.policy_no || row.name"
          :description="`${row.customer || props.t('unspecified')} / ${row.insurance_company || props.t('unspecified')}`"
          :meta="props.formatMoney(row.commission_amount_try || row.commission_amount)"
        >
          <template #trailing>
            <div class="text-right">
              <p class="text-xs text-slate-500">{{ row.office_branch || props.t('unspecified') }}</p>
              <p class="text-xs text-brand-700">{{ statusLabel(row.status) }}</p>
            </div>
          </template>
        </MetaListCard>
      </ul>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";

const PREVIEW_STATUS_KEYS = {
  overdue: "previewStatus_overdue",
  open: "previewStatus_open",
  pending: "previewStatus_pending",
  paid: "previewStatus_paid",
  accrued: "previewStatus_accrued",
};

const props = defineProps({
  t: { type: Function, required: true },
  workbenchLoading: { type: Boolean, default: false },
  collectionPreviewRows: { type: Array, default: () => [] },
  commissionPreviewRows: { type: Array, default: () => [] },
  commissionAging: { type: Object, default: null },
  formatMoney: { type: Function, required: true },
  locale: { type: String, default: "en" },
});

function pct(value) {
  const total = props.commissionAging?.total_amount || 1;
  return Math.max(0, Math.round((Number(value || 0) / total) * 100));
}

function statusLabel(value) {
  const text = String(value || "").trim();
  if (!text) return props.t("unspecified");
  const translationKey = PREVIEW_STATUS_KEYS[text.toLowerCase()];
  if (translationKey) return props.t(translationKey);
  return text;
}
</script>
