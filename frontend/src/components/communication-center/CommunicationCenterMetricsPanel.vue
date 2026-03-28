<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
    <div v-for="card in statusCards" :key="card.key" class="mini-metric">
      <p class="mini-metric-label">{{ card.label }}</p>
      <p class="mini-metric-value">{{ card.value }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  statusCards: {
    type: Array,
    default: () => [],
  },
});
</script>
