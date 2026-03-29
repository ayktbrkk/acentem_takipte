<template>
  <SectionPanel
    v-if="isListView"
    :title="t('filtersTitle')"
    :count="`${activeCount} ${t('activeFilters')}`"
    panel-class="surface-card rounded-2xl p-4"
  >
    <FilterBar
      v-model:search="search"
      :filters="filters"
      :active-count="activeCount"
      @filter-change="$emit('filter-change', $event)"
      @reset="$emit('reset')"
    >
      <template #actions>
        <button class="btn btn-sm" @click="$emit('view-list')">{{ t("viewList") }}</button>
        <button class="btn btn-sm" @click="$emit('view-board')">{{ t("viewBoard") }}</button>
        <button class="btn btn-sm" :disabled="offersLoading || offerListLoading" @click="$emit('refresh')">
          {{ t("refresh") }}
        </button>
        <button v-if="activeCount > 0" class="btn btn-outline btn-sm" @click="$emit('reset')">
          {{ t("clearFilters") }}
        </button>
      </template>
    </FilterBar>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";
import FilterBar from "../ui/FilterBar.vue";

const props = defineProps({
  activeCount: {
    type: Number,
    default: 0,
  },
  filters: {
    type: Array,
    default: () => [],
  },
  isListView: {
    type: Boolean,
    default: false,
  },
  offerListLoading: {
    type: Boolean,
    default: false,
  },
  offersLoading: {
    type: Boolean,
    default: false,
  },
  search: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["filter-change", "reset", "view-list", "view-board", "refresh", "update:search"]);

const search = computed({
  get: () => props.search,
  set: (value) => {
    emit("update:search", value);
  },
});
</script>
