<template>
  <div class="grid gap-3" :style="`grid-template-columns: repeat(${cols}, minmax(0,1fr))`">
    <div
      v-for="(field, fieldIndex) in fields"
      :key="field.key || field.label || fieldIndex"
      :style="field.span ? { gridColumn: `span ${field.span} / span ${field.span}` } : undefined"
    >
      <div class="field-label">{{ field.label }}</div>

      <div v-if="field.variant === 'badges'" class="mt-1 flex flex-wrap gap-1.5">
        <span
          v-for="(b, badgeIndex) in field.badges"
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
defineProps({
  fields: { type: Array, required: true },
  cols: { type: Number, default: 2 },
});

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
