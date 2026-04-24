<template>
  <SectionPanel :title="t('step3Title')" panel-class="surface-card rounded-2xl p-5">
    <div v-if="!previewRows.length" class="card-empty">{{ t("previewEmpty") }}</div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr>
            <th v-for="head in columns" :key="head" class="table-header">{{ head }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in previewRows" :key="rowIndex">
            <td v-for="head in columns" :key="`${rowIndex}-${head}`" class="table-cell">
              {{ row[head] ?? "-" }}
            </td>
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

defineProps({
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
</script>
