<template>
  <div :class="dense ? 'space-y-1' : 'space-y-2'">
    <div v-for="item in items" :key="item.key || item.label" :class="item.wrapperClass || ''">
      <p :class="dense ? 'text-[10px] tracking-wide text-slate-400' : 'text-[11px] tracking-wide text-slate-400'">{{ upperLabel(item.label) }}</p>
      <p :class="dense ? `truncate text-xs ${item.valueClass || 'font-medium text-slate-800'}` : `truncate text-sm ${item.valueClass || 'font-medium text-slate-800'}`">
        {{ item.value ?? "-" }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, unref } from "vue";
import { getActivePinia } from "pinia";
import { useAuthStore } from "@/stores/auth";

const authStore = getActivePinia() ? useAuthStore() : null;

const activeLocale = computed(() =>
  String(authStore ? unref(authStore.locale) || "en" : "en")
    .trim()
    .toLowerCase()
);

function upperLabel(text) {
  return activeLocale.value.startsWith("tr")
    ? String(text ?? "").toLocaleUpperCase("tr-TR")
    : String(text ?? "").toUpperCase();
}

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  dense: {
    type: Boolean,
    default: false,
  },
});
</script>
