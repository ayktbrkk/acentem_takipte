<template>
  <div class="dashboard-hero flex flex-col rounded-3xl px-8 py-10 text-white shadow-lg overflow-hidden relative mb-6">
    <!-- Decorative background elements -->
    <div class="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl"></div>
    <div class="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl"></div>

    <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <p class="at-hero-tag mb-2">{{ heroTag }}</p>
        <h1 class="at-hero-title tracking-tight">{{ heroTitle }}</h1>
        <p class="at-hero-subtitle mt-2 opacity-90 font-medium">{{ heroSubtitle }}</p>
        <div class="mt-6 flex items-center gap-3">
          <div class="flex h-6 items-center gap-2 rounded-full bg-white/10 px-3 text-[10px] font-bold uppercase tracking-widest text-emerald-100 backdrop-blur-md border border-white/10">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ rangeLabelText }}: {{ visibleRange }}
          </div>
        </div>
      </div>

      <ActionToolbarGroup class="flex-nowrap">
        <div class="flex items-center gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur-md border border-white/10">
          <button
            v-for="days in rangeOptions"
            :key="days"
            class="rounded-lg px-4 py-1.5 text-xs font-bold transition-all"
            :class="selectedRange === days ? 'bg-white text-brand-900 shadow-sm' : 'text-white hover:bg-white/10'"
            @click="$emit('apply-range', days)"
          >
            {{ rangeLabel(days) }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white border border-white/10 transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            @click="$emit('reload')"
          >
            <FeatherIcon name="refresh-cw" class="h-4 w-4" />
          </button>
          
          <button
            v-if="showNewLeadAction"
            class="flex h-9 items-center gap-2 rounded-xl bg-emerald-500 px-5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95"
            @click="$emit('new-lead')"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            {{ newLeadLabel }}
          </button>
        </div>
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
