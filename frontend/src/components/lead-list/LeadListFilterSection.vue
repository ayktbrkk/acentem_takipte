<template>
  <SectionPanel :title="t('filtersTitle')" :count="`${activeFilterCount} ${t('activeFilters')}`" panel-class="surface-card rounded-2xl p-4">
    <FilterBar
      v-model:search="searchProxy"
      :filters="leadListFilterConfig"
      :active-count="activeFilterCount"
      @filter-change="$emit('filter-change', $event)"
      @reset="$emit('reset')"
    >
      <template #actions>
        <button v-if="hasLeadActiveFilters" class="btn btn-outline btn-sm" @click="$emit('reset')">{{ t("clearFilters") }}</button>
        <button class="btn btn-outline btn-sm" @click="$emit('focus-search')">{{ t("searchAction") }}</button>
      </template>
    </FilterBar>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";
import FilterBar from "../ui/FilterBar.vue";

const props = defineProps({
  search: {
    type: String,
    default: "",
  },
  leadListFilterConfig: {
    type: Array,
    required: true,
  },
  activeFilterCount: {
    type: Number,
    required: true,
  },
  hasLeadActiveFilters: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:search", "filter-change", "reset", "focus-search"]);

const searchProxy = computed({
  get: () => props.search,
  set: (value) => emit("update:search", value),
});
</script>
