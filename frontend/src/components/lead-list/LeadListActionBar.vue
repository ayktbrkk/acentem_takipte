<template>
  <div class="flex flex-wrap items-center gap-2">
    <button class="btn btn-primary btn-sm" type="button" @click="$emit('new-lead')">{{ t("newLead") }}</button>
    <button class="btn btn-outline btn-sm" type="button" @click="$emit('focus-search')">{{ t("focusFilters") }}</button>
    <button class="btn btn-outline btn-sm" :disabled="leadListLoading" @click="$emit('refresh')">{{ t("refresh") }}</button>
    <button class="btn btn-outline btn-sm" :disabled="leadListLoading" @click="$emit('download-xlsx')">{{ t("exportXlsx") }}</button>
    <button class="btn btn-outline btn-sm" :disabled="leadListLoading" @click="$emit('download-pdf')">{{ t("exportPdf") }}</button>
  </div>
</template>

<script setup>
defineProps({
  leadListLoading: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["new-lead", "focus-search", "refresh", "download-xlsx", "download-pdf"]);
</script>
