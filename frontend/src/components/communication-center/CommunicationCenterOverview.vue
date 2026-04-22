<template>
  <SectionPanel :title="t('filtersTitle')" panel-class="surface-card rounded-2xl p-5">
    <div class="flex flex-wrap gap-4 items-center">
      <div class="flex-1 min-w-[200px]">
        <input
          v-model.trim="filters.customer"
          class="w-full h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
          type="search"
          :placeholder="t('customerFilter')"
          @keyup.enter="runtime.applySnapshotFilters"
        />
      </div>
      <select v-model="filters.status" class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white transition-all min-w-[140px]">
        <option value="">{{ t('allStatuses') }}</option>
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <select v-model="filters.channel" class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white transition-all min-w-[140px]">
        <option value="">{{ t('allChannels') }}</option>
        <option v-for="option in channelOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <div class="flex items-center gap-2">
        <ActionButton variant="secondary" size="sm" @click="runtime.resetSnapshotFilters">
          {{ t('clearFilters') }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" @click="runtime.applySnapshotFilters">
          {{ t('applyFilters') }}
        </ActionButton>
      </div>
    </div>

    <!-- Metrics Inside Panel -->
    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 border-t border-slate-50 pt-6">
      <div 
        v-for="card in statusCards" 
        :key="card.key" 
        class="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center"
      >
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{{ card.label }}</p>
        <p class="text-lg font-black text-slate-900">{{ card.value }}</p>
      </div>
    </div>
  </SectionPanel>

  <article
    v-if="hasContextFilters"
    class="surface-card rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
          <p v-if="filters.customer" class="text-sm font-bold text-slate-900">
            {{ t('customerContext') }}: <span class="text-blue-600">{{ customerContextLabel }}</span>
          </p>
        </div>
        <p v-if="referenceContextLabel" class="text-xs font-medium text-slate-500 pl-4">
          {{ t('referenceContext') }}: {{ referenceContextLabel }}
        </p>
        <p v-if="channelStatusContextLabel" class="text-[10px] font-bold text-slate-400 uppercase pl-4">
          {{ channelStatusContextLabel }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ActionButton
          v-if="canStartAssignmentContext"
          variant="secondary"
          size="xs"
          @click="runtime.startAssignmentContext"
        >
          {{ t('startAssignmentContext') }}
        </ActionButton>
        <ActionButton
          v-if="canBlockAssignmentContext"
          variant="secondary"
          size="xs"
          @click="runtime.blockAssignmentContext"
        >
          {{ t('blockAssignmentContext') }}
        </ActionButton>
        <ActionButton
          v-if="canCloseAssignmentContext"
          variant="secondary"
          size="xs"
          @click="runtime.closeAssignmentContext"
        >
          {{ t('closeAssignmentContext') }}
        </ActionButton>
        <ActionButton
          v-if="canClearCallNoteContext"
          variant="secondary"
          size="xs"
          @click="runtime.clearCallNoteContext"
        >
          {{ t('clearCallFollowUpContext') }}
        </ActionButton>
        <ActionButton
          v-if="canCompleteReminderContext"
          variant="secondary"
          size="xs"
          @click="runtime.completeReminderContext"
        >
          {{ t('completeReminderContext') }}
        </ActionButton>
        <ActionButton
          v-if="canCancelReminderContext"
          variant="secondary"
          size="xs"
          @click="runtime.cancelReminderContext"
        >
          {{ t('cancelReminderContext') }}
        </ActionButton>
        <ActionButton
          v-if="canReturnToContext"
          variant="secondary"
          size="xs"
          @click="runtime.returnToContext"
        >
          {{ state.returnToLabel }}
        </ActionButton>
        <div class="h-6 w-px bg-slate-200 mx-1"></div>
        <ActionButton variant="link" size="xs" @click="runtime.clearContextFilters">
          <span class="text-rose-600 font-bold">{{ t('clearContext') }}</span>
        </ActionButton>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, unref } from "vue";
import ActionButton from "../app-shell/ActionButton.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
  filters: {
    type: Object,
    required: true,
  },
  runtime: {
    type: Object,
    required: true,
  },
  state: {
    type: Object,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

const statusOptions = computed(() => unref(props.state.statusOptions));
const channelOptions = computed(() => unref(props.state.channelOptions));
const statusCards = computed(() => unref(props.state.statusCards));
const customerContextLabel = computed(() => unref(props.state.customerContextLabel));
const referenceContextLabel = computed(() => unref(props.state.referenceContextLabel));
const channelStatusContextLabel = computed(() => unref(props.state.channelStatusContextLabel));
const hasContextFilters = computed(() => unref(props.state.hasContextFilters));
const canStartAssignmentContext = computed(() => unref(props.state.canStartAssignmentContext));
const canBlockAssignmentContext = computed(() => unref(props.state.canBlockAssignmentContext));
const canCloseAssignmentContext = computed(() => unref(props.state.canCloseAssignmentContext));
const canClearCallNoteContext = computed(() => unref(props.state.canClearCallNoteContext));
const canCompleteReminderContext = computed(() => unref(props.state.canCompleteReminderContext));
const canCancelReminderContext = computed(() => unref(props.state.canCancelReminderContext));
const canReturnToContext = computed(() => unref(props.state.canReturnToContext));
</script>
