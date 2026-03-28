<script setup>
import HeroStrip from "../ui/HeroStrip.vue";

defineProps({
  cells: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <HeroStrip :cells="cells" />
</template>
