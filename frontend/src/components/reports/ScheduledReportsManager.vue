<template>
  <article class="surface-card rounded-2xl p-5">
    <ScheduledReportsListPanel
      :items="items"
      :loading="loading"
      :running="running"
      :t="t"
      :report-label="reportLabel"
      :delivery-channel-label="deliveryChannelLabel"
      :format-last-run="formatLastRun"
      :last-status-label="lastStatusLabel"
      :format-filters="formatFilters"
      @run="$emit('run')"
      @new="beginCreate"
      @edit="beginEdit"
      @remove="askRemove"
    />

    <ScheduledReportsFormPanel
      :form="form"
      :form-error="formError"
      :report-options="reportOptions"
      :is-filter-visible="isFilterVisible"
      :t="t"
      @cancel="resetForm"
      @submit="submit"
    />
  </article>
</template>

<script setup>
import ScheduledReportsFormPanel from "./ScheduledReportsFormPanel.vue";
import ScheduledReportsListPanel from "./ScheduledReportsListPanel.vue";
import { useScheduledReportsManager } from "@/composables/useScheduledReportsManager";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  running: {
    type: Boolean,
    default: false,
  },
  locale: {
    type: String,
    default: "tr",
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

const emit = defineEmits(["run", "save", "remove"]);

const {
  form,
  formError,
  reportOptions,
  isFilterVisible,
  t,
  resetForm,
  beginCreate,
  beginEdit,
  submit,
  askRemove,
  reportLabel,
  deliveryChannelLabel,
  formatLastRun,
  lastStatusLabel,
  formatFilters,
} = useScheduledReportsManager({
  locale: props.locale,
  reportCatalog: props.reportCatalog,
  activeOfficeBranch: props.activeOfficeBranch,
  emitSave: (payload) => emit("save", payload),
  emitRemove: (index) => emit("remove", index),
});
</script>
