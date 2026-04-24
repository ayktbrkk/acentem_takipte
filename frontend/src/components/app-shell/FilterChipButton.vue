<template>
  <button :type="type" :disabled="disabled" :class="chipClass" @click="$emit('click', $event)">
    <slot />
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  type: { type: String, default: "button" },
  disabled: { type: Boolean, default: false },
  active: { type: Boolean, default: false },
  theme: {
    type: String,
    default: "neutral", // neutral | hero
  },
  size: {
    type: String,
    default: "sm", // sm | xs
  },
});

defineEmits(["click"]);

const chipClass = computed(() => {
  const base = "rounded-lg border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";
  const sizeClass = props.size === "xs" ? " px-2 py-1 text-xs" : " px-3 py-1.5 text-xs";

  if (props.theme === "hero") {
    return `${base}${sizeClass} ${
      props.active
        ? " border-white/40 bg-white/20 text-white"
        : " border-white/20 bg-brand-600/20 text-white/80 hover:bg-brand-600/35"
    }`;
  }

  return `${base}${sizeClass} ${
    props.active
      ? " border-slate-900 bg-brand-600 text-white"
      : " border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
  }`;
});
</script>

