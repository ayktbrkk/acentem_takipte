<template>
  <div 
    class="grid gap-3" 
    :style="layout === 'list' ? 'grid-template-columns: 1fr' : `grid-template-columns: repeat(${cols}, minmax(0,1fr))`"
  >
    <div
      v-for="(field, fieldIndex) in normalizedFields"
      :key="field.key || field.label || fieldIndex"
      :style="field.span ? { gridColumn: `span ${field.span} / span ${field.span}` } : undefined"
      :class="[
        layout === 'list' && 'flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0',
        field.type === 'divider' && 'col-span-full border-t border-slate-100 mt-2 mb-1 pt-0'
      ]"
    >
      <template v-if="field.type === 'divider'">
         <div v-if="field.label" class="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-2">{{ field.label }}</div>
      </template>
      <template v-else>
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

        <div v-else class="flex items-center gap-1.5" :class="[layout === 'list' && 'text-right']">
          <div 
            :class="[
              fieldValueClass(field.variant), 
              layout === 'list' && 'font-bold text-slate-900',
              !field.value && 'text-slate-400 italic font-normal',
              field.valueClass
            ]"
          >
            {{ field.value || field.unspecifiedLabel || '—' }}
          </div>
          
          <button 
            v-if="field.copyable && field.value" 
            class="text-slate-300 hover:text-brand-600 transition-colors p-0.5"
            @click.stop="$emit('copy', field.value)"
            title="Kopyala"
          >
            <FeatherIcon name="copy" class="h-3 w-3" />
          </button>
        </div>
      </template>
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

defineEmits(["copy"]);

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
