<template>
  <SectionPanel :title="t('jobHistoryTitle')" :count="jobs.length">
    <EmptyState
      v-if="!jobs.length"
      compact
      :title="t('jobHistoryEmpty')"
      :description="t('jobHistoryEmptyHint')"
    />
    <ListTable
      v-else
      :columns="tableColumns"
      :rows="tableRows"
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
  jobs: {
    type: Array,
    default: () => [],
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

const emit = defineEmits(["cancel-job"]);

const tableColumns = computed(() => [
  { key: "job_name", label: props.t("jobIdLabel") },
  { key: "dataset", label: props.t("datasetLabel") },
  { key: "status", label: props.t("status"), type: "status", domain: "import_job" },
  { key: "created_count", label: props.t("createdLabel") },
  { key: "_actions", label: props.t("actionsLabel"), type: "actions", align: "right" },
]);

const tableRows = computed(() =>
  props.jobs.map((job) => ({
    ...job,
    created_count: job.result_summary?.created ?? 0,
    _actions: canCancel(job.status)
      ? [
          {
            key: "cancel",
            label: props.t("cancelJobAction"),
            variant: "secondary",
            onClick: () => emit("cancel-job", job.job_name),
          },
        ]
      : [],
  })),
);

function canCancel(status) {
  return ["Draft", "Previewed", "Queued"].includes(String(status || ""));
}
</script>
