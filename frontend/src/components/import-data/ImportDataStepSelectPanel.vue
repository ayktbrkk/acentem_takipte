<template>
  <SectionPanel :title="t('step1Title')" panel-class="surface-card rounded-2xl p-5">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="form-field">
        <label class="form-label">{{ t("datasetLabel") }}</label>
        <select v-model="selectedDatasetModel" class="form-input">
          <option v-for="dataset in localizedDatasets" :key="dataset.key" :value="dataset.key">
            {{ dataset.label }}
          </option>
        </select>
      </div>

      <div class="form-field">
        <label class="form-label">{{ t("fileLabel") }}</label>
        <input class="form-input" type="file" accept=".xlsx,.xls,.csv" @change="$emit('file-select', $event)" />
        <p v-if="fileName" class="mt-1 text-xs text-gray-500">{{ t("selectedFile") }}: {{ fileName }}</p>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  localizedDatasets: {
    type: Array,
    required: true,
  },
  fileName: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "file-select"]);

const selectedDatasetModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
