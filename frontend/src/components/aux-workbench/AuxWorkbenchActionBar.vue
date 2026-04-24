  <div class="flex items-center gap-2">
    <button class="btn btn-outline" :disabled="isLoading" @click="$emit('download-xlsx')">
      <FeatherIcon name="download" class="h-4 w-4" />
      {{ exportXlsxLabel }}
    </button>
    <button
      v-if="auxQuickCreateLabel && canLaunchAuxQuickCreate"
      class="btn btn-primary"
      @click="$emit('launch-quick-create')"
    >
      <FeatherIcon name="plus" class="h-4 w-4" />
      {{ auxQuickCreateLabel }}
    </button>
    <button class="btn btn-outline" :disabled="isLoading" @click="$emit('refresh')">
      <FeatherIcon name="refresh-cw" :class="['h-4 w-4', isLoading && 'animate-spin']" />
    </button>

    <div v-if="visibleToolbarActions.length > 0" class="h-4 w-px bg-gray-200 mx-1"></div>

    <button
      v-for="action in visibleToolbarActions"
      :key="action.key || action.routeName || localize(action.label)"
      class="btn btn-outline"
      @click="$emit('run-toolbar-action', action)"
    >
      {{ localize(action.label) || panelLabel }}
    </button>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

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
