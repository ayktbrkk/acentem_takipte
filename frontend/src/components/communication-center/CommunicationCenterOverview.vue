<template>
  <div class="mb-6">
    <SmartFilterBar
      v-model="filters.customer"
      :placeholder="t('customerFilter')"
      :advanced-label="t('advancedFilters')"
      @open-advanced="showAdvanced = !showAdvanced"
    >
      <template #primary-filters>
        <ATSelect
          v-model="filters.status"
          :placeholder="t('allStatuses')"
          :options="statusOptions"
          @change="runtime.applySnapshotFilters"
        />
        <ATSelect
          v-model="filters.channel"
          :placeholder="t('allChannels')"
          :options="channelOptions"
          @change="runtime.applySnapshotFilters"
        />
        <div class="h-4 w-px bg-slate-200 mx-1"></div>
        <FilterPresetMenu
          :model-value="presetKey"
          :label="t('presetLabel')"
          :options="presetOptions"
          :can-delete="canDeletePreset"
          :show-save="true"
          :show-delete="true"
          :save-label="t('savePreset')"
          :delete-label="t('deletePreset')"
          @update:model-value="$emit('update:presetKey', $event)"
          @change="onPresetChange"
          @save="savePreset"
          @delete="deletePreset"
        />
        <ActionButton variant="primary" size="sm" @click="$emit('apply-filters')">
          {{ t('applyFilters') }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" :aria-label="t('clearFilters')" @click="$emit('reset-filters')">
          <FeatherIcon name="x" class="h-4 w-4" />
          {{ t('clearFilters') }}
        </ActionButton>
      </template>
    </SmartFilterBar>

    <div v-if="showAdvanced" class="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span>{{ t('allReferenceTypes') }}</span>
          <ATSelect
            v-model="filters.referenceDoctype"
            :placeholder="t('allReferenceTypes')"
            :options="referenceDoctypeOptions"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span>{{ t('referenceNameFilter') }}</span>
          <input v-model.trim="filters.referenceName" class="input" type="search" />
        </label>
        <label class="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          <span>{{ t('limitLabel') }}</span>
          <select v-model.number="filters.limit" class="input">
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </label>
      </div>
      <p v-if="activeFilterCount > 0" class="mt-4 text-xs font-medium text-slate-500">
        {{ activeFilterCount }} {{ t('activeFilters') }}
      </p>
    </div>
  </div>

  <article
    v-if="hasContextFilters"
    class="mb-6 surface-card rounded-2xl border border-brand-100 bg-brand-50/50 p-5 shadow-sm"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <div class="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></div>
          <p v-if="filters.customer" class="text-sm font-semibold text-slate-900">
            {{ t('customerContext') }}: <span class="text-brand-600">{{ customerContextLabel }}</span>
          </p>
        </div>
        <p v-if="referenceContextLabel" class="text-xs font-medium text-slate-500 pl-4">
          {{ t('referenceContext') }}: {{ referenceContextLabel }}
        </p>
        <p v-if="channelStatusContextLabel" class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 pl-4">
          {{ channelStatusContextLabel }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ActionButton
          v-if="canStartAssignmentContext"
          variant="secondary"
          size="sm"
          @click="runtime.startAssignmentContext"
        >
          {{ t('startAssignmentContext') }}
        </ActionButton>
        <ActionButton
          v-if="canBlockAssignmentContext"
          variant="secondary"
          size="sm"
          @click="runtime.blockAssignmentContext"
        >
          {{ t('blockAssignmentContext') }}
        </ActionButton>
        <ActionButton
          v-if="canCloseAssignmentContext"
          variant="secondary"
          size="sm"
          @click="runtime.closeAssignmentContext"
        >
          {{ t('closeAssignmentContext') }}
        </ActionButton>
        <ActionButton
          v-if="canClearCallNoteContext"
          variant="secondary"
          size="sm"
          @click="runtime.clearCallNoteContext"
        >
          {{ t('clearCallFollowUpContext') }}
        </ActionButton>
        <ActionButton
          v-if="canCompleteReminderContext"
          variant="secondary"
          size="sm"
          @click="runtime.completeReminderContext"
        >
          {{ t('completeReminderContext') }}
        </ActionButton>
        <ActionButton
          v-if="canCancelReminderContext"
          variant="secondary"
          size="sm"
          @click="runtime.cancelReminderContext"
        >
          {{ t('cancelReminderContext') }}
        </ActionButton>
        <ActionButton
          v-if="canReturnToContext"
          variant="secondary"
          size="sm"
          @click="runtime.returnToContext"
        >
          {{ state.returnToLabel }}
        </ActionButton>
        <div class="h-6 w-px bg-slate-200 mx-1"></div>
        <ActionButton variant="ghost" size="sm" class="!text-rose-600 hover:!bg-rose-50" @click="runtime.clearContextFilters">
          {{ t('clearContext') }}
        </ActionButton>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, unref } from "vue";
import SmartFilterBar from "../app-shell/SmartFilterBar.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import FilterPresetMenu from "../app-shell/FilterPresetMenu.vue";
import { FeatherIcon } from "frappe-ui";
import ATSelect from "../ui/ATSelect.vue";

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
  presetKey: {
    type: String,
    default: "",
  },
  presetOptions: {
    type: Array,
    default: () => [],
  },
  canDeletePreset: {
    type: Boolean,
    default: false,
  },
  onPresetChange: {
    type: Function,
    required: true,
  },
  savePreset: {
    type: Function,
    required: true,
  },
  deletePreset: {
    type: Function,
    required: true,
  },
});

defineEmits(["update:presetKey", "apply-filters", "reset-filters"]);

const showAdvanced = ref(false);

const statusOptions = computed(() => unref(props.state.statusOptions));
const channelOptions = computed(() => unref(props.state.channelOptions));
const referenceDoctypeOptions = computed(() => unref(props.state.referenceDoctypeOptions));
const activeFilterCount = computed(() => unref(props.state.activeFilterCount));
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
