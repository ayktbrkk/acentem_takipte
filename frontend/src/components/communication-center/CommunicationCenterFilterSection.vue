<template>
  <SectionPanel :title="t('filtersTitle')" :count="activeFilterCount" panel-class="surface-card rounded-2xl p-5">
    <WorkbenchFilterToolbar
      :model-value="presetKey"
      :advanced-label="t('advancedFilters')"
      :collapse-label="t('hideAdvancedFilters')"
      :active-count="activeFilterCount"
      :active-count-label="t('activeFilters')"
      :preset-label="t('presetLabel')"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :save-label="t('savePreset')"
      :delete-label="t('deletePreset')"
      :apply-label="t('applyFilters')"
      :reset-label="t('clearFilters')"
      @update:model-value="onPresetChange"
      @preset-save="onPresetSave"
      @preset-delete="onPresetDelete"
      @apply="onApplyFilters"
      @reset="onResetFilters"
    >
      <input
        v-model.trim="filters.customer"
        class="input"
        type="search"
        :placeholder="t('customerFilter')"
        @keyup.enter="onApplyFilters"
      />
      <select v-model="filters.status" class="input">
        <option value="">{{ t("allStatuses") }}</option>
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <select v-model="filters.channel" class="input">
        <option value="">{{ t("allChannels") }}</option>
        <option v-for="option in channelOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <template #advanced>
        <select v-model="filters.referenceDoctype" class="input">
          <option value="">{{ t("allReferenceTypes") }}</option>
          <option v-for="option in referenceDoctypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-model.trim="filters.referenceName"
          class="input"
          type="search"
          :placeholder="t('referenceNameFilter')"
          @keyup.enter="onApplyFilters"
        />
        <select v-model.number="filters.limit" class="input">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </template>

      <template #actionsSuffix>
        <ActionButton v-if="hasContextFilters" variant="link" size="xs" @click="onClearContextFilters">
          {{ t("clearContext") }}
        </ActionButton>
      </template>
    </WorkbenchFilterToolbar>
  </SectionPanel>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import WorkbenchFilterToolbar from "../app-shell/WorkbenchFilterToolbar.vue";

defineProps({
  activeFilterCount: {
    type: Number,
    default: 0,
  },
  canDeletePreset: {
    type: Boolean,
    default: false,
  },
  channelOptions: {
    type: Array,
    default: () => [],
  },
  filters: {
    type: Object,
    required: true,
  },
  hasContextFilters: {
    type: Boolean,
    default: false,
  },
  onApplyFilters: {
    type: Function,
    required: true,
  },
  onClearContextFilters: {
    type: Function,
    required: true,
  },
  onPresetChange: {
    type: Function,
    required: true,
  },
  onPresetDelete: {
    type: Function,
    required: true,
  },
  onPresetSave: {
    type: Function,
    required: true,
  },
  onResetFilters: {
    type: Function,
    required: true,
  },
  presetKey: {
    type: String,
    default: "",
  },
  presetOptions: {
    type: Array,
    default: () => [],
  },
  referenceDoctypeOptions: {
    type: Array,
    default: () => [],
  },
  statusOptions: {
    type: Array,
    default: () => [],
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
