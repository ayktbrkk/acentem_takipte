<template>
  <button class="btn btn-outline btn-sm" type="button" @click="$emit('reset')">{{ t("reset") }}</button>
</template>

<script setup>
defineProps({
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["reset"]);
</script>
