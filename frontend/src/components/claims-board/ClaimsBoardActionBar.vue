<template>
  <div class="flex flex-wrap items-center gap-2">
    <QuickCreateLauncher
      variant="primary"
      size="sm"
      :label="t('newClaim')"
      @launch="$emit('launch-quick-claim')"
    />
    <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="$emit('refresh')">
      {{ t("refresh") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="$emit('download-xlsx')">
      {{ t("exportXlsx") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="$emit('download-pdf')">
      {{ t("exportPdf") }}
    </ActionButton>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import QuickCreateLauncher from "../app-shell/QuickCreateLauncher.vue";

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
