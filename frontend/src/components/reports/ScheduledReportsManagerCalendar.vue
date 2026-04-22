<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-slate-900">{{ t('calendarTitle') }}</h3>
        <p class="text-sm text-slate-500">{{ t('calendarSubtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button 
          v-for="range in ranges" 
          :key="range.value"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
          :class="activeRange === range.value ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'"
          @click="activeRange = range.value"
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="i in 8" :key="i" class="h-48 bg-white border border-slate-100 rounded-2xl animate-pulse"></div>
    </div>

    <div v-else-if="!timeline.length" class="flex flex-col items-center justify-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl">
      <div class="p-4 bg-slate-50 rounded-full mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p class="text-slate-500 font-medium">{{ t('noEvents') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div 
        v-for="day in filteredTimeline" 
        :key="day.date" 
        class="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex flex-col">
            <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{{ formatDayName(day.date) }}</span>
            <span class="text-sm font-bold text-slate-900">{{ formatDateDisplay(day.date) }}</span>
          </div>
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-[10px] font-bold text-slate-600 border border-slate-100">
            {{ day.count }}
          </span>
        </div>

        <div class="space-y-2">
          <div 
            v-for="(event, idx) in day.events" 
            :key="idx"
            class="p-2 rounded-lg border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all group"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs font-semibold text-slate-800 line-clamp-1">{{ event.title }}</span>
              <span 
                class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter"
                :class="formatBadgeClass(event.format)"
              >
                {{ event.format }}
              </span>
            </div>
            <div class="mt-1.5 flex items-center gap-2">
              <span class="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ event.frequency }}
              </span>
              <span class="h-1 w-1 rounded-full bg-slate-300"></span>
              <span class="text-[10px] text-slate-500 font-medium truncate">
                {{ event.recipients[0] }}{{ event.recipients.length > 1 ? ` +${event.recipients.length - 1}` : '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { frappeRequest } from 'frappe-ui';

const props = defineProps({
  t: { type: Function, required: true },
  locale: { type: String, default: 'tr' }
});

const timeline = ref([]);
const loading = ref(false);
const activeRange = ref(7);

const ranges = computed(() => [
  { label: props.t('next7Days'), value: 7 },
  { label: props.t('next14Days'), value: 14 },
  { label: props.t('next30Days'), value: 30 }
]);

const filteredTimeline = computed(() => {
  return timeline.value.slice(0, activeRange.value);
});

async function fetchTimeline() {
  loading.value = true;
  try {
    const payload = await frappeRequest({
      url: '/api/method/acentem_takipte.acentem_takipte.api.reports.get_scheduled_reports_timeline',
      method: 'GET',
      params: { days: 30 }
    });
    timeline.value = payload?.message || [];
  } catch (err) {
    console.error('Failed to fetch timeline:', err);
  } finally {
    loading.value = false;
  }
}

function formatDayName(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(props.locale === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long' });
}

function formatDateDisplay(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(props.locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
}

function formatBadgeClass(format) {
  if (format === 'pdf') return 'bg-rose-50 text-rose-600 border border-rose-100';
  return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
}

onMounted(() => {
  fetchTimeline();
});

watch(activeRange, () => {
  // Re-fetch only if we need more data than we have, but we already fetch 30
});
</script>
