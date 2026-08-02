<template>
  <div :class="rootClass">
    <div :class="iconClass">
      <slot name="icon">
        <FeatherIcon name="inbox" :class="iconGlyphClass" />
      </slot>
    </div>
    <h4 v-if="resolvedTitle" :class="titleClass">{{ resolvedTitle }}</h4>
    <p v-if="description" :class="descriptionClass">{{ description }}</p>
    <div v-if="$slots.actions" :class="actionsClass">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { FeatherIcon } from "frappe-ui";
import { translateText } from "@/platform/i18n";
import { useAuthStore } from "@/platform/state/authStore";

const authStore = useAuthStore();

const props = defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  compact: { type: Boolean, default: false },
  compactContainerClass: {
    type: String,
    default: 'rounded-xl border border-dashed border-slate-200 bg-slate-50/40',
  },
  locale: { type: String, default: "" },
});

const resolvedTitle = computed(() => {
  if (props.title) return props.title;
  return translateText("no_records_found", props.locale || authStore.locale || "en");
});

const compactBaseClass =
  "flex min-h-[136px] flex-col items-center justify-center px-4 py-5 text-center";
const regularBaseClass =
  "flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center";

const rootClass = computed(() =>
  props.compact ? `${compactBaseClass} ${props.compactContainerClass}` : regularBaseClass
);

const iconClass = computed(() =>
  props.compact
    ? "mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-300"
    : "mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300"
);

const iconGlyphClass = computed(() => (props.compact ? "h-6 w-6" : "h-8 w-8"));

const titleClass = computed(() =>
  props.compact ? "text-sm font-medium text-slate-500" : "text-sm font-semibold text-slate-900"
);

const descriptionClass = computed(() =>
  props.compact ? "mt-1 text-sm text-slate-500" : "mt-1 text-xs text-slate-500"
);

const actionsClass = computed(() => (props.compact ? "mt-3" : "mt-4"));
</script>
