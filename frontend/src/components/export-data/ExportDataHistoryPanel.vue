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
      :rows="tableRows"
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
  { key: "rowCount", label: props.t("historyRows"), format: (value) => Number(value || 0).toLocaleString() },
  {
    key: "status",
    label: props.t("historyStatus"),
    type: "status",
    domain: "import_job",
  },
  {
    key: "_download",
    label: props.t("historyDownload"),
    type: "actions",
    align: "right",
  },
]);

const tableRows = computed(() =>
  props.historyRows.map((row) => ({
    ...row,
    _download: row.fileUrl && row.id
      ? [
          {
            key: "download",
            label: props.t("historyDownload"),
            variant: "secondary",
            onClick: () => {
              const params = new URLSearchParams({ export_job_name: row.id });
              window.open(
                `/api/method/acentem_takipte.acentem_takipte.platform.api.list_exports.download_export_file?${params.toString()}`,
                "_blank",
                "noopener,noreferrer",
              );
            },
          },
        ]
      : [],
  })),
);
</script>
