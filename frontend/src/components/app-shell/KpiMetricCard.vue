<template>
  <article class="at-metric-card">
    <p class="at-metric-label">
      {{ label }}
    </p>
    <p class="at-metric-value">{{ value }}</p>
    <p v-if="hint" class="at-metric-hint">{{ hint }}</p>
  </article>
</template>

<script setup>
defineProps({
  label: { type: String, default: "" },
  value: { type: [String, Number], default: "-" },
  hint: { type: String, default: "" },
});
</script>
