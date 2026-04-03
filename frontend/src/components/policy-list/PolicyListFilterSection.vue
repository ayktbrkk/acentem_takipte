<template>
  <SectionPanel
    :title="t('filtersTitle')"
    :count="`${activeCount} ${t('activeFilters')}`"
    panel-class="surface-card rounded-2xl p-4"
  >
    <FilterBar
      v-model:search="searchProxy"
      :filters="filters"
      :active-count="activeCount"
      :search-placeholder="t('searchPlaceholder')"
      @filter-change="emit('filter-change', $event)"
      @reset="emit('reset')"
    >
      <template #actions>
        <button class="btn btn-sm" :disabled="policyLoading" @click="emit('refresh')">{{ t("refresh") }}</button>
        <button v-if="activeCount > 0" class="btn btn-outline btn-sm" @click="emit('clear')">{{ t("clearFilters") }}</button>
      </template>
    </FilterBar>
    <div class="mt-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
      <span>{{ t("mobileSummaryTitle") }}</span>
      <span>{{ t("pageSize") }}: {{ pageLength || 20 }}</span>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";

import FilterBar from "../ui/FilterBar.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
  search: {
    type: String,
    default: "",
  },
  filters: {
    type: Array,
    required: true,
  },
  activeCount: {
    type: Number,
    default: 0,
  },
  policyLoading: {
    type: Boolean,
    default: false,
  },
  pageLength: {
    type: Number,
    default: 20,
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:search", "filter-change", "reset", "refresh", "clear"]);

const searchProxy = computed({
  get: () => props.search,
  set: (value) => emit("update:search", value),
});
</script>
