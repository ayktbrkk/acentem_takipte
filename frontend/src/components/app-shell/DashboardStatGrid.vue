<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <DashboardStatCard
      v-for="card in cards"
      :key="card.key"
      :title="card.title"
      :value="card.value"
      :icon="card.icon"
      :t="t"
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
  t: {
    type: Function,
    required: true,
  },
});
</script>
