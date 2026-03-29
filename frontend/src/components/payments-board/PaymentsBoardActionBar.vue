<template>
  <div class="flex flex-wrap items-center gap-2">
    <QuickCreateLauncher variant="primary" size="sm" :label="t('newPayment')" @launch="$emit('launch')" />
    <ActionButton variant="secondary" size="sm" :disabled="loading" @click="$emit('refresh')">
      {{ t("refresh") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="loading" @click="$emit('export-xlsx')">
      {{ t("exportXlsx") }}
    </ActionButton>
    <ActionButton variant="primary" size="sm" :disabled="loading" @click="$emit('export-pdf')">
      {{ t("exportPdf") }}
    </ActionButton>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import QuickCreateLauncher from "../app-shell/QuickCreateLauncher.vue";

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
