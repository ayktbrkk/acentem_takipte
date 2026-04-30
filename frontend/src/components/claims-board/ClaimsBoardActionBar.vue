<template>
  <div class="flex flex-wrap items-center gap-2">
    <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="$emit('refresh')">
      <FeatherIcon name="refresh-cw" :class="['h-4 w-4', claimsLoading && 'animate-spin']" />
      {{ t("refresh") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="$emit('download-xlsx')">
      <FeatherIcon name="download" class="h-4 w-4" />
      {{ t("exportXlsx") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="$emit('download-pdf')">
      <FeatherIcon name="file-text" class="h-4 w-4" />
      {{ t("exportPdf") }}
    </ActionButton>
    <ActionButton variant="primary" size="sm" @click="$emit('launch-quick-claim')">
      <FeatherIcon name="plus" class="h-4 w-4" />
      {{ t('newClaim') }}
    </ActionButton>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";
import ActionButton from "../app-shell/ActionButton.vue";

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
