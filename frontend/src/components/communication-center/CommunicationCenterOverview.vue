<template>
  <SectionPanel :title="t('filtersTitle')" :count="activeFilterCount" panel-class="surface-card rounded-2xl p-5">
    <WorkbenchFilterToolbar
      v-model="presetModel"
      :advanced-label="t('advancedFilters')"
      :collapse-label="t('hideAdvancedFilters')"
      :active-count="activeFilterCount"
      :active-count-label="t('activeFilters')"
      :preset-label="t('presetLabel')"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :save-label="t('savePreset')"
      :delete-label="t('deletePreset')"
      :apply-label="t('applyFilters')"
      :reset-label="t('clearFilters')"
      @preset-change="state.onPresetChange"
      @preset-save="state.savePreset"
      @preset-delete="state.deletePreset"
      @apply="runtime.applySnapshotFilters"
      @reset="runtime.resetSnapshotFilters"
    >
      <input
        v-model.trim="filters.customer"
        class="input"
        type="search"
        :placeholder="t('customerFilter')"
        @keyup.enter="runtime.applySnapshotFilters"
      />
      <select v-model="filters.status" class="input">
        <option value="">{{ t('allStatuses') }}</option>
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <select v-model="filters.channel" class="input">
        <option value="">{{ t('allChannels') }}</option>
        <option v-for="option in channelOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <template #advanced>
        <select v-model="filters.referenceDoctype" class="input">
          <option value="">{{ t('allReferenceTypes') }}</option>
          <option v-for="option in referenceDoctypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input
          v-model.trim="filters.referenceName"
          class="input"
          type="search"
          :placeholder="t('referenceNameFilter')"
          @keyup.enter="runtime.applySnapshotFilters"
        />
        <select v-model.number="filters.limit" class="input">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </template>

      <template #actionsSuffix>
        <ActionButton v-if="hasContextFilters" variant="link" size="xs" @click="runtime.clearContextFilters">
          {{ t('clearContext') }}
        </ActionButton>
      </template>
    </WorkbenchFilterToolbar>
  </SectionPanel>

  <article
    v-if="hasContextFilters"
    class="surface-card rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="space-y-1">
        <p v-if="filters.customer" class="text-sm font-medium text-sky-800">
          {{ t('customerContext') }}: {{ customerContextLabel }}
        </p>
        <p v-if="referenceContextLabel" class="text-xs font-medium text-sky-700">
          {{ t('referenceContext') }}: {{ referenceContextLabel }}
        </p>
        <p v-if="channelStatusContextLabel" class="text-xs text-sky-700">
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
          variant="link"
          size="xs"
          @click="runtime.returnToContext"
        >
          {{ state.returnToLabel }}
        </ActionButton>
        <ActionButton variant="link" size="xs" @click="runtime.clearContextFilters">{{ t('clearContext') }}</ActionButton>
      </div>
    </div>
  </article>

  <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
    <div v-for="card in statusCards" :key="card.key" class="mini-metric">
      <p class="mini-metric-label">{{ card.label }}</p>
      <p class="mini-metric-value">{{ card.value }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, unref } from "vue";
import ActionButton from "../app-shell/ActionButton.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import WorkbenchFilterToolbar from "../app-shell/WorkbenchFilterToolbar.vue";

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

const activeFilterCount = computed(() => unref(props.state.activeFilterCount));
const presetOptions = computed(() => unref(props.state.presetOptions));
const canDeletePreset = computed(() => unref(props.state.canDeletePreset));
const statusOptions = computed(() => unref(props.state.statusOptions));
const channelOptions = computed(() => unref(props.state.channelOptions));
const referenceDoctypeOptions = computed(() => unref(props.state.referenceDoctypeOptions));
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

const presetModel = computed({
  get() {
    return props.state.presetKey.value;
  },
  set(value) {
    props.state.presetKey.value = value;
  },
});
</script>
