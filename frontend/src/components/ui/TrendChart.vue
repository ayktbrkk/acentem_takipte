<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <p class="text-sm font-medium text-gray-800">{{ title }}</p>
      <div class="flex items-center gap-3">
        <div v-for="(ds, i) in datasets" :key="i" class="flex items-center gap-1.5">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :style="`background: ${ds.secondary ? '#D1D5DB' : '#1B5DB8'}`"
          />
          <span class="text-xs text-gray-500">{{ ds.label }}</span>
        </div>
        <select
          v-model="period"
          class="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:border-brand-600 focus:outline-none"
        >
          <option value="6">Son 6 Ay</option>
          <option value="12">Son 12 Ay</option>
          <option value="ytd">Bu Yil</option>
        </select>
      </div>
    </div>

    <div class="p-4" style="height: 260px">
      <canvas ref="chartCanvas" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
// audit(perf/P-02): Selective chart.js imports for tree-shaking.
// chart.js/auto imports ALL chart types (~200KB). We only use Line here.
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

const props = defineProps({
  title: { type: String, required: true },
  labels: { type: Array, required: true },
  datasets: { type: Array, required: true },
  unit: { type: String, default: '' },
})

const emit = defineEmits(['period-change'])

const chartCanvas = ref(null)
const period = ref('6')
let chartInstance = null

const COLORS = {
  primary: '#1B5DB8',
  secondary: '#D1D5DB',
  gridLine: '#F3F4F6',
  tickText: '#9CA3AF',
}

function buildChart() {
  if (!chartCanvas.value) return
  if (chartInstance) chartInstance.destroy()

  chartInstance = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels: props.labels,
      datasets: props.datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.secondary ? COLORS.secondary : COLORS.primary,
        backgroundColor: ds.secondary ? 'transparent' : `${COLORS.primary}12`,
        borderWidth: ds.secondary ? 1.5 : 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: ds.secondary ? COLORS.secondary : COLORS.primary,
        tension: 0.4,
        fill: !ds.secondary,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#fff',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          titleColor: '#374151',
          bodyColor: '#6B7280',
          padding: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${props.unit}${ctx.parsed.y.toLocaleString('tr-TR')}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: COLORS.tickText, font: { size: 11 } },
          border: { display: false },
        },
        y: {
          grid: { color: COLORS.gridLine, drawBorder: false },
          ticks: {
            color: COLORS.tickText,
            font: { size: 11 },
            callback: (v) => `${props.unit}${Number(v).toLocaleString('tr-TR')}`,
          },
          border: { display: false },
        },
      },
    },
  })
}

watch(() => props.datasets, buildChart, { deep: true })
watch(() => props.labels, buildChart, { deep: true })
watch(period, (val) => emit('period-change', val))

onMounted(buildChart)
onUnmounted(() => chartInstance?.destroy())
</script>
