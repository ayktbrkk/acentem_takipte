<template>
  <div class="mb-6">
    <SmartFilterBar
      v-model="filters.customer"
      :placeholder="t('customerFilter')"
      @open-advanced="showAdvanced = !showAdvanced"
    >
      <template #primary-filters>
        <select v-model="filters.status" class="input h-9 py-1 text-sm min-w-[140px]" @change="runtime.applySnapshotFilters">
          <option value="">{{ t('allStatuses') }}</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="filters.channel" class="input h-9 py-1 text-sm min-w-[140px]" @change="runtime.applySnapshotFilters">
          <option value="">{{ t('allChannels') }}</option>
          <option v-for="option in channelOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <div class="h-4 w-px bg-slate-200 mx-1"></div>
        <button class="btn btn-primary" @click="runtime.applySnapshotFilters">
          {{ t('applyFilters') }}
        </button>
        <button class="btn btn-outline" @click="runtime.resetSnapshotFilters">
          <FeatherIcon name="x" class="h-4 w-4" />
        </button>
      </template>
    </SmartFilterBar>
  </div>

  <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
    <SaaSMetricCard
      v-for="card in statusCards"
      :key="card.key"
      :label="card.label"
      :value="card.value"
    />
  </div>

  <article
    v-if="hasContextFilters"
    class="mb-6 surface-card rounded-2xl border border-brand-100 bg-brand-50/50 p-5 shadow-sm"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></div>
          <p v-if="filters.customer" class="text-sm font-bold text-slate-900">
            {{ t('customerContext') }}: <span class="text-brand-600">{{ customerContextLabel }}</span>
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
        <button
          v-if="canStartAssignmentContext"
          class="btn btn-outline btn-sm"
          @click="runtime.startAssignmentContext"
        >
          {{ t('startAssignmentContext') }}
        </button>
        <button
          v-if="canBlockAssignmentContext"
          class="btn btn-outline btn-sm"
          @click="runtime.blockAssignmentContext"
        >
          {{ t('blockAssignmentContext') }}
        </button>
        <button
          v-if="canCloseAssignmentContext"
          class="btn btn-outline btn-sm"
          @click="runtime.closeAssignmentContext"
        >
          {{ t('closeAssignmentContext') }}
        </button>
        <button
          v-if="canClearCallNoteContext"
          class="btn btn-outline btn-sm"
          @click="runtime.clearCallNoteContext"
        >
          {{ t('clearCallFollowUpContext') }}
        </button>
        <button
          v-if="canCompleteReminderContext"
          class="btn btn-outline btn-sm"
          @click="runtime.completeReminderContext"
        >
          {{ t('completeReminderContext') }}
        </button>
        <button
          v-if="canCancelReminderContext"
          class="btn btn-outline btn-sm"
          @click="runtime.cancelReminderContext"
        >
          {{ t('cancelReminderContext') }}
        </button>
        <button
          v-if="canReturnToContext"
          class="btn btn-outline btn-sm"
          @click="runtime.returnToContext"
        >
          {{ state.returnToLabel }}
        </button>
        <div class="h-6 w-px bg-slate-200 mx-1"></div>
        <button class="btn btn-outline btn-sm text-rose-600 border-rose-100 hover:bg-rose-50" @click="runtime.clearContextFilters">
          {{ t('clearContext') }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, unref } from "vue";
import SmartFilterBar from "../app-shell/SmartFilterBar.vue";
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";
import { FeatherIcon } from "frappe-ui";

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

const showAdvanced = ref(false);

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
