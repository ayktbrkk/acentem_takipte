<template>
  <div class="dashboard-hero flex flex-col rounded-2xl px-6 py-5 text-white shadow-md relative mb-4 sm:px-8 sm:py-6">
    <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0">
        <p class="at-hero-tag mb-1.5">{{ heroTag }}</p>
        <h1 class="at-hero-title tracking-tight">{{ heroTitle }}</h1>
        <p class="at-hero-subtitle mt-1.5 opacity-90 font-medium">{{ heroSubtitle }}</p>
        <div class="mt-3 flex items-center gap-3">
          <div class="flex h-6 items-center gap-2 rounded-full bg-white/10 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-md border border-white/10">
            <span class="inline-block h-1.5 w-1.5 rounded-full bg-at-green"></span>
            {{ rangeLabelText }}: {{ visibleRange }}
          </div>
        </div>
      </div>

      <ActionToolbarGroup>
        <div class="flex items-center gap-1.5 rounded-xl bg-white/10 p-1 backdrop-blur-md border border-white/10">
          <button
            v-for="days in rangeOptions"
            :key="days"
            class="rounded-lg px-4 py-2 text-xs font-bold transition-all"
            :class="selectedRange === days ? 'bg-white text-brand-900 shadow-sm' : 'text-white hover:bg-white/10'"
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
            class="!flex !h-9 !w-9 !items-center !justify-center !rounded-xl !border-white/10 !bg-white/10 !px-0 !text-white hover:!bg-white/20"
            :aria-label="refreshLabel"
            :title="refreshLabel"
            @click="$emit('reload')"
          >
            <FeatherIcon name="refresh-cw" class="h-4 w-4" />
          </ActionButton>

          <ActionButton
            v-if="showNewLeadAction"
            variant="primary"
            size="sm"
            class="!flex !h-9 !items-center !gap-2 !rounded-xl !bg-brand-600 !px-5 !text-xs !font-bold !text-white !shadow-lg !shadow-brand-500/20 hover:!bg-brand-500"
            @click="$emit('new-lead')"
          >
            <FeatherIcon name="plus" class="h-4 w-4" />
            {{ newLeadLabel }}
          </ActionButton>
        </div>
      </ActionToolbarGroup>
    </div>
  </div>

  <div class="surface-card rounded-xl p-1.5 md:w-fit">
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
import { nextTick, onMounted, watch } from "vue";
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
