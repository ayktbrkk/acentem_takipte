<template>
  <div class="flex items-center gap-2">
    <ActionButton
      variant="secondary"
      size="sm"
      :loading="isLoading"
      @click="$emit('refresh')"
    >
      {{ refreshLabel }}
    </ActionButton>
    <ActionButton
      v-if="canExportSnapshotRows"
      variant="secondary"
      size="sm"
      @click="$emit('export-snapshot-rows')"
    >
      {{ exportCsvLabel }}
    </ActionButton>
    <ActionButton
      variant="secondary"
      size="sm"
      :disabled="isLoading"
      @click="$emit('download-xlsx')"
    >
      {{ exportXlsxLabel }}
    </ActionButton>
    <ActionButton
      variant="secondary"
      size="sm"
      :disabled="isLoading"
      @click="$emit('download-pdf')"
    >
      {{ exportPdfLabel }}
    </ActionButton>
    <ActionButton
      v-if="auxQuickCreateLabel && canLaunchAuxQuickCreate"
      variant="primary"
      size="sm"
      @click="$emit('launch-quick-create')"
    >
      + {{ auxQuickCreateLabel }}
    </ActionButton>
    <ActionButton
      v-for="action in visibleToolbarActions"
      :key="action.key || action.routeName || localize(action.label)"
      variant="secondary"
      size="sm"
      @click="$emit('run-toolbar-action', action)"
    >
      {{ localize(action.label) || panelLabel }}
    </ActionButton>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

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
