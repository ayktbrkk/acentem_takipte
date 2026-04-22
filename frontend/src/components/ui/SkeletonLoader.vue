<template>
  <!--
    audit(perf/P-04): SkeletonLoader — reusable shimmer placeholder component.
    Hides the white blank screen between FCP and content being ready.
    Usage:
      <SkeletonLoader variant="card" />        → stat card row
      <SkeletonLoader variant="list" :rows="5" /> → list rows
      <SkeletonLoader variant="chart" />       → chart placeholder
      <SkeletonLoader variant="text" :rows="3" /> → text lines
  -->
  <div :class="wrapClass" aria-busy="true" aria-label="Yükleniyor...">
    <!-- STAT CARDS (e.g. Dashboard KPI row) -->
    <template v-if="variant === 'card'">
      <div
        v-for="i in count"
        :key="i"
        class="sk-card rounded-xl border border-gray-100 p-4"
      >
        <div class="sk-block mb-3 h-3 w-1/2 rounded" />
        <div class="sk-block h-7 w-3/4 rounded" />
        <div class="sk-block mt-2 h-2 w-1/3 rounded" />
      </div>
    </template>

    <!-- LIST ROWS (e.g. Policy list, Customer list) -->
    <template v-else-if="variant === 'list'">
      <div
        v-for="i in rows"
        :key="i"
        class="sk-row flex items-center gap-3 border-b border-gray-50 py-3 last:border-0"
      >
        <div class="sk-block h-8 w-8 shrink-0 rounded-full" />
        <div class="flex-1 space-y-1.5">
          <div class="sk-block h-3 w-2/3 rounded" />
          <div class="sk-block h-2 w-1/3 rounded" />
        </div>
        <div class="sk-block h-5 w-16 rounded-full" />
      </div>
    </template>

    <!-- CHART PLACEHOLDER -->
    <template v-else-if="variant === 'chart'">
      <div class="sk-block mb-3 h-3 w-1/3 rounded" />
      <div class="sk-block h-[200px] w-full rounded-lg" />
      <div class="mt-3 flex justify-center gap-4">
        <div class="sk-block h-2 w-12 rounded" />
        <div class="sk-block h-2 w-16 rounded" />
        <div class="sk-block h-2 w-10 rounded" />
      </div>
    </template>

    <!-- TEXT LINES (e.g. detail panels) -->
    <template v-else-if="variant === 'text'">
      <div
        v-for="i in rows"
        :key="i"
        class="sk-block mb-2 rounded last:mb-0"
        :style="{ height: '12px', width: lineWidth(i) }"
      />
    </template>

    <!-- DETAIL HEADER (e.g. CustomerDetail hero strip) -->
    <template v-else-if="variant === 'detail'">
      <div class="flex items-start gap-4">
        <div class="sk-block h-14 w-14 shrink-0 rounded-full" />
        <div class="flex-1 space-y-2">
          <div class="sk-block h-5 w-1/2 rounded" />
          <div class="sk-block h-3 w-1/3 rounded" />
          <div class="sk-block h-3 w-1/4 rounded" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
// audit(perf/P-04): Skeleton Loader — CSS-only shimmer animation.
// Uses linear-gradient + background-size animation, no JS overhead.
const props = defineProps({
  /** Layout variant: 'card' | 'list' | 'chart' | 'text' | 'detail' */
  variant: { type: String, default: 'list' },
  /** Number of skeleton rows (list / text variants) */
  rows: { type: Number, default: 4 },
  /** Number of stat cards (card variant) */
  count: { type: Number, default: 4 },
  /** Extra CSS classes on the wrapper */
  class: { type: String, default: '' },
})

const wrapClass = [
  props.variant === 'card' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : '',
  props.class,
].filter(Boolean).join(' ')

/** Returns alternating widths to make text skeletons look more natural */
function lineWidth(index) {
  const widths = ['100%', '85%', '92%', '70%', '88%', '60%']
  return widths[(index - 1) % widths.length]
}
</script>

<style scoped>
/* audit(perf/P-04): CSS-only shimmer — no JS animation loop */
.sk-block {
  background: linear-gradient(
    90deg,
    #f3f4f6 25%,
    #e5e7eb 50%,
    #f3f4f6 75%
  );
  background-size: 200% 100%;
  animation: sk-shimmer 1.4s infinite;
}

@keyframes sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
