<template>
  <article class="surface-card rounded-2xl p-5 at-data-shell">
    <div v-if="$slots.header" class="mb-3">
      <slot name="header" />
    </div>

    <div v-if="loading" class="py-8 text-sm text-slate-500">
      {{ effectiveLoadingLabel }}
    </div>

    <div v-else-if="error" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ effectiveErrorTitle }}</p>
      <p class="qc-error-banner__text mt-1">{{ error }}</p>
    </div>

    <div v-else-if="empty">
      <slot name="empty">
        <EmptyState :title="effectiveEmptyTitle" :description="emptyDescription" />
      </slot>
    </div>

    <div v-else class="space-y-3">
      <slot />
    </div>

    <div v-if="$slots.footer && !loading && !error && !empty" class="mt-3">
      <slot name="footer" />
    </div>
  </article>
</template>

<script setup>
import { computed, unref } from "vue";

import EmptyState from "./EmptyState.vue";
import { getAppPinia } from "@/pinia";
import { useAuthStore } from "@/stores/auth";
import { translateText } from "@/utils/i18n";

const props = defineProps({
  loading: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  error: { type: String, default: "" },
  loadingLabel: { type: String, default: "" },
  errorTitle: { type: String, default: "" },
  emptyTitle: { type: String, default: "" },
  emptyDescription: { type: String, default: "" },
});

const authStore = useAuthStore(getAppPinia());
const activeLocale = computed(() => unref(authStore.locale) || "en");

const effectiveLoadingLabel = computed(() => props.loadingLabel || translateText("Loading records...", activeLocale.value));
const effectiveErrorTitle = computed(() => props.errorTitle || translateText("Error", activeLocale.value));
const effectiveEmptyTitle = computed(() => props.emptyTitle || translateText("No records found", activeLocale.value));
</script>
