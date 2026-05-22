<template>
  <SectionPanel
    :title="t('filters_title')"
    :count="`${activeFilterCount} ${t('active_filters')}`"
    :meta="branchScopeLabel"
    panel-class="surface-card rounded-2xl p-4"
  >
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="sr-only" for="reports-report-key">{{ t("report_key") }}</label>
        <select
          id="reports-report-key"
          v-model="filters.reportKey"
          name="report_key"
          :aria-label="t('report_key')"
          class="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 min-w-[180px]"
        >
          <option v-for="option in reportOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <label v-if="filters.reportKey === 'policy_list'" class="sr-only" for="reports-date-preset">{{ t("date_range_label") }}</label>
        <select
          v-if="filters.reportKey === 'policy_list'"
          id="reports-date-preset"
          name="date_preset"
          :value="activePreset"
          :aria-label="t('date_range_label')"
          class="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 min-w-[210px]"
          @change="$emit('apply-date-preset', $event.target.value)"
        >
          <option value="">{{ t("date_range_label") }}</option>
          <option v-for="preset in datePresets" :key="preset.value" :value="preset.value">
            {{ preset.label }}
          </option>
        </select>

        <div class="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
          <input
            id="reports-from-date"
            v-model="filters.fromDate"
            name="from_date"
            class="w-full rounded-lg border-0 bg-transparent px-1 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-0"
            type="date"
            :aria-label="t('date_from')"
            :placeholder="t('date_from')"
            :title="t('date_from')"
          />
          <span class="text-xs text-slate-400">-</span>
          <input
            id="reports-to-date"
            v-model="filters.toDate"
            name="to_date"
            class="w-full rounded-lg border-0 bg-transparent px-1 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-0"
            type="date"
            :aria-label="t('date_to')"
            :placeholder="t('date_to')"
            :title="t('date_to')"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
        <ActionButton type="button" variant="secondary" size="sm" @click="$emit('toggle-advanced')">
          {{ reportsAdvancedOpen ? t('hide_advanced_filters') : t('advanced_filters') }}
        </ActionButton>

        <span
          v-if="activeFilterCount > 0"
          class="flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600"
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
          <ActionButton variant="secondary" size="sm" type="button" :disabled="loading" @click="$emit('refresh')">
            <FeatherIcon name="refresh-cw" :class="['h-4 w-4', loading && 'animate-spin']" />
            {{ t('refresh') }}
          </ActionButton>
          <ActionButton variant="primary" size="sm" type="button" :disabled="loading" @click="$emit('apply-filters')">
            {{ t('apply_filters') }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" type="button" :disabled="loading" @click="$emit('enqueue-export', 'xlsx')">
            <FeatherIcon name="cloud-lightning" class="h-4 w-4" />
            {{ t('backgroundExport') }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" type="button" :disabled="loading" @click="$emit('clear-filters')">
            <FeatherIcon name="x" class="h-4 w-4" />
            {{ t('clear_filters') }}
          </ActionButton>
        </div>
      </div>
    </div>

    <div v-if="reportsAdvancedOpen" class="mt-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
      <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <label
          v-for="field in visibleAdvancedFilters"
          :key="field.key"
          class="flex flex-col gap-1"
        >
          <span class="text-[11px] font-normal text-slate-400">{{ field.label }}</span>
          <input
            v-model.trim="filters[field.modelKey]"
            class="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
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

    <div class="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span>{{ t("list_summary_title") }}</span>
      <span>{{ t("columns") }}: {{ columnsSummaryLabel }}</span>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import FilterPresetMenu from "../app-shell/FilterPresetMenu.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import { FeatherIcon } from "frappe-ui";

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
