import { computed, ref } from "vue";

export function useFilterBarState(props, slots, emit) {
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

  return {
    advancedOpen,
    mobileFiltersOpen,
    hasAdvanced,
    hasToolbar,
    advancedLabelResolved,
    collapseLabelResolved,
    mobileLabelResolved,
    mobileCollapseLabelResolved,
    activeCountText,
    toggleAdvanced,
    toggleMobileFilters,
  };
}
