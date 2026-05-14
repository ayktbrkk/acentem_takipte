<template>
  <article v-if="snapshotErrorText" class="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 mb-6">
    <p class="text-sm font-semibold text-rose-800">{{ t('loadErrorTitle') }}</p>
    <p class="mt-1 text-sm text-rose-700">{{ snapshotErrorText }}</p>
  </article>

  <article v-if="operationErrorText" class="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 mb-6">
    <p class="text-sm font-semibold text-rose-800">{{ t('actions') }}</p>
    <p class="mt-1 text-sm text-rose-700">{{ operationErrorText }}</p>
  </article>
</template>

<script setup>
import { computed, unref } from "vue";

const props = defineProps({
  operationError: {
    type: null,
    default: "",
  },
  snapshotErrorMessage: {
    type: null,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

const snapshotErrorText = computed(() => unref(props.snapshotErrorMessage));
const operationErrorText = computed(() => unref(props.operationError));
</script>
