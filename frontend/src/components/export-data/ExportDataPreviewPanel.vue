<template>
  <SectionPanel v-if="showPanel" :title="t('exportStepTitle')" :show-count="false">
    <p class="mb-4 text-sm text-slate-600">{{ t("previewHint") }}</p>
    <ListTable
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
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";

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
  locale: {
    type: String,
    default: "tr",
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
