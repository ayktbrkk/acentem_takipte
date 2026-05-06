<template>
  <SectionPanel :title="t('step2Title')" panel-class="surface-card rounded-2xl p-5">
    <div v-if="!columns.length" class="card-empty">{{ t("mappingEmpty") }}</div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr>
            <th class="table-header">{{ t("excelColumn") }}</th>
            <th class="table-header">{{ t("systemField") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="col in columns" :key="col">
            <td class="table-cell">{{ col }}</td>
            <td class="table-cell">
              <select v-model="columnMapping[col]" class="input">
                <option value="">{{ t("selectOption") }}</option>
                <option v-for="field in selectedFieldOptions" :key="field.value" :value="field.value">
                  {{ field.label }}
                </option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  columns: {
    type: Array,
    required: true,
  },
  columnMapping: {
    type: Object,
    required: true,
  },
  selectedFieldOptions: {
    type: Array,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
