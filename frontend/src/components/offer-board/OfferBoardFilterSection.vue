<template>
  <SectionPanel :title="title" :count="count" panel-class="surface-card rounded-2xl p-4">
    <FilterBar
      v-model:search="searchProxy"
      :filters="filters"
      :active-count="activeCount"
      @filter-change="$emit('filter-change', $event)"
      @reset="$emit('reset')"
    >
      <template #actions>
        <slot name="actions" />
      </template>
    </FilterBar>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import FilterBar from "../ui/FilterBar.vue";

const props = defineProps({
  title: { type: String, required: true },
  count: { type: String, default: "" },
  filters: { type: Array, default: () => [] },
  activeCount: { type: Number, default: 0 },
  search: { type: String, default: "" },
});

const emit = defineEmits(["update:search", "filter-change", "reset"]);

const searchProxy = computed({
  get: () => props.search,
  set: (value) => emit("update:search", value),
});
</script>
