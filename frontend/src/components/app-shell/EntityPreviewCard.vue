<template>
  <article
    :class="[
      dense
        ? 'rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2'
        : 'rounded-xl border border-slate-200 bg-slate-50/80 p-4',
      dense && emphasisClass,
      stretch && 'flex h-full flex-col',
      clickable && 'cursor-pointer transition hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30',
    ]"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div :class="dense ? 'flex items-center justify-between gap-2' : 'flex items-start justify-between gap-2'">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-slate-900" :class="titleClass">{{ title }}</p>
        <p
          v-if="subtitle"
          :class="dense ? ['truncate text-[11px] text-slate-500', subtitleClass] : ['mt-1 text-xs text-slate-500', subtitleClass]"
        >
          {{ subtitle }}
        </p>
      </div>
      <div v-if="$slots.trailing" class="shrink-0">
        <slot name="trailing" />
      </div>
    </div>

    <div v-if="$slots.default" :class="dense ? 'mt-1 min-w-0' : [stretch ? 'mt-2 flex-1' : 'mt-2']">
      <slot />
    </div>

    <div v-if="$slots.footer" :class="dense ? 'mt-2' : 'mt-3'">
      <slot name="footer" />
    </div>
  </article>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: "-" },
  subtitle: { type: String, default: "" },
  titleClass: { type: String, default: "" },
  subtitleClass: { type: String, default: "" },
  stretch: { type: Boolean, default: false },
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
