<template>
  <SectionPanel
    :title="t('filters_title')"
    :count="`${activeFilterCount} ${t('active_filters')}`"
    :meta="branchScopeLabel"
    panel-class="surface-card rounded-2xl p-4"
  >
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="filters.reportKey" class="report-filter-control min-w-[180px]">
          <option v-for="option in reportOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <select
          v-if="filters.reportKey === 'policy_list'"
          :value="activePreset"
          class="report-filter-control min-w-[210px]"
          @change="$emit('apply-date-preset', $event.target.value)"
        >
          <option value="">{{ t("date_range_label") }}</option>
          <option v-for="preset in datePresets" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>

        <div class="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-1.5 py-1">
          <input
            v-model="filters.fromDate"
            class="report-filter-control report-filter-control--date"
            type="date"
            :placeholder="t('date_from')"
            :title="t('date_from')"
          />
          <span class="text-xs text-gray-400">-</span>
          <input
            v-model="filters.toDate"
            class="report-filter-control report-filter-control--date"
            type="date"
            :placeholder="t('date_to')"
            :title="t('date_to')"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2">
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
          @click="$emit('toggle-advanced')"
        >
          {{ reportsAdvancedOpen ? t('hide_advanced_filters') : t('advanced_filters') }}
        </button>

        <span
          v-if="activeFilterCount > 0"
          class="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-xs text-gray-500"
        >
          {{ activeFilterCount }} {{ t('active_filters') }}
        </span>

        <div class="ml-auto flex flex-wrap items-center gap-2">
          <FilterPresetMenu
            :model-value="presetModelValue"
            :label="t('preset_label')"
            :options="presetOptionsList"
            :can-delete="canDeletePresetFlag"
            :show-save="true"
            :show-delete="true"
            :disabled="loading"
            :save-label="t('save_preset')"
            :delete-label="t('delete_preset')"
            @update:model-value="$emit('update:preset-key', $event)"
            @change="$emit('preset-change', $event)"
            @save="$emit('preset-save')"
            @delete="$emit('preset-delete')"
          />
          <button class="btn btn-sm" type="button" :disabled="loading" @click="$emit('refresh')">{{ t('refresh') }}</button>
          <button class="btn btn-sm" type="button" :disabled="loading" @click="$emit('apply-filters')">{{ t('apply_filters') }}</button>
          <button
            class="btn btn-secondary btn-sm flex items-center gap-1.5"
            type="button"
            :disabled="loading"
            @click="$emit('enqueue-export', 'xlsx')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            {{ t('backgroundExport') || 'Background Export' }}
          </button>
          <button class="btn btn-outline btn-sm" type="button" :disabled="loading" @click="$emit('clear-filters')">{{ t('clear_filters') }}</button>
        </div>
      </div>
    </div>

    <div v-if="reportsAdvancedOpen" class="mt-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3">
      <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <label
          v-for="field in visibleAdvancedFilters"
          :key="field.key"
          class="flex flex-col gap-1"
        >
          <span class="text-xs font-medium text-gray-600">{{ field.label }}</span>
          <input
            v-model.trim="filters[field.modelKey]"
            class="report-filter-control"
            type="search"
            :placeholder="field.label"
            :list="`advanced-${field.key}-options`"
          />
          <datalist :id="`advanced-${field.key}-options`">
            <option
              v-for="option in getAdvancedFilterOptions(field.key)"
              :key="`${field.key}-${option}`"
              :value="option"
            />
          </datalist>
        </label>
      </div>
    </div>

    <div class="mt-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
      <span>{{ t("list_summary_title") }}</span>
      <span>{{ t("columns") }}: {{ columnsSummaryLabel }}</span>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import FilterPresetMenu from "../app-shell/FilterPresetMenu.vue";

defineProps({
  filters: {
    type: Object,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
  reportOptions: {
    type: Array,
    default: () => [],
  },
  activePreset: {
    type: String,
    default: "",
  },
  datePresets: {
    type: Array,
    default: () => [],
  },
  reportsAdvancedOpen: {
    type: Boolean,
    default: false,
  },
  activeFilterCount: {
    type: Number,
    default: 0,
  },
  branchScopeLabel: {
    type: String,
    default: "",
  },
  loading: {
    type: Boolean,
    default: false,
  },
  presetModelValue: {
    type: String,
    default: "default",
  },
  presetOptionsList: {
    type: Array,
    default: () => [],
  },
  canDeletePresetFlag: {
    type: Boolean,
    default: false,
  },
  visibleAdvancedFilters: {
    type: Array,
    default: () => [],
  },
  getAdvancedFilterOptions: {
    type: Function,
    required: true,
  },
  columnsSummaryLabel: {
    type: String,
    default: "",
  },
});

defineEmits([
  "toggle-advanced",
  "refresh",
  "apply-filters",
  "clear-filters",
  "apply-date-preset",
  "preset-change",
  "preset-save",
  "preset-delete",
  "update:preset-key",
  "enqueue-export",
]);
</script>
