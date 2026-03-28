<template>
  <button class="btn btn-outline btn-sm" type="button" :disabled="isLoading" @click="$emit('refresh')">
    {{ refreshLabel }}
  </button>
  <button
    v-if="canExportSnapshotRows"
    class="btn btn-outline btn-sm"
    type="button"
    @click="$emit('export-snapshot-rows')"
  >
    {{ exportCsvLabel }}
  </button>
  <button class="btn btn-outline btn-sm" type="button" :disabled="isLoading" @click="$emit('download-xlsx')">
    {{ exportXlsxLabel }}
  </button>
  <button class="btn btn-outline btn-sm" type="button" :disabled="isLoading" @click="$emit('download-pdf')">
    {{ exportPdfLabel }}
  </button>
  <QuickCreateLauncher
    v-if="auxQuickCreateLabel && canLaunchAuxQuickCreate"
    variant="primary"
    size="sm"
    :label="auxQuickCreateLabel"
    @launch="$emit('launch-quick-create')"
  />
  <ActionButton
    v-for="action in visibleToolbarActions"
    :key="action.key || action.routeName || localize(action.label)"
    variant="secondary"
    size="sm"
    @click="$emit('run-toolbar-action', action)"
  >
    {{ localize(action.label) || panelLabel }}
  </ActionButton>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import QuickCreateLauncher from "../app-shell/QuickCreateLauncher.vue";

defineProps({
  isLoading: { type: Boolean, default: false },
  canExportSnapshotRows: { type: Boolean, default: false },
  canLaunchAuxQuickCreate: { type: Boolean, default: false },
  auxQuickCreateLabel: { type: String, default: "" },
  refreshLabel: { type: String, default: "" },
  exportCsvLabel: { type: String, default: "" },
  exportXlsxLabel: { type: String, default: "" },
  exportPdfLabel: { type: String, default: "" },
  panelLabel: { type: String, default: "" },
  visibleToolbarActions: { type: Array, default: () => [] },
  localize: { type: Function, required: true },
});

defineEmits([
  "refresh",
  "export-snapshot-rows",
  "download-xlsx",
  "download-pdf",
  "launch-quick-create",
  "run-toolbar-action",
]);
</script>
