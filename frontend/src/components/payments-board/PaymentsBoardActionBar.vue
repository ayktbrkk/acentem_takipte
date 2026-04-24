<template>
  <div class="flex flex-wrap items-center gap-2">
    <button class="btn btn-primary" @click="$emit('launch')">
      <FeatherIcon name="plus" class="h-4 w-4" />
      {{ t('newPayment') }}
    </button>
    <button class="btn btn-outline" :disabled="loading" @click="$emit('refresh')">
      <FeatherIcon name="refresh-cw" :class="['h-4 w-4', loading && 'animate-spin']" />
    </button>
    <button class="btn btn-outline" :disabled="loading" @click="$emit('export-xlsx')">
      <FeatherIcon name="download" class="h-4 w-4" />
      {{ t("exportXlsx") }}
    </button>
    <button class="btn btn-outline" :disabled="loading" @click="$emit('export-pdf')">
      <FeatherIcon name="file-text" class="h-4 w-4" />
      {{ t("exportPdf") }}
    </button>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

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

defineEmits(["launch", "refresh", "export-xlsx", "export-pdf"]);
</script>
