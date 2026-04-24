<template>
  <div class="hero-strip" :style="`grid-template-columns: repeat(${cells.length}, minmax(0,1fr))`">
    <div v-for="cell in cells" :key="cell.label" class="hero-cell">
      <div class="hero-label">{{ cell.label }}</div>
      <div :class="valueClass(cell.variant)">
        {{ cell.value }}
        <span v-if="cell.suffix" class="ml-1 text-xs font-normal text-gray-400">
          {{ cell.suffix }}
        </span>
      </div>
      <div v-if="cell.sub" class="mt-0.5 text-xs text-gray-400">{{ cell.sub }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({ cells: { type: Array, required: true } });

function valueClass(variant) {
  return (
    {
      default: "hero-value",
      lg: "hero-value-lg",
      accent: "hero-value-accent",
      warn: "hero-value-warn",
      success: "hero-value text-green-700 font-medium",
      "success-pill": "hero-value-pill hero-value-pill-success",
      "waiting-pill": "hero-value-pill hero-value-pill-waiting",
      "cancel-pill": "hero-value-pill hero-value-pill-cancel",
    }[variant] ?? "hero-value"
  );
}
</script>