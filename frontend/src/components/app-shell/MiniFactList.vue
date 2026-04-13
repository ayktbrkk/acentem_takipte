<template>
  <div class="space-y-2">
    <div v-for="item in items" :key="item.key || item.label" :class="item.wrapperClass || ''">
      <p class="text-[11px] tracking-wide text-slate-400">{{ upperLabel(item.label) }}</p>
      <p class="truncate text-sm" :class="item.valueClass || 'font-medium text-slate-800'">
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
});
</script>
