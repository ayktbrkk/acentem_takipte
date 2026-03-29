<template>
  <SectionPanel
    v-if="!isListView"
    :title="t('pipelineTitle')"
    :count="formatCount(offers.length)"
    panel-class="surface-card rounded-2xl p-5"
  >
    <div v-if="offersLoading" class="surface-card rounded-2xl p-6 text-sm text-slate-500">
      {{ t("loading") }}
    </div>
    <article v-else-if="loadErrorText" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ loadErrorText }}</p>
    </article>
    <div v-else-if="offers.length === 0" class="surface-card rounded-2xl p-5">
      <EmptyState :title="t('emptyTitle')" :description="t('empty')" />
    </div>
    <div v-else class="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
      <article
        v-for="lane in lanes"
        :key="lane.key"
        class="surface-card flex min-h-[500px] flex-col rounded-2xl border-t-4 p-3"
        :class="lane.borderClass"
        @dragover.prevent
        @drop="$emit('lane-drop', lane.key)"
      >
        <header class="mb-3 flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("stage") }}</p>
            <h3 class="text-base font-semibold text-slate-900">{{ lane.label }}</h3>
          </div>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {{ laneRows(lane.key).length }}
          </span>
        </header>

        <div class="space-y-3 overflow-y-auto pr-1">
          <article
            v-for="offer in laneRows(lane.key)"
            :key="offer.name"
            class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            draggable="true"
            @dragstart="$emit('card-drag-start', offer)"
            @dragend="$emit('card-drag-end')"
          >
            <div class="flex items-start justify-between gap-2">
              <button
                class="text-left text-sm font-semibold text-slate-900 hover:text-sky-700"
                type="button"
                @click.stop="$emit('open-offer-detail', offer.name)"
              >
                {{ offer.name }}
              </button>
              <StatusBadge domain="offer" :status="offer.status" />
            </div>

            <div class="mt-3">
              <MiniFactList :items="offerCardFacts(offer)" />
            </div>

            <InlineActionRow class="mt-4">
              <ActionButton
                v-if="isConvertible(offer)"
                variant="primary"
                size="xs"
                @click="$emit('open-convert-dialog', offer)"
              >
                {{ t("convert") }}
              </ActionButton>
              <ActionButton
                v-if="offer.converted_policy"
                variant="secondary"
                size="xs"
                @click="$emit('open-policy-detail', offer.converted_policy)"
              >
                {{ t("openPolicy") }}
              </ActionButton>
            </InlineActionRow>
          </article>

          <div
            v-if="laneRows(lane.key).length === 0"
            class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500"
          >
            {{ t("emptyLane") }}
          </div>
        </div>
      </article>
    </div>
  </SectionPanel>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import InlineActionRow from "../app-shell/InlineActionRow.vue";
import MiniFactList from "../app-shell/MiniFactList.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  formatCount: {
    type: Function,
    required: true,
  },
  isConvertible: {
    type: Function,
    required: true,
  },
  isListView: {
    type: Boolean,
    default: false,
  },
  lanes: {
    type: Array,
    default: () => [],
  },
  laneRows: {
    type: Function,
    required: true,
  },
  loadErrorText: {
    type: String,
    default: "",
  },
  offerCardFacts: {
    type: Function,
    required: true,
  },
  offers: {
    type: Array,
    default: () => [],
  },
  offersLoading: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits([
  "card-drag-end",
  "card-drag-start",
  "lane-drop",
  "open-convert-dialog",
  "open-offer-detail",
  "open-policy-detail",
]);
</script>
