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
          v-model="localFilters.status"
          class="input h-9 py-1 text-sm"
          @change="emitFilterChange('status', localFilters.status)"
        >
          <option value="">{{ t("status") }}: {{ t("all") }}</option>
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
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
            v-model="localFilters.amountState"
            class="input"
            @change="emitFilterChange('amountState', localFilters.amountState)"
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
  localFilters: {
    type: Object,
    required: true,
  },
  searchQuery: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:searchQuery", "filter-change", "reset", "focus-search"]);

const showAdvanced = ref(false);

const searchProxy = computed({
  get: () => props.searchQuery,
  set: (value) => emit("update:searchQuery", value),
});

const statusOptions = computed(() => props.claimsListFilterConfig[0]?.options || []);
const amountStateConfig = computed(() => props.claimsListFilterConfig[1] || { label: "", options: [] });

function emitFilterChange(key, value) {
  emit("filter-change", { key, value });
}
</script>
