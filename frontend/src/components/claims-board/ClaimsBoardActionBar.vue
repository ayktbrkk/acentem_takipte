<template>
  <div class="flex flex-wrap items-center gap-2">
    <button class="btn btn-primary" @click="$emit('launch-quick-claim')">
      <FeatherIcon name="plus" class="h-4 w-4" />
      {{ t('newClaim') }}
    </button>
    <button class="btn btn-outline" :disabled="claimsLoading" @click="$emit('refresh')">
      <FeatherIcon name="refresh-cw" :class="['h-4 w-4', claimsLoading && 'animate-spin']" />
    </button>
    <button class="btn btn-outline" :disabled="claimsLoading" @click="$emit('download-xlsx')">
      <FeatherIcon name="download" class="h-4 w-4" />
      {{ t("exportXlsx") }}
    </button>
    <button class="btn btn-outline" :disabled="claimsLoading" @click="$emit('download-pdf')">
      <FeatherIcon name="file-text" class="h-4 w-4" />
      {{ t("exportPdf") }}
    </button>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

defineProps({
  claimsLoading: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["refresh", "download-xlsx", "download-pdf", "launch-quick-claim"]);
</script>
