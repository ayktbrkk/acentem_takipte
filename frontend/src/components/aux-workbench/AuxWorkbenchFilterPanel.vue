<template>
  <SectionPanel :title="filtersTitle" :count="`${activeFilterCount} ${activeFiltersLabel}`" panel-class="surface-card rounded-2xl p-5">
    <WorkbenchFilterToolbar
      :model-value="presetKey"
      :show-preset="true"
      :advanced-label="advancedLabel"
      :collapse-label="hideAdvancedLabel"
      :active-count="activeFilterCount"
      :active-count-label="activeFiltersLabel"
      :preset-label="presetLabel"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :save-label="savePresetLabel"
      :delete-label="deletePresetLabel"
      :apply-label="applyLabel"
      :reset-label="resetLabel"
      :disabled="isLoading"
      @update:modelValue="$emit('update:modelValue', $event)"
      @presetChange="$emit('presetChange')"
      @presetSave="$emit('presetSave')"
      @presetDelete="$emit('presetDelete')"
      @apply="$emit('apply')"
      @reset="$emit('reset')"
    >
      <input
        v-model.trim="draft.query"
        class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        :placeholder="searchPlaceholder"
      />

      <template v-for="fd in quickFilterDefs" :key="'q-'+fd.key">
        <component
          :is="fd.type === 'select' ? 'select' : 'input'"
          v-model="draft[fd.key]"
          :type="fd.type === 'select' ? undefined : fd.type === 'number' ? 'number' : 'text'"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <template v-if="fd.type === 'select'">
            <option v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
              {{ optionLabel(fd, opt) }}
            </option>
          </template>
        </component>
      </template>

      <select v-model="draft.sort" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select v-model.number="draft.pageLength" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        <option v-for="n in pageLengths" :key="n" :value="n">{{ n }}</option>
      </select>

      <template #advanced>
        <template v-for="fd in advancedFilterDefs" :key="'a-'+fd.key">
          <component
            :is="fd.type === 'select' ? 'select' : 'input'"
            v-model="draft[fd.key]"
            :type="fd.type === 'select' ? undefined : fd.type === 'number' ? 'number' : 'text'"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            :placeholder="fieldLabel(fd.field)"
          >
            <template v-if="fd.type === 'select'">
              <option v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
                {{ optionLabel(fd, opt) }}
              </option>
            </template>
          </component>
        </template>
      </template>
    </WorkbenchFilterToolbar>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import WorkbenchFilterToolbar from "../app-shell/WorkbenchFilterToolbar.vue";

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
