<template>
  <div class="rounded-lg border-l-4 border-at-amber bg-status-waiting-bg px-4 py-3">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 text-at-amber">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div class="flex-grow">
        <p class="text-sm font-semibold text-status-waiting-text">{{ title }}</p>
        <p class="mt-1 text-sm text-status-waiting-text/90">{{ description }}</p>
        <button
          v-if="showRequestAction"
          class="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-at-amber px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-90 focus-visible:ring-2 focus-visible:ring-at-amber focus-visible:outline-none"
          @click="$emit('request-access')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {{ requestActionText }}
        </button>
      </div>
      <button
        v-if="dismissible"
        type="button"
        class="flex-shrink-0 cursor-pointer text-status-waiting-text transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-at-amber focus-visible:outline-none"
        @click="$emit('dismiss')"
        :aria-label="dismissLabel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
  showRequestAction?: boolean;
  requestActionText?: string;
  dismissible?: boolean;
  dismissLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "Sensitive Data Masked",
  description: "Some customer information is masked. Request access to view full details.",
  showRequestAction: true,
  requestActionText: "Request Access",
  dismissible: true,
  dismissLabel: "Dismiss",
});

defineEmits<{
  "request-access": [];
  dismiss: [];
}>();
</script>

<style scoped>
/* Amber color palette matching AT design system */
</style>
