<template>
  <div 
    class="grid gap-3" 
    :style="layout === 'list' ? 'grid-template-columns: 1fr' : `grid-template-columns: repeat(${cols}, minmax(0,1fr))`"
  >
    <div
      v-for="(field, fieldIndex) in normalizedFields"
      :key="field.key || field.label || fieldIndex"
      :style="field.span ? { gridColumn: `span ${field.span} / span ${field.span}` } : undefined"
      :class="[layout === 'list' && 'flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0']"
    >
      <div class="field-label" :class="[layout === 'list' && 'mb-0']">{{ field.label }}</div>

      <div v-if="field.variant === 'badges'" class="mt-1 flex flex-wrap gap-1.5">
        <span
          v-for="(b, badgeIndex) in badgeItems(field)"
          :key="b.key || b.label || badgeIndex"
          :class="['badge', `badge-${b.color ?? 'gray'}`]"
        >
          {{ b.label }}
        </span>
      </div>

      <div v-else :class="[fieldValueClass(field.variant), layout === 'list' && 'text-right font-semibold']">
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
  layout: { type: String, default: "grid" }, // 'grid' or 'list'
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
