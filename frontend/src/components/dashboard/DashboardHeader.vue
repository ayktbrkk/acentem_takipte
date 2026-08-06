<template>
  <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <h1 class="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{{ heroTitle }}</h1>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">{{ heroSubtitle }}</p>
        <div class="mt-2.5 flex flex-wrap items-center gap-2.5">
          <span class="inline-flex h-6 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-at-green"></span>
            {{ rangeLabelText }}: {{ visibleRange }}
          </span>
        </div>
      </div>

      <ActionToolbarGroup>
        <div class="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            v-for="days in rangeOptions"
            :key="days"
            class="rounded-md px-3 py-1.5 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
            :class="selectedRange === days ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            :aria-pressed="selectedRange === days"
            :aria-label="`${rangeLabelText} ${rangeLabel(days)}`"
            @click="$emit('apply-range', days)"
          >
            {{ rangeLabel(days) }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <ActionButton
            variant="secondary"
            size="sm"
            v-bind="refreshButtonProps"
            @click="$emit('reload')"
          >
            <FeatherIcon name="refresh-cw" class="h-4 w-4" />
          </ActionButton>

          <ActionButton
            v-if="showNewLeadAction"
            variant="primary"
            size="sm"
            @click="$emit('new-lead')"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            {{ newLeadLabel }}
          </ActionButton>
        </div>
      </ActionToolbarGroup>
    </div>
  </div>

  <div class="surface-card mt-3 rounded-xl p-1.5 md:w-fit">
    <div class="flex gap-1 overflow-x-auto whitespace-nowrap px-1 py-0.5 md:overflow-visible" role="tablist" :aria-label="heroTitle">
      <button
        v-for="tab in dashboardTabs"
        :key="tab.key"
        :id="tab.tabId"
        class="at-tab-chip shrink-0"
        :class="activeDashboardTab === tab.key ? 'at-tab-chip-active' : 'at-tab-chip-idle'"
        type="button"
        role="tab"
        :aria-controls="tab.panelId"
        :aria-selected="activeDashboardTab === tab.key"
        @click="$emit('set-dashboard-tab', tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, watch } from "vue";
import { FeatherIcon } from "frappe-ui";
import ActionToolbarGroup from "../app-shell/ActionToolbarGroup.vue";
import ActionButton from "../app-shell/ActionButton.vue";

const props = defineProps({
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

const refreshButtonProps = computed(() => ({
  "aria-label": props.refreshLabel,
  title: props.refreshLabel,
}));

function scrollActiveTabIntoView() {
  nextTick(() => {
    const active = (props.dashboardTabs || []).find((tab) => tab.key === props.activeDashboardTab);
    if (!active?.tabId) return;
    const el = document.getElementById(active.tabId);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });
}

onMounted(scrollActiveTabIntoView);
watch(() => props.activeDashboardTab, scrollActiveTabIntoView);
</script>
