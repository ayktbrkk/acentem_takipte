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
    <ul v-else class="space-y-2 text-sm">
      <MetaListCard
        v-for="row in props.commissionPreviewRows"
        :key="row.name"
        :title="row.policy_no || row.name"
        :description="`${row.customer || props.t('unspecified')} / ${row.insurance_company || props.t('unspecified')}`"
        :meta="props.formatMoney(row.commission_amount_try || row.commission_amount)"
      >
        <template #trailing>
          <div class="text-right">
            <p class="text-xs text-slate-500">{{ row.office_branch || props.t("unspecified") }}</p>
            <p class="text-xs text-brand-700">{{ statusLabel(row.status) }}</p>
          </div>
        </template>
      </MetaListCard>
    </ul>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";
import { translateText } from "@/utils/i18n";

const props = defineProps({
  t: { type: Function, required: true },
  workbenchLoading: { type: Boolean, default: false },
  collectionPreviewRows: { type: Array, default: () => [] },
  commissionPreviewRows: { type: Array, default: () => [] },
  formatMoney: { type: Function, required: true },
  locale: { type: String, default: "en" },
});

function statusLabel(value) {
  const text = String(value || "").trim();
  if (!text) return props.t("unspecified");
  return translateText(text, props.locale);
}
</script>
