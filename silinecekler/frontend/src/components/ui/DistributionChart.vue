<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <p class="text-sm font-medium text-gray-800">{{ title }}</p>
      <div class="overflow-hidden rounded-md border border-gray-200 text-xs">
        <button
          :class="['px-3 py-1 transition-colors', activeType === 'bar' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50']"
          @click="activeType = 'bar'"
        >
          Bar
        </button>
        <button
          :class="['px-3 py-1 transition-colors', activeType === 'donut' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-50']"
          @click="activeType = 'donut'"
        >
          Halka
        </button>
      </div>
    </div>

    <div class="p-4">
      <div v-if="activeType === 'bar'">
        <div v-for="item in items" :key="item.label" class="mb-3 flex items-center gap-3 last:mb-0">
          <span class="w-14 shrink-0 text-right text-xs text-gray-500">{{ item.label }}</span>
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div class="h-full rounded-full transition-all duration-500" :style="`width: ${item.pct}%; background: ${item.color}`" />
          </div>
          <span class="w-16 shrink-0 text-right text-xs font-medium text-gray-700">
            {{ Number(item.value || 0).toLocaleString('tr-TR') }}{{ valueSuffix }}
          </span>
          <span class="w-8 shrink-0 text-right text-xs text-gray-400">%{{ item.pct }}</span>
        </div>
      </div>

      <div v-else class="flex items-center gap-6">
        <div class="relative h-32 w-32 shrink-0">
          <canvas ref="donutCanvas" width="128" height="128" />
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <p class="text-lg font-medium leading-none text-gray-900">{{ total.toLocaleString('tr-TR') }}</p>
            <p class="mt-0.5 text-[10px] text-gray-400">toplam</p>
          </div>
        </div>
        <div class="flex-1">
          <div v-for="item in items" :key="item.label" class="mb-2 flex items-center gap-2 last:mb-0">
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="`background: ${item.color}`" />
            <span class="flex-1 text-xs text-gray-600">{{ item.label }}</span>
            <span class="text-xs font-medium text-gray-800">%{{ item.pct }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'

const props = defineProps({
  title: { type: String, required: true },
  type: { type: String, default: 'bar' },
  items: { type: Array, required: true },
  valueSuffix: { type: String, default: '' },
})

const activeType = ref(props.type)
const donutCanvas = ref(null)
let donutInstance = null

const total = computed(() => props.items.reduce((s, i) => s + Number(i?.value || 0), 0))

function buildDonut() {
  if (!donutCanvas.value) return
  if (donutInstance) donutInstance.destroy()

  donutInstance = new Chart(donutCanvas.value, {
    type: 'doughnut',
    data: {
      labels: props.items.map((i) => i.label),
      datasets: [
        {
          data: props.items.map((i) => i.value),
          backgroundColor: props.items.map((i) => i.color),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#fff',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          titleColor: '#374151',
          bodyColor: '#6B7280',
          padding: 8,
        },
      },
    },
  })
}

watch(activeType, (val) => {
  if (val === 'donut') nextTick(buildDonut)
  else donutInstance?.destroy()
})

watch(
  () => props.items,
  () => {
    if (activeType.value === 'donut') nextTick(buildDonut)
  },
  { deep: true }
)

onMounted(() => {
  if (activeType.value === 'donut') buildDonut()
})

onUnmounted(() => donutInstance?.destroy())
</script>
