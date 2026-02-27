<template>
  <div class="min-w-0">
    <p class="font-medium text-slate-800" :class="titleClass">{{ title || "-" }}</p>
    <MiniFactList v-if="facts.length" class="mt-2" :items="facts" />
    <div v-if="$slots.default" class="mt-2">
      <slot />
    </div>
  </div>
</template>

<script setup>
import MiniFactList from "./MiniFactList.vue";

defineProps({
  title: {
    type: String,
    default: "-",
  },
  titleClass: {
    type: String,
    default: "",
  },
  facts: {
    type: Array,
    default: () => [],
  },
});
</script>
