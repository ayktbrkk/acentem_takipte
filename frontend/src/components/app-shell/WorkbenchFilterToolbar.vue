<template>
  <FilterBar
    :advanced-label="advancedLabel"
    :collapse-label="collapseLabel"
    :active-count="activeCount"
    :active-count-label="activeCountLabel"
  >
    <slot />

    <template #advanced>
      <slot name="advanced" />
    </template>

    <template #actions>
      <slot name="actionsPrefix" />

      <FilterPresetMenu
        v-if="showPreset"
        :model-value="modelValue"
        :label="presetLabel"
        :options="presetOptions"
        :disabled="disabled"
        :show-save="showSave"
        :show-delete="showDelete"
        :can-delete="canDeletePreset"
        :save-label="saveLabel"
        :delete-label="deleteLabel"
        @update:model-value="$emit('update:modelValue', $event)"
        @change="$emit('presetChange', $event)"
        @save="$emit('presetSave')"
        @delete="$emit('presetDelete')"
      />

      <ActionButton variant="primary" size="xs" :disabled="disabled" @click="$emit('apply')">
        {{ applyLabel }}
      </ActionButton>
      <ActionButton variant="secondary" size="xs" :disabled="disabled" @click="$emit('reset')">
        {{ resetLabel }}
      </ActionButton>

      <slot name="actionsSuffix" />
    </template>
  </FilterBar>
</template>

<script setup>
import ActionButton from "./ActionButton.vue";
import FilterBar from "./FilterBar.vue";
import FilterPresetMenu from "./FilterPresetMenu.vue";

defineProps({
  modelValue: { type: String, default: "default" },
  advancedLabel: { type: String, required: true },
  collapseLabel: { type: String, required: true },
  activeCount: { type: Number, default: 0 },
  activeCountLabel: { type: String, default: "" },
  presetLabel: { type: String, required: true },
  presetOptions: { type: Array, default: () => [] },
  canDeletePreset: { type: Boolean, default: false },
  showPreset: { type: Boolean, default: true },
  showSave: { type: Boolean, default: true },
  showDelete: { type: Boolean, default: true },
  saveLabel: { type: String, default: "Save" },
  deleteLabel: { type: String, default: "Delete" },
  applyLabel: { type: String, default: "Apply" },
  resetLabel: { type: String, default: "Reset" },
  disabled: { type: Boolean, default: false },
});

defineEmits([
  "update:modelValue",
  "presetChange",
  "presetSave",
  "presetDelete",
  "apply",
  "reset",
]);
</script>
