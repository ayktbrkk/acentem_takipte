<template>
  <div class="at-filter-bar">
    <div :class="['at-filter-grid', mobileFiltersOpen ? 'grid' : 'hidden', 'lg:grid']">
      <slot />
    </div>

    <div v-if="hasToolbar" class="at-filter-toolbar">
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 lg:hidden"
          type="button"
          @click="toggleMobileFilters"
        >
          {{ mobileFiltersOpen ? mobileCollapseLabelResolved : mobileLabelResolved }}
        </button>
        <button
          v-if="hasAdvanced"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          type="button"
          @click="toggleAdvanced"
        >
          {{ advancedOpen ? collapseLabelResolved : advancedLabelResolved }}
        </button>
        <span
          v-if="Number(activeCount || 0) > 0"
          class="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700"
        >
          {{ activeCountText }}
        </span>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="hasAdvanced && advancedOpen" class="at-filter-advanced">
      <div class="at-filter-grid at-filter-grid-advanced">
        <slot name="advanced" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, useSlots } from "vue";

const props = defineProps({
  initialAdvancedOpen: {
    type: Boolean,
    default: false,
  },
  advancedLabel: {
    type: String,
    default: "",
  },
  collapseLabel: {
    type: String,
    default: "",
  },
  activeCount: {
    type: Number,
    default: 0,
  },
  activeCountLabel: {
    type: String,
    default: "",
  },
  initialMobileOpen: {
    type: Boolean,
    default: false,
  },
  mobileLabel: {
    type: String,
    default: "",
  },
  mobileCollapseLabel: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["advanced-toggle"]);
const slots = useSlots();
const advancedOpen = ref(Boolean(props.initialAdvancedOpen));
const mobileFiltersOpen = ref(Boolean(props.initialMobileOpen));

const hasAdvanced = computed(() => Boolean(slots.advanced));
const hasToolbar = computed(() => hasAdvanced.value || Boolean(slots.actions) || Number(props.activeCount || 0) > 0);
const advancedLabelResolved = computed(() => props.advancedLabel || "Advanced Filters");
const collapseLabelResolved = computed(() => props.collapseLabel || "Hide Advanced");
const mobileLabelResolved = computed(() => props.mobileLabel || "Filtreler");
const mobileCollapseLabelResolved = computed(() => props.mobileCollapseLabel || "Filtreleri Gizle");
const activeCountText = computed(() => {
  const count = Number(props.activeCount || 0);
  if (!count) return "";
  if (props.activeCountLabel) return `${count} ${props.activeCountLabel}`;
  return `${count} active`;
});

function toggleAdvanced() {
  advancedOpen.value = !advancedOpen.value;
  emit("advanced-toggle", advancedOpen.value);
}

function toggleMobileFilters() {
  mobileFiltersOpen.value = !mobileFiltersOpen.value;
}
</script>
