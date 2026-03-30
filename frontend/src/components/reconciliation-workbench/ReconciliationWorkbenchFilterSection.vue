<template>
  <SectionPanel :title="props.t('filtersTitle')" :count="`${props.activeFilterCount} ${props.t('activeFilters')}`" :meta="props.t('subtitle')">
    <WorkbenchFilterToolbar
      v-model="presetModel"
      :advanced-label="props.t('advancedFilters')"
      :collapse-label="props.t('hideAdvancedFilters')"
      :active-count="props.activeFilterCount"
      :active-count-label="props.t('activeFilters')"
      :preset-label="props.t('presetLabel')"
      :preset-options="props.presetOptions"
      :can-delete-preset="props.canDeletePreset"
      :save-label="props.t('savePreset')"
      :delete-label="props.t('deletePreset')"
      :apply-label="props.t('applyFilters')"
      :reset-label="props.t('clearFilters')"
      @preset-change="$emit('preset-change', $event)"
      @preset-save="$emit('preset-save', $event)"
      @preset-delete="$emit('preset-delete', $event)"
      @apply="$emit('apply')"
      @reset="$emit('reset')"
    >
      <select v-model="props.filters.status" class="input">
        <option value="Open">{{ props.t("statusOpen") }}</option>
        <option value="Resolved">{{ props.t("statusResolved") }}</option>
        <option value="Ignored">{{ props.t("statusIgnored") }}</option>
        <option value="">{{ props.t("allStatuses") }}</option>
      </select>
      <select v-model="props.filters.mismatchType" class="input">
        <option value="">{{ props.t("allTypes") }}</option>
        <option v-for="option in props.mismatchOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <template #advanced>
        <input
          v-model.trim="props.filters.sourceQuery"
          class="input"
          type="search"
          :placeholder="props.t('sourceSearchPlaceholder')"
          @keyup.enter="$emit('apply')"
        />
        <select v-model="props.filters.sourceDoctype" class="input">
          <option value="">{{ props.t("allSources") }}</option>
          <option v-for="option in props.sourceDoctypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model.number="props.filters.limit" class="input">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </template>
    </WorkbenchFilterToolbar>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import WorkbenchFilterToolbar from "../app-shell/WorkbenchFilterToolbar.vue";

const props = defineProps({
  t: { type: Function, required: true },
  filters: { type: Object, required: true },
  modelValue: { type: [String, Number], default: "" },
  presetOptions: { type: Array, default: () => [] },
  canDeletePreset: { type: Boolean, default: false },
  activeFilterCount: { type: Number, default: 0 },
  mismatchOptions: { type: Array, default: () => [] },
  sourceDoctypeOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue", "preset-change", "preset-save", "preset-delete", "apply", "reset"]);

const presetModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
