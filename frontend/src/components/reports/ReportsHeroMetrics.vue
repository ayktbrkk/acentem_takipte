<template>
  <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
    <div
      v-for="item in items"
      :key="item.label"
      class="mini-metric"
    >
      <p class="mini-metric-label">
        {{ item.label }}
      </p>
      <p class="mini-metric-value" :class="item.valueClass">
        {{ item.value }}
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});
</script>
