<template>
  <li
    :class="[
      isDense
        ? 'group relative border-b border-slate-100 bg-white px-3.5 py-2 last:border-b-0'
        : 'rounded-xl border border-slate-200 bg-slate-50 p-3',
      isDense && emphasisClass,
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
        <p v-if="denseIdentityText" class="truncate text-sm font-medium text-slate-700">{{ denseIdentityText }}</p>
        <p v-if="denseIdentityMeta" class="truncate text-xs text-slate-400">{{ denseIdentityMeta }}</p>
      </div>

      <div class="min-w-0 flex flex-col" :class="denseSecondaryText ? 'justify-center' : 'justify-center'">
        <p v-if="densePrimaryText" :class="resolvedDenseDescriptionClass">{{ densePrimaryText }}</p>
        <p v-if="denseSecondaryText" class="mt-0.5 truncate text-xs text-slate-500">{{ denseSecondaryText }}</p>
      </div>

      <div class="flex min-w-0 flex-col items-end justify-center text-right">
        <slot v-if="$slots.trailing" name="trailing" />

        <div v-if="$slots.date || $slots.default" class="mt-1 flex min-w-0 flex-col items-end text-right">
          <slot v-if="$slots.date" name="date" />
          <slot />
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
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-slate-900">{{ title }}</p>
          <p v-if="subtitle" class="mt-1 text-xs text-slate-500">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.trailing" class="shrink-0">
          <slot name="trailing" />
        </div>
      </div>

      <div>
        <p v-if="description" :class="descriptionClass">{{ description }}</p>
        <p v-if="meta" class="mt-1 text-xs text-slate-500">{{ meta }}</p>
      </div>
      <slot />
    </template>
  </li>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  title: { type: String, default: "-" },
  subtitle: { type: String, default: "" },
  description: { type: String, default: "" },
  descriptionClass: { type: String, default: "mt-2 text-sm text-slate-700" },
  denseDescriptionClass: { type: String, default: "truncate text-[13px] font-semibold text-slate-900" },
  meta: { type: String, default: "" },
  clickable: { type: Boolean, default: false },
  dense: { type: Boolean, default: false },
  layout: { type: String, default: "default" },
  emphasisClass: { type: String, default: "" },
});

const emit = defineEmits(["click"]);
const isDense = computed(() => props.dense || props.layout === "dense");
const denseIdentityText = computed(() => cleanDisplay(props.title));
const denseIdentityMeta = computed(() => cleanDisplay(props.subtitle));
const densePrimaryText = computed(() => cleanDisplay(props.description) || denseIdentityText.value);
const denseSecondaryText = computed(() => cleanDisplay(props.meta));
const resolvedDenseDescriptionClass = computed(
  () => props.denseDescriptionClass || "truncate text-sm font-semibold text-slate-800"
);

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
