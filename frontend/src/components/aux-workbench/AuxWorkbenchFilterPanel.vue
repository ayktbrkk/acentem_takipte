<template>
  <div class="mb-4">
    <SmartFilterBar
      v-model="draft.query"
      :placeholder="searchPlaceholder"
      :advanced-label="advancedLabel"
      @open-advanced="showAdvanced = !showAdvanced"
    >
      <template #primary-filters>
        <template v-for="fd in quickFilterDefs" :key="'q-'+fd.key">
          <select
            v-if="fd.type === 'select'"
            v-model="draft[fd.key]"
            class="input h-9 py-1 text-sm min-w-[120px]"
          >
            <option v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
              {{ optionLabel(fd, opt) }}
            </option>
          </select>
        </template>
        <select v-model="draft.sort" class="input h-9 py-1 text-sm min-w-[140px]">
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </template>
    </SmartFilterBar>

    <div v-if="showAdvanced" class="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <template v-for="fd in advancedFilterDefs" :key="'adv-'+fd.key">
           <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
             <span>{{ fieldLabel(fd.field) }}</span>
             <input
               v-model="draft[fd.key]"
               :type="fd.type === 'number' ? 'number' : 'text'"
               class="input"
               :placeholder="fieldLabel(fd.field)"
             />
           </label>
        </template>
      </div>
      <div class="mt-5 flex items-center justify-end gap-2 border-t pt-4">
        <button class="btn btn-outline btn-sm" type="button" @click="$emit('reset')">{{ resetLabel }}</button>
        <button class="btn btn-primary btn-sm px-6" type="button" @click="$emit('apply')">{{ applyLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import SmartFilterBar from "../app-shell/SmartFilterBar.vue";
import { ref } from "vue";

const showAdvanced = ref(false);

defineProps({
  filtersTitle: { type: String, default: "" },
  activeFilterCount: { type: Number, default: 0 },
  activeFiltersLabel: { type: String, default: "" },
  presetKey: { type: String, default: "" },
  presetOptions: { type: Array, default: () => [] },
  canDeletePreset: { type: Boolean, default: false },
  isLoading: { type: Boolean, default: false },
  draft: { type: Object, required: true },
  quickFilterDefs: { type: Array, default: () => [] },
  advancedFilterDefs: { type: Array, default: () => [] },
  sortOptions: { type: Array, default: () => [] },
  pageLengths: { type: Array, default: () => [10, 20, 50] },
  searchPlaceholder: { type: String, default: "" },
  advancedLabel: { type: String, default: "" },
  hideAdvancedLabel: { type: String, default: "" },
  presetLabel: { type: String, default: "" },
  savePresetLabel: { type: String, default: "" },
  deletePresetLabel: { type: String, default: "" },
  applyLabel: { type: String, default: "" },
  resetLabel: { type: String, default: "" },
  fieldLabel: { type: Function, required: true },
  optionLabel: { type: Function, required: true },
});

defineEmits(["update:modelValue", "presetChange", "presetSave", "presetDelete", "apply", "reset"]);
</script>
