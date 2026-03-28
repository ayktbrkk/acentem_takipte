<template>
  <SectionPanel
    :title="t('filtersTitle')"
    :count="`${claimsListActiveCount} ${t('activeFilters')}`"
    panel-class="surface-card rounded-2xl p-4"
  >
    <FilterBar
      v-model:search="searchProxy"
      :filters="claimsListFilterConfig"
      :active-count="claimsListActiveCount"
      @filter-change="$emit('filter-change', $event)"
      @reset="$emit('reset')"
    >
      <template #actions>
        <button class="btn btn-outline btn-sm" @click="$emit('reset')">{{ t("clearFilters") }}</button>
        <button class="btn btn-outline btn-sm" @click="$emit('focus-search')">{{ t("searchPlaceholder") }}</button>
      </template>
    </FilterBar>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";
import FilterBar from "../ui/FilterBar.vue";

const props = defineProps({
  claimsListActiveCount: {
    type: Number,
    required: true,
  },
  claimsListFilterConfig: {
    type: Array,
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

const searchProxy = computed({
  get: () => props.searchQuery,
  set: (value) => emit("update:searchQuery", value),
});
</script>
