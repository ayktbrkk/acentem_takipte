<template>
  <div class="rounded-lg border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 text-amber-600 text-lg">⚠</div>
      <div class="flex-grow">
        <p class="text-sm font-semibold text-amber-900">{{ title }}</p>
        <p class="mt-1 text-sm text-amber-800">{{ description }}</p>
        <button
          v-if="showRequestAction"
          class="mt-3 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          @click="$emit('request-access')"
        >
          📋 {{ requestActionText }}
        </button>
      </div>
      <button
        v-if="dismissible"
        type="button"
        class="flex-shrink-0 text-amber-600 hover:text-amber-800 transition-colors"
        @click="$emit('dismiss')"
      >
        ✕
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
}

const props = withDefaults(defineProps<Props>(), {
  title: "Sensitive Data Masked",
  description: "Some customer information is masked. Request access to view full details.",
  showRequestAction: true,
  requestActionText: "Request Access",
  dismissible: true,
});

defineEmits<{
  "request-access": [];
  dismiss: [];
}>();
</script>

<style scoped>
/* Amber color palette matching AT design system */
</style>
