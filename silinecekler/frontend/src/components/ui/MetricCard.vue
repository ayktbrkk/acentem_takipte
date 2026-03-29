<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4 transition-colors duration-150 hover:border-gray-300">
    <div class="mb-3 flex items-start justify-between">
      <p class="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">
        {{ label }}
      </p>
      <div
        v-if="icon"
        class="flex h-7 w-7 items-center justify-center rounded-md text-sm"
        :class="iconBgClass"
      >
        {{ icon }}
      </div>
    </div>

    <p class="mb-2 text-2xl font-medium leading-none" :class="valueClass">
      {{ value }}
    </p>

    <div v-if="change !== null && change !== undefined" class="flex items-center gap-1">
      <span class="text-xs font-medium" :class="change >= 0 ? 'text-green-600' : 'text-amber-700'">
        {{ change >= 0 ? '↑' : '↓' }}
        {{ Math.abs(change) }}%
      </span>
      <span class="text-xs text-gray-400">{{ changeLabel }}</span>
    </div>

    <p v-else-if="sub" class="text-xs text-gray-400">{{ sub }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  change: { type: Number, default: null },
  changeLabel: { type: String, default: 'gecen aya gore' },
  sub: { type: String, default: '' },
  icon: { type: String, default: '' },
  variant: { type: String, default: 'default' },
})

const valueClass = computed(
  () =>
    ({
      default: 'text-gray-900',
      warn: 'text-amber-600',
      success: 'text-green-700',
      danger: 'text-amber-700',
    }[props.variant] ?? 'text-gray-900')
)

const iconBgClass = computed(
  () =>
    ({
      default: 'bg-brand-50 text-brand-600',
      warn: 'bg-amber-50 text-amber-600',
      success: 'bg-green-50 text-green-700',
      danger: 'bg-amber-50 text-amber-700',
    }[props.variant] ?? 'bg-brand-50 text-brand-600')
)
</script>
