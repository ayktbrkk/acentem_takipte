<template>
  <article v-if="snapshotErrorText" class="qc-error-banner">
    <p class="qc-error-banner__text font-semibold">{{ t('loadErrorTitle') }}</p>
    <p class="qc-error-banner__text mt-1">{{ snapshotErrorText }}</p>
  </article>

  <article v-if="operationErrorText" class="qc-error-banner">
    <p class="qc-error-banner__text font-semibold">{{ t('actions') }}</p>
    <p class="qc-error-banner__text mt-1">{{ operationErrorText }}</p>
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
