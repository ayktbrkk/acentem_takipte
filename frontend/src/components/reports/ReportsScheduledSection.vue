<template>
  <SectionPanel
    v-if="canManageScheduledReports"
    :title="t('scheduledTitle')"
    :meta="t('scheduledSubtitle')"
    :count="scheduledReports.length"
  >
    <ScheduledReportsManager
      :items="scheduledReports"
      :loading="scheduledLoading"
      :running="scheduledRunLoading"
      :locale="activeLocale"
      :report-catalog="reportCatalog"
      :active-office-branch="activeOfficeBranch"
      @run="$emit('run')"
      @save="$emit('save', $event)"
      @remove="$emit('remove', $event)"
    />
    <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
      <div class="space-y-1">
        <h4 class="text-sm font-semibold text-slate-900">{{ t("segmentSnapshotTitle") }}</h4>
        <p class="text-xs text-slate-500">{{ t("segmentSnapshotHint") }}</p>
      </div>
      <ActionButton
        variant="secondary"
        size="sm"
        data-testid="run-segment-snapshot-job"
        :disabled="snapshotRunLoading"
        @click="$emit('run-segment-snapshots')"
      >
        {{ snapshotRunLoading ? t("runningSegmentSnapshots") : t("runSegmentSnapshots") }}
      </ActionButton>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import ScheduledReportsManager from "./ScheduledReportsManager.vue";

defineProps({
  t: {
    type: Function,
    required: true,
  },
  canManageScheduledReports: {
    type: Boolean,
    default: false,
  },
  scheduledReports: {
    type: Array,
    default: () => [],
  },
  scheduledLoading: {
    type: Boolean,
    default: false,
  },
  scheduledRunLoading: {
    type: Boolean,
    default: false,
  },
  snapshotRunLoading: {
    type: Boolean,
    default: false,
  },
  activeLocale: {
    type: String,
    default: "en",
  },
  reportCatalog: {
    type: Object,
    default: () => ({}),
  },
  activeOfficeBranch: {
    type: String,
    default: "",
  },
});

defineEmits(["run", "save", "remove", "run-segment-snapshots"]);
</script>
