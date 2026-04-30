<template>
  <div class="flex items-center gap-2">
    <ActionButton variant="secondary" size="sm" :disabled="isLoading" @click="$emit('refresh')">
      <FeatherIcon name="refresh-cw" :class="['h-4 w-4', isLoading && 'animate-spin']" />
      {{ refreshLabel }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="isLoading" @click="$emit('download-xlsx')">
      <FeatherIcon name="download" class="h-4 w-4" />
      {{ exportXlsxLabel }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="isLoading" @click="$emit('download-pdf')">
      <FeatherIcon name="file-text" class="h-4 w-4" />
      {{ exportPdfLabel }}
    </ActionButton>
    <ActionButton
      v-if="auxQuickCreateLabel && canLaunchAuxQuickCreate"
      variant="primary"
      size="sm"
      @click="$emit('launch-quick-create')"
    >
      <FeatherIcon name="plus" class="h-4 w-4" />
      {{ auxQuickCreateLabel }}
    </ActionButton>

    <div v-if="visibleToolbarActions.length > 0" class="h-4 w-px bg-slate-200 mx-1"></div>

    <ActionButton
      v-for="action in visibleToolbarActions"
      :key="action.key || action.routeName || localize(action.label)"
      :variant="action.variant || 'secondary'"
      size="sm"
      @click="$emit('run-toolbar-action', action)"
    >
      {{ localize(action.label) || panelLabel }}
    </ActionButton>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";
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
