<template>
  <SectionPanel :title="title" :count="count" panel-class="surface-card rounded-2xl p-5">
    <div v-if="loading" class="p-10 text-center">
      <SkeletonLoader variant="list" :rows="5" />
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
        class="flex min-h-[500px] flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-3"
        @dragover.prevent
        @drop="$emit('lane-drop', lane.key)"
      >
        <header class="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <p class="text-sm font-bold text-slate-900">{{ lane.label }}</p>
            <p class="mt-0.5 text-[11px] font-medium text-slate-500">{{ lane.hint || stageLabel }}</p>
          </div>
          <span class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2 text-[10px] font-bold text-white">
            {{ laneCountLabel(rowCountForLane(lane.key)) }}
          </span>
        </header>

        <div class="space-y-3 overflow-y-auto pr-1">
          <div
            v-if="rowsForLane(lane.key).length === 0"
            class="rounded-xl border border-dashed border-slate-200 bg-white/50 px-3 py-8 text-center text-xs font-medium text-slate-400"
          >
            {{ emptyLaneLabel }}
          </div>

          <article
            v-for="offer in displayedRowsForLane(lane.key)"
            :key="offer.name"
            class="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-200 hover:shadow-md"
            draggable="true"
            @click="$emit('open-offer', offer.name)"
            @dragstart="$emit('drag-start', offer)"
            @dragend="$emit('drag-end')"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-slate-900">{{ offer.name }}</p>
                <p class="mt-0.5 truncate text-xs font-medium text-slate-500">
                  {{ customerLabel(offer) }} · {{ premiumLabel(offer) }}
                </p>
              </div>
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                {{ avatarInitials(offer) }}
              </div>
            </div>

            <div class="mt-3 flex items-center gap-2">
              <StatusBadge domain="offer" :status="offer.status" :locale="locale" />
            </div>

            <div class="mt-3 space-y-1 border-t border-slate-50 pt-2 text-[11px] font-medium text-slate-500">
              <p class="flex justify-between gap-3">
                <span>{{ companyLabel }}</span>
                <span class="truncate text-right text-slate-700">{{ companyValue(offer) }}</span>
              </p>
              <p class="flex justify-between gap-3">
                <span>{{ validityLabel }}</span>
                <span class="text-right text-slate-700">{{ validityValue(offer) }}</span>
              </p>
            </div>

            <div class="mt-3 flex items-center justify-end gap-2 border-t border-slate-50 pt-3">
              <ActionButton
                v-if="isConvertible(offer)"
                variant="primary"
                size="xs"
                @click.stop="$emit('convert-offer', offer)"
              >
                {{ convertLabel }}
              </ActionButton>
              <ActionButton
                v-if="offer.converted_policy"
                variant="secondary"
                size="xs"
                @click.stop="$emit('open-policy', offer.converted_policy)"
              >
                {{ openPolicyLabel }}
              </ActionButton>
            </div>
          </article>
        </div>
      </article>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";
import StatusBadge from "../ui/StatusBadge.vue";

const BOARD_DISPLAY_LIMIT = 5;

const props = defineProps({
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
  locale: { type: String, default: "en" },
});

defineEmits(["lane-drop", "drag-start", "drag-end", "open-offer", "convert-offer", "open-policy"]);

const companyLabel = computed(() => (props.locale.toLowerCase().startsWith("tr") ? "Şirket:" : "Company:"));
const validityLabel = computed(() => (props.locale.toLowerCase().startsWith("tr") ? "Geçerlilik:" : "Validity:"));

function displayedRowsForLane(laneKey) {
  return props.rowsForLane(laneKey).slice(0, BOARD_DISPLAY_LIMIT);
}

function laneCountLabel(total) {
  return total > BOARD_DISPLAY_LIMIT ? `${BOARD_DISPLAY_LIMIT}+` : total;
}

function customerLabel(offer) {
  return offer?.customer_full_name || offer?.customer || "-";
}

function premiumLabel(offer) {
  const premiumFact = props.offerCardFacts(offer).find((item) => item.key === "premium");
  return premiumFact?.value || "-";
}

function companyValue(offer) {
  return offer?.insurance_company || "-";
}

function validityValue(offer) {
  const validity = offer?.valid_until;
  if (!validity) return "-";
  const date = new Date(validity);
  if (Number.isNaN(date.getTime())) return String(validity);
  const localeCode = props.locale.toLowerCase().startsWith("tr") ? "tr-TR" : "en-US";
  return new Intl.DateTimeFormat(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function avatarInitials(offer) {
  const source = customerLabel(offer);
  return String(source)
    .split(/[\s_-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "-";
}
</script>
