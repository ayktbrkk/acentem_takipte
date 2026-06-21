<template>
  <SectionPanel :title="t('step3Title')" :show-count="false">
    <SkeletonLoader
      v-if="loading && !previewRows.length && !tableRows.length"
      variant="list"
      :rows="6"
    />
    <EmptyState
      v-else-if="!previewRows.length && !loading"
      compact
      :title="t('previewEmpty')"
      :description="t('previewEmptyHint')"
    />
    <ListTable
      v-else-if="useWorkbenchTable || usePolicyTable"
      :columns="tableColumns"
      :rows="tableRows"
      :loading="loading"
      :empty-message="t('previewEmpty')"
      :locale="locale"
      :clickable="false"
    />
    <div v-else-if="previewRows.length" class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr>
            <th class="table-header">{{ t("rowStatusLabel") }}</th>
            <th v-for="head in columns" :key="head" class="table-header">{{ head }}</th>
            <th class="table-header">{{ t("errorMessageLabel") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in previewRows" :key="rowIndex">
            <td class="table-cell">
              <StatusBadge :status="row.row_status" domain="import_row" :locale="locale" />
            </td>
            <td v-for="head in columns" :key="`${rowIndex}-${head}`" class="table-cell">
              {{ formatCell(row[head]) }}
            </td>
            <td class="table-cell text-at-red">{{ formatCell(row.error_message) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="importMessage" class="qc-success-banner mt-4" role="status" aria-live="polite">
      <p class="qc-success-banner__text">{{ importMessage }}</p>
    </div>
  </SectionPanel>
</template>

<script setup>
import EmptyState from "../app-shell/EmptyState.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";
import StatusBadge from "../ui/StatusBadge.vue";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  previewRows: {
    type: Array,
    required: true,
  },
  tableColumns: {
    type: Array,
    default: () => [],
  },
  tableRows: {
    type: Array,
    default: () => [],
  },
  usePolicyTable: {
    type: Boolean,
    default: false,
  },
  useWorkbenchTable: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  locale: {
    type: String,
    default: "tr",
  },
  importMessage: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

function formatCell(value) {
  if (value == null || value === "") {
    return props.t("unspecified");
  }
  return value;
}
</script>
