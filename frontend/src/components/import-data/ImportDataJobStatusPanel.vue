<template>
  <SectionPanel :title="t('jobStatusTitle')" panel-class="surface-card rounded-2xl p-5">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
      <div>
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("status") }}</p>
        <p class="text-sm font-semibold text-slate-900">{{ jobStatus || "-" }}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("createdLabel") }}</p>
        <p class="text-sm font-semibold text-slate-900">{{ resultSummary.created ?? 0 }}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("skippedLabel") }}</p>
        <p class="text-sm font-semibold text-slate-900">{{ resultSummary.skipped ?? 0 }}</p>
      </div>
      <div>
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("errorLabel") }}</p>
        <p class="text-sm font-semibold text-slate-900">{{ resultSummary.failed ?? 0 }}</p>
      </div>
    </div>
    <a
      v-if="errorLogFile"
      :href="errorLogFile"
      class="mt-4 inline-flex text-sm font-medium text-brand-700 hover:text-brand-800"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ t("downloadErrorLog") }}
    </a>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  jobStatus: {
    type: String,
    default: "",
  },
  resultSummary: {
    type: Object,
    default: () => ({}),
  },
  errorLogFile: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
