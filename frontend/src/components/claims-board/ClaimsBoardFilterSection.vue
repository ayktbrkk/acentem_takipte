<template>
  <div class="mb-6">
    <SmartFilterBar
      v-model="searchProxy"
      :placeholder="t('searchPlaceholder')"
      @open-advanced="showAdvanced = !showAdvanced"
    >
      <template #primary-filters>
        <button class="btn btn-outline" @click="$emit('reset')">
          <FeatherIcon name="x" class="h-4 w-4" />
          {{ t("clearFilters") }}
        </button>
      </template>
    </SmartFilterBar>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import SmartFilterBar from "../app-shell/SmartFilterBar.vue";
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
</script>
