<template>
  <SectionPanel :title="t('step2Title')" :show-count="false">
    <div v-if="requiredFields.length" class="mb-3 rounded-lg border border-at-amber/25 bg-at-amber/5 px-3 py-2">
      <p class="text-xs font-semibold text-slate-700">{{ t("requiredFieldsLabel") }}</p>
      <p class="text-xs text-slate-500 mt-1">
        <span v-for="(field, idx) in requiredFields" :key="field.value">
          <span class="font-medium text-at-amber">{{ field.label }}</span>
          <span v-if="idx < requiredFields.length - 1">, </span>
        </span>
      </p>
    </div>

    <div
      v-if="duplicateFields.length"
      class="mb-3 rounded-lg border border-at-red/20 bg-at-red/5 px-3 py-2"
      role="alert"
    >
      <p class="text-xs font-semibold text-at-red">{{ t("duplicateMappingLabel") }}</p>
      <p class="text-xs text-at-red/80 mt-1">
        {{ t("duplicateMappingHint", { fields: duplicateFields.join(", ") }) }}
      </p>
    </div>

    <EmptyState v-if="!columns.length" compact :title="t('mappingEmpty')" />
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
              <select v-model="columnMapping[col]" class="form-input">
                <option value="">{{ t("selectOption") }}</option>
                <option v-for="field in selectedFieldOptions" :key="field.value" :value="field.value">
                  {{ field.label }}{{ field.required ? " *" : "" }}
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
import { computed } from "vue";

import EmptyState from "../app-shell/EmptyState.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
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
  requiredFields: {
    type: Array,
    default: () => [],
  },
  t: {
    type: Function,
    required: true,
  },
});

const duplicateFields = computed(() => {
  const seen = {};
  const dupes = [];
  Object.entries(props.columnMapping).forEach(([col, field]) => {
    if (!field) return;
    if (seen[field]) {
      if (!dupes.includes(field)) dupes.push(field);
    }
    seen[field] = true;
  });
  return dupes;
});
</script>
