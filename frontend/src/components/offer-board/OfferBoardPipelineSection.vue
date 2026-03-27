<template>
  <SectionPanel :title="title" :count="count" panel-class="surface-card rounded-2xl p-5">
    <div v-if="loading" class="surface-card rounded-2xl p-6 text-sm text-slate-500">
      {{ loadingLabel }}
    </div>
    <article v-else-if="errorText" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ loadErrorTitle }}</p>
      <p class="qc-error-banner__text mt-1">{{ errorText }}</p>
    </article>
    <div v-else-if="empty" class="surface-card rounded-2xl p-5">
      <EmptyState :title="emptyTitle" :description="emptyDescription" />
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
            <p class="text-xs uppercase tracking-wide text-slate-500">{{ stageLabel }}</p>
            <h3 class="text-base font-semibold text-slate-900">{{ lane.label }}</h3>
          </div>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {{ rowCountForLane(lane.key) }}
          </span>
        </header>

        <div class="space-y-3 overflow-y-auto pr-1">
          <article
            v-for="offer in rowsForLane(lane.key)"
            :key="offer.name"
            class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            draggable="true"
            @dragstart="$emit('drag-start', offer)"
            @dragend="$emit('drag-end')"
          >
            <div class="flex items-start justify-between gap-2">
              <button class="text-left text-sm font-semibold text-slate-900 hover:text-sky-700" type="button" @click.stop="$emit('open-offer', offer.name)">
                {{ offer.name }}
              </button>
              <StatusBadge domain="offer" :status="offer.status" />
            </div>

            <div class="mt-3">
              <MiniFactList :items="offerCardFacts(offer)" />
            </div>

            <InlineActionRow class="mt-4">
              <ActionButton v-if="isConvertible(offer)" variant="primary" size="xs" @click="$emit('convert-offer', offer)">
                {{ convertLabel }}
              </ActionButton>
              <ActionButton v-if="offer.converted_policy" variant="secondary" size="xs" @click="$emit('open-policy', offer.converted_policy)">
                {{ openPolicyLabel }}
              </ActionButton>
            </InlineActionRow>
          </article>

          <div v-if="rowsForLane(lane.key).length === 0" class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            {{ emptyLaneLabel }}
          </div>
        </div>
      </article>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import MiniFactList from "../app-shell/MiniFactList.vue";
import InlineActionRow from "../app-shell/InlineActionRow.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  title: { type: String, required: true },
  count: { type: [String, Number], required: true },
  lanes: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  errorText: { type: String, default: "" },
  empty: { type: Boolean, default: false },
  emptyTitle: { type: String, default: "" },
  emptyDescription: { type: String, default: "" },
  loadingLabel: { type: String, default: "" },
  loadErrorTitle: { type: String, default: "" },
  stageLabel: { type: String, default: "" },
  emptyLaneLabel: { type: String, default: "" },
  convertLabel: { type: String, default: "" },
  openPolicyLabel: { type: String, default: "" },
  rowsForLane: { type: Function, required: true },
  rowCountForLane: { type: Function, required: true },
  offerCardFacts: { type: Function, required: true },
  isConvertible: { type: Function, required: true },
});

defineEmits(["lane-drop", "drag-start", "drag-end", "open-offer", "convert-offer", "open-policy"]);
</script>
