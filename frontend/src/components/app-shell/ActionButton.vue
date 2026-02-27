<template>
  <button :type="type" :class="buttonClass" :disabled="disabled">
    <slot />
    <span v-if="trailingIcon" aria-hidden="true">{{ trailingIcon }}</span>
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  type: { type: String, default: "button" },
  disabled: { type: Boolean, default: false },
  variant: {
    type: String,
    default: "secondary", // secondary | primary
  },
  size: {
    type: String,
    default: "xs", // xs | sm
  },
  trailingIcon: {
    type: String,
    default: "",
  },
});

const buttonClass = computed(() => {
  const base = "rounded-lg disabled:cursor-not-allowed disabled:opacity-60";
  const sizeClass =
    props.size === "sm"
      ? " px-3 py-1.5 text-sm"
      : " px-2.5 py-1 text-xs font-semibold";

  if (props.variant === "link") {
    const linkSize = props.size === "sm" ? " text-sm" : " text-xs";
    return `inline-flex items-center gap-1 font-medium text-slate-500 hover:text-slate-700 hover:underline underline-offset-2 disabled:no-underline disabled:text-slate-400${linkSize}`;
  }

  if (props.variant === "primary") {
    return `${base} bg-slate-900 text-white hover:bg-slate-800${sizeClass}`;
  }

  return `${base} border border-slate-300 text-slate-700 hover:bg-slate-100${sizeClass}`;
});
</script>
