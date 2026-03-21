<template>
  <div class="grid gap-3" :style="`grid-template-columns: repeat(${cols}, minmax(0,1fr))`">
    <div
      v-for="(field, fieldIndex) in normalizedFields"
      :key="field.key || field.label || fieldIndex"
      :style="field.span ? { gridColumn: `span ${field.span} / span ${field.span}` } : undefined"
    >
      <div class="field-label">{{ field.label }}</div>

      <div v-if="field.variant === 'badges'" class="mt-1 flex flex-wrap gap-1.5">
        <span
          v-for="(b, badgeIndex) in badgeItems(field)"
          :key="b.key || b.label || badgeIndex"
          :class="['badge', `badge-${b.color ?? 'gray'}`]"
        >
          {{ b.label }}
        </span>
      </div>

      <div v-else :class="fieldValueClass(field.variant)">
        {{ field.value ?? '—' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  fields: { type: Array, default: () => [] },
  cols: { type: Number, default: 2 },
});

const normalizedFields = computed(() => (Array.isArray(props.fields) ? props.fields : []));

function badgeItems(field) {
  return Array.isArray(field?.badges) ? field.badges : [];
}

function fieldValueClass(variant) {
  return (
    {
      default: "field-value",
      lg: "field-value-lg",
      mono: "field-value-mono",
      muted: "field-value-muted",
      accent: "field-value-accent",
      success: "field-value-success",
    }[variant] ?? "field-value"
  );
}
</script>
