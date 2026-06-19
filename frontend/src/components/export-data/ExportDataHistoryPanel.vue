<template>
  <SectionPanel :title="t('step3Title')" :show-count="false">
    <EmptyState
      v-if="!historyRows.length"
      compact
      :title="t('historyEmpty')"
      :description="t('historyEmptyHint')"
    />
    <ListTable
      v-else
      :columns="tableColumns"
      :rows="historyRows"
      :empty-message="t('historyEmpty')"
      :locale="locale"
      :clickable="false"
    />
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";

import EmptyState from "../app-shell/EmptyState.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";

const props = defineProps({
  historyRows: {
    type: Array,
    required: true,
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

const tableColumns = computed(() => [
  { key: "date", label: props.t("historyDate") },
  { key: "screenLabel", label: props.t("historyDataset") },
  { key: "format", label: props.t("historyFormat"), format: (value) => String(value || "").toUpperCase() },
  { key: "filename", label: props.t("historyFile") },
]);
</script>
