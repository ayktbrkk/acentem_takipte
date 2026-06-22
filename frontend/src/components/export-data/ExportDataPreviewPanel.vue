<template>
  <SectionPanel v-if="showPanel" :title="t('previewTitle')" :show-count="false">
    <p class="mb-4 text-sm text-slate-600">{{ t("previewHint") }}</p>
    <SkeletonLoader v-if="loading && !rows.length && !error" variant="list" :rows="6" />
    <div
      v-else-if="error"
      class="rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 flex flex-wrap items-center justify-between gap-4"
      role="alert"
      aria-live="polite"
    >
      <div>
        <p class="text-sm font-semibold text-at-red">{{ t("loadErrorTitle") }}</p>
        <p class="mt-1 text-sm text-at-red/90">{{ error }}</p>
      </div>
      <ActionButton variant="secondary" size="sm" @click="$emit('retry')">
        {{ t("retry") }}
      </ActionButton>
    </div>
    <ListTable
      v-else
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :empty-message="t('previewEmpty')"
      :locale="locale"
      :clickable="false"
    />
  </SectionPanel>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";

defineProps({
  showPanel: {
    type: Boolean,
    default: false,
  },
  columns: {
    type: Array,
    default: () => [],
  },
  rows: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
  locale: {
    type: String,
    default: "tr",
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["retry"]);
</script>
