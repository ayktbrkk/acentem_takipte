<template>
  <button
    :type="type"
    :class="buttonClass"
    :disabled="disabled"
    :aria-pressed="pressed == null ? undefined : pressed"
    @click="handleClick"
  >
    <slot />
    <span v-if="trailingIcon" aria-hidden="true">{{ trailingIcon }}</span>
  </button>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  type: { type: String, default: "button" },
  disabled: { type: Boolean, default: false },
  pressed: { type: Boolean, default: null },
  variant: {
    type: String,
    default: "secondary", // secondary | primary | link | ghost
  },
  size: {
    type: String,
    default: "xs", // xs | sm
  },
  trailingIcon: {
    type: String,
    default: "",
  },
  tone: {
    type: String,
    default: "default", // default | amber
  },
});

const emit = defineEmits(["click"]);

function handleClick(e) {
  if (!props.disabled) {
    emit("click", e);
  }
}

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
    return `${base} bg-brand-600 text-white hover:bg-brand-700 shadow-sm active:scale-95 transition-all duration-200${sizeClass}`;
  }

  if (props.variant === "ghost") {
    return `inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 disabled:text-slate-400${sizeClass}`;
  }

  if (props.pressed) {
    if (props.tone === "amber") {
      return `${base} border border-amber-400 bg-amber-200 text-amber-900${sizeClass}`;
    }
    return `${base} border border-sky-200 bg-sky-50 text-brand-700${sizeClass}`;
  }

  return `${base} border border-slate-300 text-slate-700 hover:bg-slate-100${sizeClass}`;
});
</script>
