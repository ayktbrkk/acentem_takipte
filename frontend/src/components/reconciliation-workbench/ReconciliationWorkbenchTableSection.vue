<template>
  <SectionPanel :title="props.t('reconciliationListTitle')" :count="props.reconciliationListRows.length" :meta="props.t('subtitle')">
    <template #trailing>
      <p class="text-xs text-slate-500">{{ props.t("showing") }} {{ props.shownCount }} / {{ props.totalCount }}</p>
    </template>

    <div v-if="props.fetchTruncated" class="mt-4 rounded-xl border border-at-amber/20 bg-at-amber/5 px-4 py-3 text-sm font-medium text-at-amber" role="status">
      {{ props.t("fetchLimitWarning") }}
    </div>

    <div v-if="props.workbenchLoading" class="mt-4">
      <SkeletonLoader variant="list" :rows="6" />
    </div>
    <div
      v-else-if="props.workbenchErrorText"
      class="mt-4 rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 flex items-center justify-between gap-4"
      role="alert"
      aria-live="polite"
    >
      <div>
        <p class="text-sm font-semibold text-at-red">{{ props.t("loadErrorTitle") }}</p>
        <p class="mt-1 text-sm text-at-red/90">{{ props.workbenchErrorText }}</p>
      </div>
      <ActionButton variant="secondary" size="sm" @click="$emit('retry')">
        {{ props.t("retry") }}
      </ActionButton>
    </div>
    <div v-else-if="props.rows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="props.t('emptyTitle')" :description="props.t('empty')" />
    </div>
    <div v-else class="mt-4 space-y-4">
      <ListTable
        :columns="props.reconciliationListColumns"
        :rows="props.reconciliationListRows"
        :locale="props.locale"
        :loading="false"
        :empty-message="props.t('empty')"
        @row-click="$emit('row-click', $event)"
      />
      <ListPager
        :shown="props.shownCount"
        :total="props.totalCount"
        :page="props.page"
        :has-next="props.hasNextPage"
        :showing-label="props.t('showingRecords')"
        @previous="$emit('previous-page')"
        @next="$emit('next-page')"
      />
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import ListPager from "../app-shell/ListPager.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";
import ListTable from "../ui/ListTable.vue";

const props = defineProps({
  t: { type: Function, required: true },
  workbenchLoading: { type: Boolean, default: false },
  workbenchErrorText: { type: String, default: "" },
  rows: { type: Array, default: () => [] },
  locale: { type: String, default: "en" },
  reconciliationListColumns: { type: Array, default: () => [] },
  reconciliationListRows: { type: Array, default: () => [] },
  page: { type: Number, default: 1 },
  shownCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  hasNextPage: { type: Boolean, default: false },
  fetchTruncated: { type: Boolean, default: false },
});

defineEmits(["row-click", "retry", "previous-page", "next-page"]);
</script>
