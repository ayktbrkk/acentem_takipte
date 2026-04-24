<template>
  <div class="flex flex-col border-b border-gray-100 bg-white px-5 py-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ heroTitle }}</h1>
        <p class="mt-1 text-sm font-medium text-gray-500">{{ heroSubtitle }}</p>
        <p class="mt-4 flex items-center gap-2 text-xs font-medium text-gray-400">
          <span class="inline-block h-1.5 w-1.5 rounded-full bg-brand-500"></span>
          {{ rangeLabelText }}: <span class="text-gray-600">{{ visibleRange }}</span>
        </p>
      </div>

    <ActionToolbarGroup>
      <button
        v-for="days in rangeOptions"
        :key="days"
        class="btn btn-sm"
        :class="selectedRange === days ? 'btn-primary' : 'btn-outline'"
        @click="$emit('apply-range', days)"
      >
        {{ rangeLabel(days) }}
      </button>

      <div class="h-4 w-px bg-gray-200 mx-1"></div>

      <button
        class="btn btn-outline"
        @click="$emit('reload')"
      >
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
      </button>
      <button
        v-if="showNewLeadAction"
        class="btn btn-primary"
        @click="$emit('new-lead')"
      >
        <FeatherIcon name="plus" class="h-4 w-4" />
        {{ newLeadLabel }}
      </button>
    </ActionToolbarGroup>
  </div>
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
import { FeatherIcon } from "frappe-ui";
import ActionToolbarGroup from "../app-shell/ActionToolbarGroup.vue";

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
