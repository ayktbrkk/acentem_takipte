<template>
  <div class="mb-6 space-y-4">
    <SmartFilterBar
      v-model="searchProxy"
      :placeholder="t('searchPlaceholder')"
      :advanced-label="t('filters')"
      @open-advanced="showAdvanced = !showAdvanced"
    >
      <template #primary-filters>
        <select
          v-model="filters.status"
          class="input h-9 py-1 text-sm"
          @change="emitFilterChange('status', filters.status)"
        >
          <option value="">{{ t("status") }}: {{ t("all") }}</option>
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <div class="h-4 w-px bg-slate-200 mx-1"></div>
        <FilterPresetMenu
          :model-value="presetModel"
          :label="t('presetLabel')"
          :options="presetOptions"
          :can-delete="canDeletePreset"
          :show-save="true"
          :show-delete="true"
          :save-label="t('savePreset')"
          :delete-label="t('deletePreset')"
          @update:model-value="presetModel = $event"
          @change="$emit('preset-change', $event)"
          @save="$emit('preset-save', $event)"
          @delete="$emit('preset-delete')"
        />
        <ActionButton variant="primary" size="sm" @click="$emit('apply')">
          {{ t("applyFilters") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="$emit('reset')">
          <FeatherIcon name="x" class="h-4 w-4" />
          {{ t("clearFilters") }}
        </ActionButton>
      </template>
    </SmartFilterBar>

    <div v-if="showAdvanced" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span>{{ amountStateConfig.label }}</span>
          <select
            v-model="filters.amountState"
            class="input"
            @change="emitFilterChange('amountState', filters.amountState)"
          >
            <option value="">{{ t("all") }}</option>
            <option v-for="opt in amountStateConfig.options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </label>
      </div>
      <p v-if="claimsListActiveCount > 0" class="mt-4 text-xs font-medium text-slate-500">
        {{ claimsListActiveCount }} {{ t("activeFilters") }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import SmartFilterBar from "../app-shell/SmartFilterBar.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import FilterPresetMenu from "../app-shell/FilterPresetMenu.vue";
import { FeatherIcon } from "frappe-ui";

const props = defineProps({
  claimsListActiveCount: {
    type: Number,
    required: true,
  },
  claimsListFilterConfig: {
    type: Array,
    required: true,
  },
  filters: {
    type: Object,
    required: true,
  },
  searchQuery: {
    type: String,
    default: "",
  },
  presetKey: {
    type: String,
    default: "",
  },
  presetOptions: {
    type: Array,
    default: () => [],
  },
  canDeletePreset: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  "update:searchQuery",
  "update:presetKey",
  "filter-change",
  "reset",
  "apply",
  "preset-change",
  "preset-save",
  "preset-delete",
  "focus-search",
]);

const showAdvanced = ref(false);

const searchProxy = computed({
  get: () => props.searchQuery,
  set: (value) => emit("update:searchQuery", value),
});

const presetModel = computed({
  get: () => props.presetKey,
  set: (value) => emit("update:presetKey", value),
});

const statusOptions = computed(() => props.claimsListFilterConfig[0]?.options || []);
const amountStateConfig = computed(() => props.claimsListFilterConfig[1] || { label: "", options: [] });

function emitFilterChange(key, value) {
  emit("filter-change", { key, value });
}
</script>
