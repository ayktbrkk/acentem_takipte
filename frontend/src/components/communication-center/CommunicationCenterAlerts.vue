<template>
  <article
    v-if="snapshotErrorText"
    class="rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 mb-6 flex items-center justify-between gap-4"
    role="alert"
  >
    <div>
      <p class="text-sm font-semibold text-at-red">{{ t('loadErrorTitle') }}</p>
      <p class="mt-1 text-sm text-at-red/90">{{ snapshotErrorText }}</p>
    </div>
    <ActionButton variant="secondary" size="sm" @click="$emit('retry')">
      {{ t('retry') }}
    </ActionButton>
  </article>

  <article
    v-if="operationErrorText"
    class="rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 mb-6 flex items-center justify-between gap-4"
    role="alert"
  >
    <div>
      <p class="text-sm font-semibold text-at-red">{{ t('operationErrorTitle') }}</p>
      <p class="mt-1 text-sm text-at-red/90">{{ operationErrorText }}</p>
    </div>
    <ActionButton variant="secondary" size="sm" @click="$emit('clear-operation-error')">
      {{ t('retry') }}
    </ActionButton>
  </article>
</template>

<script setup>
import { computed, unref } from "vue";
import ActionButton from "../app-shell/ActionButton.vue";

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

defineEmits(["retry", "clear-operation-error"]);

const snapshotErrorText = computed(() => unref(props.snapshotErrorMessage));
const operationErrorText = computed(() => unref(props.operationError));
</script>
