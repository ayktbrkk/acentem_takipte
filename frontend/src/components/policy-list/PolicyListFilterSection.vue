<template>
  <SectionPanel
    :title="t('filtersTitle')"
    :count="`${activeCount} ${t('activeFilters')}`"
    panel-class="surface-card rounded-2xl p-4"
  >
    <FilterBar
      v-model:search="searchQuery"
      :filters="filters"
      :active-count="activeCount"
      @filter-change="$emit('filter-change', $event)"
      @reset="$emit('reset')"
    >
      <template #actions>
        <button class="btn btn-sm" :disabled="loading" @click="$emit('refresh')">{{ t("refresh") }}</button>
        <button v-if="activeCount > 0" class="btn btn-outline btn-sm" @click="$emit('reset')">
          {{ t("clearFilters") }}
        </button>
      </template>
    </FilterBar>
    <div class="hidden" aria-hidden="true">
      <input v-model="formFilters.query" class="input" type="text" />
      <input v-model="formFilters.status" class="input" type="text" />
      <input v-model="formFilters.insurance_company" class="input" type="text" />
      <input v-model="formFilters.customer" class="input" type="text" />
      <input v-model="formFilters.gross_min" class="input" type="text" />
      <input v-model.number="pagination.pageLength" class="input" type="number" min="1" />
    </div>
    <div class="mt-3 flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
      <span>{{ t("mobileSummaryTitle") }}</span>
      <span>{{ t("pageSize") }}: {{ pagination.pageLength || 20 }}</span>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import FilterBar from "../ui/FilterBar.vue";

const searchQuery = defineModel("search", { type: String, default: "" });

defineProps({
  t: { type: Function, required: true },
  filters: { type: Array, required: true },
  activeCount: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  formFilters: { type: Object, required: true },
  pagination: { type: Object, required: true },
});

defineEmits(["filter-change", "reset", "refresh"]);
</script>
