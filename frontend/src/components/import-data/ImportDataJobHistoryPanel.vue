<template>
  <SectionPanel :title="t('jobHistoryTitle')" panel-class="surface-card rounded-2xl p-5">
    <div class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr>
            <th class="table-header">{{ t("jobIdLabel") }}</th>
            <th class="table-header">{{ t("datasetLabel") }}</th>
            <th class="table-header">{{ t("status") }}</th>
            <th class="table-header">{{ t("createdLabel") }}</th>
            <th class="table-header">{{ t("actionsLabel") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in jobs" :key="job.job_name">
            <td class="table-cell font-medium">{{ job.job_name }}</td>
            <td class="table-cell">{{ job.dataset }}</td>
            <td class="table-cell">{{ job.status }}</td>
            <td class="table-cell">{{ job.result_summary?.created ?? 0 }}</td>
            <td class="table-cell">
              <button
                v-if="canCancel(job.status)"
                type="button"
                class="text-sm font-medium text-rose-700 hover:text-rose-800"
                @click="$emit('cancel-job', job.job_name)"
              >
                {{ t("cancelJobAction") }}
              </button>
              <span v-else class="text-slate-400">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  jobs: {
    type: Array,
    default: () => [],
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["cancel-job"]);

function canCancel(status) {
  return ["Draft", "Previewed", "Queued"].includes(String(status || ""));
}
</script>
