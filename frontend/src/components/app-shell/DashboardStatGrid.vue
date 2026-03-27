<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <DashboardStatCard
      v-for="card in cards"
      :key="card.key"
      :title="card.title"
      :value="card.value"
      :trend-text="card.trendText"
      :trend-class="card.trendClass"
      :trend-hint="card.trendHint"
      :icon="card.icon"
    />
  </div>
</template>

<script setup>
import DashboardStatCard from "../DashboardStatCard.vue";

defineProps({
  cards: {
    type: Array,
    default: () => [],
  },
});
</script>
