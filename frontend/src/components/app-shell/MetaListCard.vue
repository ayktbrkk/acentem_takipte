<template>
  <li
    :class="[
      'rounded-xl border border-slate-200 bg-slate-50 p-3',
      clickable && 'cursor-pointer transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30',
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold text-slate-900">{{ title }}</p>
        <p v-if="subtitle" class="mt-1 text-xs text-slate-500">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.trailing" class="shrink-0">
        <slot name="trailing" />
      </div>
    </div>

    <p v-if="description" :class="descriptionClass">{{ description }}</p>
    <p v-if="meta" class="mt-1 text-xs text-slate-500">{{ meta }}</p>
    <slot />
  </li>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: "-" },
  subtitle: { type: String, default: "" },
  description: { type: String, default: "" },
  descriptionClass: { type: String, default: "mt-2 text-sm text-slate-700" },
  meta: { type: String, default: "" },
  clickable: { type: Boolean, default: false },
});

const emit = defineEmits(["click"]);

function handleClick(event) {
  if (!props.clickable) return;
  emit("click", event);
}
</script>
