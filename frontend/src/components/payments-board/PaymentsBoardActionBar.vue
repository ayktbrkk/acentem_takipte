<template>
  <div class="flex flex-wrap items-center gap-2">
    <ActionButton variant="secondary" size="sm" :disabled="loading" @click="$emit('refresh')">
      <FeatherIcon name="refresh-cw" :class="['h-4 w-4', loading && 'animate-spin']" />
      {{ t("refresh") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="loading" @click="$emit('export-xlsx')">
      <FeatherIcon name="download" class="h-4 w-4" />
      {{ t("exportXlsx") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="loading" @click="$emit('export-pdf')">
      <FeatherIcon name="file-text" class="h-4 w-4" />
      {{ t("exportPdf") }}
    </ActionButton>
    <ActionButton variant="primary" size="sm" @click="$emit('launch')">
      <FeatherIcon name="plus" class="h-4 w-4" />
      {{ t('newPayment') }}
    </ActionButton>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";
import ActionButton from "../app-shell/ActionButton.vue";

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
