<template>
  <article
    :class="[
      isDense
        ? 'group relative border-b border-slate-100 bg-white px-3.5 py-2 last:border-b-0'
        : 'rounded-xl border border-slate-200 bg-slate-50/80 p-4',
      isDense && emphasisClass,
      stretch && 'flex h-full flex-col',
      clickable && 'cursor-pointer transition hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-sky-500/30',
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div
      v-if="isDense"
      class="grid min-h-[56px] grid-cols-[132px_minmax(0,1fr)_112px] items-center gap-3.5"
    >
      <div class="flex min-w-0 flex-col justify-center overflow-hidden">
        <div v-if="$slots.caption" class="mb-1 flex min-h-4 items-center gap-1.5 overflow-hidden text-[10px] leading-4 text-slate-500">
          <slot name="caption" />
        </div>
        <p v-if="denseIdentityText" class="truncate text-sm font-medium text-slate-700" :class="titleClass">{{ denseIdentityText }}</p>
        <p v-if="denseIdentityMeta" class="truncate text-xs text-slate-400" :class="subtitleClass">{{ denseIdentityMeta }}</p>
      </div>

      <div class="min-w-0 flex flex-col justify-center pr-1">
        <div class="truncate text-sm font-semibold text-slate-800">
          <slot />
        </div>
        <div v-if="$slots.footer" class="mt-0.5 truncate text-xs text-slate-500">
          <slot name="footer" />
        </div>
      </div>

      <div class="flex min-w-0 flex-col items-end justify-center text-right">
        <slot name="trailing" />

        <div v-if="$slots.date" class="mt-1 min-w-0 text-right">
          <slot name="date" />
        </div>

        <div class="mt-1 flex items-center justify-end">
          <slot v-if="$slots.actions" name="actions" />
          <svg
            v-else-if="clickable"
            class="h-3.5 w-3.5 text-slate-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      </div>
    </div>
    <template v-else>
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-slate-900" :class="titleClass">{{ title }}</p>
          <p v-if="subtitle" class="mt-1 text-xs text-slate-500" :class="subtitleClass">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.trailing" class="shrink-0">
          <slot name="trailing" />
        </div>
      </div>

      <div v-if="$slots.default" :class="[stretch ? 'mt-2 flex-1' : 'mt-2']">
        <slot />
      </div>

      <div v-if="$slots.footer" class="mt-3">
        <slot name="footer" />
      </div>
    </template>
  </article>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: { type: String, default: "-" },
  subtitle: { type: String, default: "" },
  titleClass: { type: String, default: "" },
  subtitleClass: { type: String, default: "" },
  stretch: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  dense: { type: Boolean, default: false },
  layout: { type: String, default: "default" },
  emphasisClass: { type: String, default: "" },
});
const emit = defineEmits(["click"]);
const isDense = computed(() => props.dense || props.layout === "dense");
const denseIdentityText = computed(() => cleanDisplay(props.title));
const denseIdentityMeta = computed(() => cleanDisplay(props.subtitle));

function cleanDisplay(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "-" || normalized === "—") return "";
  return normalized;
}

function handleClick(event) {
  if (!props.clickable) return;
  emit("click", event);
}
</script>
