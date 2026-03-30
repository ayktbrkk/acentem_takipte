<template>
  <article class="surface-card rounded-2xl p-5">
    <WorkbenchFilterToolbar
      v-model="presetModel"
      :advanced-label="t('advancedFilters')"
      :collapse-label="t('hideAdvancedFilters')"
      :active-count="activeCount"
      :active-count-label="t('activeFilters')"
      :preset-label="t('presetLabel')"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :save-label="t('savePreset')"
      :delete-label="t('deletePreset')"
      :apply-label="t('applyFilters')"
      :reset-label="t('clearFilters')"
      @preset-change="$emit('preset-change', $event)"
      @preset-save="$emit('preset-save', $event)"
      @preset-delete="$emit('preset-delete')"
      @apply="$emit('apply')"
      @reset="$emit('reset')"
    >
      <input
        v-model.trim="filters.query"
        class="input"
        type="search"
        :placeholder="t('searchPlaceholder')"
        @keyup.enter="$emit('apply')"
      />
      <select v-model="filters.direction" class="input">
        <option value="">{{ t("allDirections") }}</option>
        <option value="Inbound">{{ t("inbound") }}</option>
        <option value="Outbound">{{ t("outbound") }}</option>
      </select>
      <select v-model="filters.sort" class="input">
        <option v-for="option in paymentSortOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <select v-model.number="filters.limit" class="input">
        <option :value="24">24</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </select>
      <template #advanced>
        <input
          v-model.trim="filters.customerQuery"
          class="input"
          type="search"
          :placeholder="t('customerFilter')"
          @keyup.enter="$emit('apply')"
        />
        <input
          v-model.trim="filters.policyQuery"
          class="input"
          type="search"
          :placeholder="t('policyFilter')"
          @keyup.enter="$emit('apply')"
        />
        <input
          v-model.trim="filters.purposeQuery"
          class="input"
          type="search"
          :placeholder="t('purposeFilter')"
          @keyup.enter="$emit('apply')"
        />
      </template>
    </WorkbenchFilterToolbar>
  </article>
</template>

<script setup>
import { computed } from "vue";

import WorkbenchFilterToolbar from "../app-shell/WorkbenchFilterToolbar.vue";

const props = defineProps({
  modelValue: {
    type: String,
    default: "default",
  },
  filters: {
    type: Object,
    required: true,
  },
  paymentSortOptions: {
    type: Array,
    required: true,
  },
  presetOptions: {
    type: Array,
    required: true,
  },
  canDeletePreset: {
    type: Boolean,
    default: false,
  },
  activeCount: {
    type: Number,
    default: 0,
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "preset-change", "preset-save", "preset-delete", "apply", "reset"]);

const presetModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
