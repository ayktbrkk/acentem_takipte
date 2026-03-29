<template>
  <SectionPanel :title="t('validatePanelTitle')" panel-class="surface-card rounded-2xl p-5">
    <div class="grid gap-3 md:grid-cols-2">
      <label class="flex flex-col gap-1">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("accessType") }}</span>
        <select v-model="validation.accessType" class="input">
          <option v-for="option in accessTypeOptions" :key="`validate-${option.value}`" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("referenceDoctype") }}</span>
        <input v-model.trim="validation.referenceDoctype" class="input" type="text" :placeholder="t('referenceDoctypePlaceholder')" />
      </label>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <button class="btn btn-outline btn-sm" type="button" :disabled="validating" @click="$emit('validate')">
        {{ validating ? t("validating") : t("validate") }}
      </button>
      <p v-if="validationMessage" class="text-sm" :class="validationOk ? 'text-emerald-700' : 'text-amber-700'">
        {{ validationMessage }}
      </p>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  validation: {
    type: Object,
    required: true,
  },
  accessTypeOptions: {
    type: Array,
    required: true,
  },
  validationMessage: {
    type: String,
    default: "",
  },
  validationOk: {
    type: Boolean,
    default: false,
  },
  validating: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["validate"]);
</script>
