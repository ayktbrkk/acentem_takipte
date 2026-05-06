<template>
  <li
    :class="[
      dense
        ? 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2'
        : 'rounded-xl border border-slate-200 bg-slate-50 p-3',
      dense && emphasisClass,
      clickable && 'cursor-pointer transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30',
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div :class="dense ? 'flex items-center justify-between gap-2' : 'flex items-start justify-between gap-3'">
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold text-slate-900">{{ title }}</p>
        <p v-if="subtitle" :class="dense ? 'truncate text-[11px] text-slate-500' : 'mt-1 text-xs text-slate-500'">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.trailing" class="shrink-0">
        <slot name="trailing" />
      </div>
    </div>

    <div :class="dense ? 'mt-1 flex items-start justify-between gap-2' : ''">
      <div class="min-w-0 flex-1">
        <p v-if="description" :class="dense ? denseDescriptionClass : descriptionClass">{{ description }}</p>
        <p v-if="meta" :class="dense ? 'truncate text-[11px] text-slate-500' : 'mt-1 text-xs text-slate-500'">{{ meta }}</p>
      </div>
      <div v-if="dense && $slots.default" class="min-w-0 shrink-0 text-right">
        <slot />
      </div>
    </div>
    <div v-if="!dense && $slots.default">
      <slot />
    </div>
  </li>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: "-" },
  subtitle: { type: String, default: "" },
  description: { type: String, default: "" },
  descriptionClass: { type: String, default: "mt-2 text-sm text-slate-700" },
  denseDescriptionClass: { type: String, default: "truncate text-xs font-medium text-slate-700" },
  meta: { type: String, default: "" },
  clickable: { type: Boolean, default: false },
  dense: { type: Boolean, default: false },
  emphasisClass: { type: String, default: "" },
});

const emit = defineEmits(["click"]);

function handleClick(event) {
  if (!props.clickable) return;
  emit("click", event);
}
</script>
