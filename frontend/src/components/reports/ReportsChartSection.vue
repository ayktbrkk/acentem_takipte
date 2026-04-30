<template>
  <div v-if="visibleCharts.length" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    <div 
      v-for="chartConfig in visibleCharts" 
      :key="chartConfig.id"
      class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
    >
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span class="h-2 w-2 rounded-full bg-brand-600"></span>
          {{ t_title(chartConfig.title) }}
        </h3>
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button class="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400" @click="downloadChart(chartConfig.id)">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
           </button>
        </div>
      </div>

      <div class="h-64 w-full relative">
        <canvas :id="'chart-' + chartConfig.id"></canvas>
      </div>

      <!-- Subtle Background Decorative Element -->
      <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-sky-50/70 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch, onBeforeUnmount, ref } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const props = defineProps({
  rows: { type: Array, default: () => [] },
  reportKey: { type: String, required: true },
  reportCatalog: { type: Object, default: () => ({}) },
  filters: { type: Object, default: () => ({}) },
  t: { type: Function, required: true },
  locale: { type: String, default: 'tr' }
});

const chartInstances = {};

const reportConfig = computed(() => props.reportCatalog[props.reportKey] || {});
const chartDefinitions = computed(() => reportConfig.value.charts || []);

const visibleCharts = computed(() => {
  return chartDefinitions.value.filter(cfg => {
    if (cfg.condition === 'granularity') {
      return !!props.filters.granularity;
    }
    // If granularity is ON, we might want to hide static charts
    if (props.filters.granularity && !cfg.condition) {
      return false;
    }
    return true;
  });
});

function t_title(titleObj) {
  if (typeof titleObj === 'string') return titleObj;
  return titleObj[props.locale] || titleObj['en'] || 'Chart';
}

function getChartData(cfg) {
  const data = props.rows;
  if (!data || !data.length) return null;

  const labels = [];
  const values = [];
  const map = {};

  data.forEach(row => {
    const label = row[cfg.label_field] || 'N/A';
    const val = Number(row[cfg.value_field] || 0);

    if (!map[label]) {
      map[label] = { sum: 0, count: 0, min: val, max: val };
      labels.push(label);
    }
    
    map[label].sum += val;
    map[label].count += 1;
    map[label].min = Math.min(map[label].min, val);
    map[label].max = Math.max(map[label].max, val);
  });

  labels.forEach(label => {
    const stat = map[label];
    if (cfg.aggregate === 'avg') {
      values.push(stat.sum / stat.count);
    } else if (cfg.aggregate === 'count') {
      values.push(stat.count);
    } else if (cfg.aggregate === 'max') {
      values.push(stat.max);
    } else {
      values.push(stat.sum);
    }
  });

  // Limit to top 10 for readability if not a trend
  if (cfg.type !== 'line' && labels.length > 10) {
     // Sort and take top 10
     const paired = labels.map((l, i) => ({ l, v: values[i] }));
     paired.sort((a, b) => b.v - a.v);
     const top = paired.slice(0, 10);
     return {
       labels: top.map(x => x.l),
       datasets: [{
         label: t_title(cfg.title),
         data: top.map(x => x.v),
         backgroundColor: generateColors(top.length, cfg.type),
         borderColor: cfg.type === 'line' ? '#1B5DB8' : 'transparent',
         tension: 0.4,
         borderRadius: cfg.type === 'bar' ? 8 : 0,
       }]
     };
  }

  return {
    labels,
    datasets: [{
      label: t_title(cfg.title),
      data: values,
      backgroundColor: generateColors(labels.length, cfg.type),
      borderColor: cfg.type === 'line' ? '#1B5DB8' : 'transparent',
      tension: 0.4,
      borderRadius: cfg.type === 'bar' ? 8 : 0,
      fill: cfg.type === 'line' ? {
        target: 'origin',
        above: 'rgba(27, 93, 184, 0.08)',
      } : false
    }]
  };
}

function generateColors(count, type) {
  const palette = [
    '#1B5DB8', '#10B981', '#F59E0B', '#EF4444',
    '#0EA5E9', '#475569', '#14B8A6', '#2563EB',
    '#84CC16', '#A855F7'
  ];
  
  if (type === 'line') return '#1B5DB8';
  if (type === 'bar') return palette.map(c => c + 'CC'); // 80% opacity
  
  return palette.slice(0, count);
}

function initCharts() {
  visibleCharts.value.forEach(cfg => {
    const ctx = document.getElementById('chart-' + cfg.id);
    if (!ctx) return;

    if (chartInstances[cfg.id]) {
      chartInstances[cfg.id].destroy();
    }

    const chartData = getChartData(cfg);
    if (!chartData) return;

    chartInstances[cfg.id] = new Chart(ctx, {
      type: cfg.type,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: cfg.type === 'pie',
            position: 'bottom',
            labels: {
              usePointStyle: true,
              font: { size: 10, weight: '600' },
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { size: 12, weight: 'bold' },
            padding: 12,
            cornerRadius: 12,
            displayColors: false
          }
        },
        scales: cfg.type === 'pie' ? {} : {
          y: {
            beginAtZero: true,
            grid: { display: false },
            border: { display: false },
            ticks: {
              font: { size: 10 },
              callback: (val) => formatCompact(val)
            }
          },
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              font: { size: 10 },
              maxRotation: 45,
              minRotation: 0
            }
          }
        }
      }
    });
  });
}

function formatCompact(val) {
  return new Intl.NumberFormat(props.locale === 'tr' ? 'tr-TR' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(val);
}

function downloadChart(id) {
  const chart = chartInstances[id];
  if (!chart) return;
  const url = chart.toBase64Image();
  const a = document.createElement('a');
  a.href = url;
  a.download = `chart-${id}.png`;
  a.click();
}

onMounted(() => {
  setTimeout(initCharts, 100);
});

onBeforeUnmount(() => {
  Object.values(chartInstances).forEach(c => c.destroy());
});

watch(() => [props.rows, props.reportKey, props.filters.granularity], () => {
  setTimeout(initCharts, 50);
}, { deep: true });

</script>
