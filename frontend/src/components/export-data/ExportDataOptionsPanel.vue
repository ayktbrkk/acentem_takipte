<template>
  <SectionPanel :title="t('step1Title')">
    <div class="grid gap-4 md:grid-cols-3">
      <div class="form-field">
        <label class="form-label" :for="datasetId">{{ t("datasetLabel") }}</label>
        <select :id="datasetId" v-model="form.screen" class="form-input">
          <option v-for="option in screenOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>

      <div class="form-field">
        <label class="form-label" :for="formatId">{{ t("formatLabel") }}</label>
        <select :id="formatId" v-model="form.format" class="form-input">
          <option value="xlsx">{{ t("formatXlsx") }}</option>
          <option value="pdf">{{ t("formatPdf") }}</option>
          <option value="csv">{{ t("formatCsv") }}</option>
        </select>
      </div>

      <div class="form-field">
        <label class="form-label" :for="filenameId">{{ t("filenameLabel") }}</label>
        <input :id="filenameId" v-model="form.filename" class="form-input" type="text" :placeholder="t('filenamePlaceholder')" />
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import { useId } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  form: {
    type: Object,
    required: true,
  },
  screenOptions: {
    type: Array,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

const datasetId = useId();
const formatId = useId();
const filenameId = useId();
</script>
