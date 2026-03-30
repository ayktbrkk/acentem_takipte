<template>
  <button class="btn btn-outline btn-sm" type="button" @click="emit('focus-filters')">{{ t("focusFilters") }}</button>
  <button class="btn btn-outline btn-sm" type="button" :disabled="policyLoading" @click="emit('export-xlsx')">{{ t("exportXlsx") }}</button>
  <button class="btn btn-primary btn-sm" type="button" @click="emit('new-policy')">{{ t("newPolicy") }}</button>
</template>

<script setup>
const props = defineProps({
  policyLoading: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["focus-filters", "export-xlsx", "new-policy"]);
</script>
