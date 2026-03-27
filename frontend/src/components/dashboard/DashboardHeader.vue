<template>
  <div class="detail-topbar">
    <div>
      <p class="detail-breadcrumb">{{ heroTag }}</p>
      <h1 class="detail-title">{{ heroTitle }}</h1>
      <p class="detail-subtitle">{{ heroSubtitle }}</p>
      <p class="detail-meta">{{ rangeLabelText }}: {{ visibleRange }}</p>
    </div>

    <ActionToolbarGroup>
      <FilterChipButton
        v-for="days in rangeOptions"
        :key="days"
        theme="hero"
        :active="selectedRange === days"
        @click="$emit('apply-range', days)"
      >
        {{ rangeLabel(days) }}
      </FilterChipButton>

      <ActionButton
        variant="secondary"
        size="sm"
        class="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
        @click="$emit('reload')"
      >
        {{ refreshLabel }}
      </ActionButton>
      <ActionButton
        v-if="showNewLeadAction"
        variant="secondary"
        size="sm"
        class="!border-white/30 !bg-white !text-slate-900 hover:!bg-slate-100"
        @click="$emit('new-lead')"
      >
        {{ newLeadLabel }}
      </ActionButton>
    </ActionToolbarGroup>
  </div>

  <div class="surface-card rounded-2xl p-2">
    <div class="flex gap-2 overflow-x-auto whitespace-nowrap px-1 py-1">
      <button
        v-for="tab in dashboardTabs"
        :key="tab.key"
        class="at-tab-chip shrink-0"
        :class="activeDashboardTab === tab.key ? 'at-tab-chip-active' : 'at-tab-chip-idle'"
        type="button"
        @click="$emit('set-dashboard-tab', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import ActionToolbarGroup from "../app-shell/ActionToolbarGroup.vue";
import FilterChipButton from "../app-shell/FilterChipButton.vue";

defineProps({
  activeDashboardTab: { type: String, required: true },
  dashboardTabs: { type: Array, required: true },
  heroSubtitle: { type: String, required: true },
  heroTag: { type: String, required: true },
  heroTitle: { type: String, required: true },
  newLeadLabel: { type: String, required: true },
  rangeLabel: { type: Function, required: true },
  rangeLabelText: { type: String, required: true },
  rangeOptions: { type: Array, required: true },
  refreshLabel: { type: String, required: true },
  selectedRange: { type: Number, required: true },
  showNewLeadAction: { type: Boolean, required: true },
  visibleRange: { type: String, required: true },
});

defineEmits(["apply-range", "new-lead", "reload", "set-dashboard-tab"]);
</script>
