<template>
  <article class="surface-card rounded-2xl p-5">
    <div class="flex items-center justify-between mb-6">
      <ScheduledReportsManagerHeader
        class="flex-1"
        :title="t('title')"
        :subtitle="t('subtitle')"
        :run-label="t('run')"
        :new-label="t('new')"
        :loading="loading"
        :running="running"
        @run="$emit('run')"
        @new="beginCreate"
      />
      <div class="flex items-center bg-slate-100 p-1 rounded-xl ml-4">
        <button 
          class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
          :class="activeView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="activeView = 'list'"
        >
          {{ t('listView') || 'List' }}
        </button>
        <button 
          class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all"
          :class="activeView === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
          @click="activeView = 'calendar'"
        >
          {{ t('calendarView') || 'Calendar' }}
        </button>
      </div>
    </div>

    <transition name="fade" mode="out-in">
      <div :key="activeView">
        <ScheduledReportsManagerList
          v-if="activeView === 'list'"
          class="mt-4"
          :items="items"
          :loading="loading"
          :running="running"
          :loading-label="t('loading')"
          :empty-label="t('empty')"
          :report-label="reportLabel"
          :enabled-label="t('enabled')"
          :disabled-label="t('disabled')"
          :frequency-label="t('frequency')"
          :format-label="t('format')"
          :delivery-channel-label="t('deliveryChannel')"
          :limit-label="t('limit')"
          :last-run-label="t('lastRun')"
          :last-status-label="t('lastStatus')"
          :recipients-label="t('recipients')"
          :filters-label="t('filters')"
          :edit-label="t('edit')"
          :remove-label="t('remove')"
          :format-delivery-channel="deliveryChannelLabel"
          :format-last-run="formatLastRun"
          :format-last-status="lastStatusLabel"
          :format-filters="formatFilters"
          @edit="beginEdit"
          @remove="askRemove"
        />

        <ScheduledReportsManagerCalendar
          v-else
          :t="t"
          :locale="locale"
        />
      </div>
    </transition>

    <ScheduledReportsManagerForm
      :visible="form.visible"
      :form="form"
      :form-error="formError"
      :report-options="reportOptions"
      :is-filter-visible="isFilterVisible"
      :create-title="t('createTitle')"
      :edit-title="t('editTitle')"
      :cancel-label="t('cancel')"
      :save-label="t('save')"
      :report-key-label="t('reportKey')"
      :frequency-label="t('frequency')"
      :format-label="t('format')"
      :delivery-channel-label="t('deliveryChannel')"
      :delivery-email-label="t('deliveryEmail')"
      :delivery-outbox-label="t('deliveryOutbox')"
      :limit-label="t('limit')"
      :weekday-label="t('weekday')"
      :day-of-month-label="t('dayOfMonth')"
      :enabled-label="t('enabled')"
      :recipients-label="t('recipients')"
      :recipients-placeholder="t('recipientsPlaceholder')"
      :filters-label="t('filters')"
      :office-branch-label="t('officeBranch')"
      :insurance-branch-label="t('insuranceBranch')"
      :insurance-company-label="t('insuranceCompany')"
      :sales-entity-label="t('salesEntity')"
      :status-label="t('status')"
      :from-date-label="t('fromDate')"
      :to-date-label="t('toDate')"
      :add-alert="addAlert"
      :remove-alert="removeAlert"
      @submit="submit"
      @cancel="resetForm"
    />
  </article>
</template>

<script setup>
import { ref } from "vue";
import ScheduledReportsManagerHeader from "./ScheduledReportsManagerHeader.vue";
import ScheduledReportsManagerList from "./ScheduledReportsManagerList.vue";
import ScheduledReportsManagerCalendar from "./ScheduledReportsManagerCalendar.vue";
import ScheduledReportsManagerForm from "./ScheduledReportsManagerForm.vue";
import { useScheduledReportsManager } from "../../composables/useScheduledReportsManager";

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
  locale: { type: String, default: "en" },
  reportCatalog: { type: Object, default: () => ({}) },
  activeOfficeBranch: { type: String, default: "" },
});

const emit = defineEmits(["run", "save", "remove"]);

const activeView = ref("list");

const {
  t,
  form,
  formError,
  reportOptions,
  beginCreate,
  beginEdit,
  resetForm,
  submit,
  askRemove,
  reportLabel,
  isFilterVisible,
  deliveryChannelLabel,
  formatLastRun,
  lastStatusLabel,
  formatFilters,
  addAlert,
  removeAlert,
} = useScheduledReportsManager(props, emit);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
