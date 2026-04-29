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
        <input
          ref="fileInput"
          class="hidden"
          type="file"
          accept=".xlsx,.xls,.csv"
          @change="$emit('file-select', $event)"
        />
        <button type="button" class="file-trigger" @click="openFilePicker">
          <span class="file-trigger__label">{{ t("chooseFile") }}</span>
          <span class="file-trigger__hint">{{ t("chooseFileHint") }}</span>
        </button>
        <p v-if="fileName" class="mt-2 text-xs font-medium text-slate-600">{{ t("selectedFile") }}: {{ fileName }}</p>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed, ref } from "vue";

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
const fileInput = ref(null);

const selectedDatasetModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

function openFilePicker() {
  fileInput.value?.click();
}
</script>

<style scoped>
.file-trigger {
  width: 100%;
  border: 1px dashed rgb(148 163 184 / 0.7);
  border-radius: 0.875rem;
  background: linear-gradient(180deg, rgb(248 250 252) 0%, rgb(255 255 255) 100%);
  padding: 0.875rem 1rem;
  text-align: left;
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
}

.file-trigger:hover {
  border-color: rgb(27 93 184 / 0.55);
  background: rgb(248 250 252);
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
}

.file-trigger__label {
  display: block;
  color: rgb(15 23 42);
  font-size: 0.875rem;
  font-weight: 600;
}

.file-trigger__hint {
  display: block;
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.75rem;
}
</style>
