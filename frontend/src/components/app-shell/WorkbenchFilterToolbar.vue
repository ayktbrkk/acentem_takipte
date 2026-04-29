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
        :save-label="effectiveSaveLabel"
        :delete-label="effectiveDeleteLabel"
        @update:model-value="$emit('update:modelValue', $event)"
        @change="$emit('presetChange', $event)"
        @save="$emit('presetSave')"
        @delete="$emit('presetDelete')"
      />

      <ActionButton variant="primary" size="xs" :disabled="disabled" @click="$emit('apply')">
        {{ effectiveApplyLabel }}
      </ActionButton>
      <ActionButton variant="secondary" size="xs" :disabled="disabled" @click="$emit('reset')">
        {{ effectiveResetLabel }}
      </ActionButton>

      <slot name="actionsSuffix" />
    </template>
  </FilterBar>
</template>

<script setup>
import { computed, unref } from "vue";

import ActionButton from "./ActionButton.vue";
import FilterBar from "./FilterBar.vue";
import FilterPresetMenu from "./FilterPresetMenu.vue";
import { getAppPinia } from "@/pinia";
import { useAuthStore } from "@/stores/auth";
import { translateText } from "@/utils/i18n";

const props = defineProps({
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
  saveLabel: { type: String, default: "" },
  deleteLabel: { type: String, default: "" },
  applyLabel: { type: String, default: "" },
  resetLabel: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});

const authStore = useAuthStore(getAppPinia());
const activeLocale = computed(() => unref(authStore.locale) || "en");
const effectiveSaveLabel = computed(() => props.saveLabel || translateText("Save", activeLocale.value));
const effectiveDeleteLabel = computed(() => props.deleteLabel || translateText("Delete", activeLocale.value));
const effectiveApplyLabel = computed(() => props.applyLabel || translateText("Apply", activeLocale.value));
const effectiveResetLabel = computed(() => props.resetLabel || translateText("Reset", activeLocale.value));

defineEmits([
  "update:modelValue",
  "presetChange",
  "presetSave",
  "presetDelete",
  "apply",
  "reset",
]);
</script>
