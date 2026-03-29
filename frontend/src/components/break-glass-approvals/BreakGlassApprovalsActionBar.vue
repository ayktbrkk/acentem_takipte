<template>
  <button class="btn btn-outline btn-sm" type="button" :disabled="loading" @click="$emit('refresh')">
    {{ loading ? t("loading") : t("refresh") }}
  </button>
</template>

<script setup>
defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["refresh"]);
</script>
