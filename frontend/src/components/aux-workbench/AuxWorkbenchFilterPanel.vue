<template>
  <SectionPanel :title="filtersTitle" panel-class="surface-card rounded-2xl p-5">
    <div class="flex flex-wrap gap-4 items-center">
      <div class="flex-1 min-w-[200px]">
        <input
          v-model.trim="draft.query"
          class="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          :placeholder="searchPlaceholder"
        />
      </div>

      <template v-for="fd in quickFilterDefs" :key="'q-'+fd.key">
        <select
          v-if="fd.type === 'select'"
          v-model="draft[fd.key]"
          class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white transition-all min-w-[120px]"
        >
          <option v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
            {{ optionLabel(fd, opt) }}
          </option>
        </select>
        <input
          v-else
          v-model="draft[fd.key]"
          :type="fd.type === 'number' ? 'number' : 'text'"
          class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white transition-all min-w-[120px]"
          :placeholder="fieldLabel(fd.field)"
        />
      </template>

      <div class="h-8 w-px bg-slate-100 hidden md:block mx-1"></div>

      <select v-model="draft.sort" class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white transition-all">
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>

      <div class="flex items-center gap-2">
        <ActionButton variant="secondary" size="sm" @click="$emit('reset')">
          {{ resetLabel }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" @click="$emit('apply')">
          {{ applyLabel }}
        </ActionButton>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import ActionButton from "../app-shell/ActionButton.vue";

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
