<template>
  <SectionPanel :title="t('step3Title')" panel-class="surface-card rounded-2xl p-5">
    <div v-if="!previewRows.length" class="card-empty">{{ t("previewEmpty") }}</div>
    <div v-else class="overflow-x-auto">
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
              <span :class="statusClass(row.row_status)">{{ statusLabel(row.row_status) }}</span>
            </td>
            <td v-for="head in columns" :key="`${rowIndex}-${head}`" class="table-cell">
              {{ row[head] ?? "-" }}
            </td>
            <td class="table-cell text-rose-700">{{ row.error_message || "-" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="importMessage" class="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-brand-700">
      {{ importMessage }}
    </p>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  previewRows: {
    type: Array,
    required: true,
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

function statusLabel(status) {
  if (status === "ready") return props.t("readyLabel");
  if (status === "skipped") return props.t("skippedLabel");
  return props.t("errorLabel");
}

function statusClass(status) {
  if (status === "ready") return "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700";
  if (status === "skipped") return "inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700";
  return "inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700";
}
</script>
