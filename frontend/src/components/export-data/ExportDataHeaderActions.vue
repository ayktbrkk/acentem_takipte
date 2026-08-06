<template>
  <div class="flex flex-wrap items-center justify-end gap-2">
    <span
      v-if="rowCount > 0"
      class="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200"
    >
      {{ t("exportRowCount", { count: rowCount }) }}
    </span>
    <ActionButton variant="secondary" size="sm" type="button" @click="$emit('reset')">{{ t("reset") }}</ActionButton>
    <ActionButton variant="secondary" size="sm" type="button" @click="$emit('cancel')">{{ t("cancel") }}</ActionButton>
    <ActionButton
      variant="primary"
      size="sm"
      type="button"
      :disabled="exportLoading || !canExport"
      @click="$emit('export')"
    >
      {{ exportLoading ? t("exportLoading") : t("exportAction") }}
    </ActionButton>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

defineProps({
  t: {
    type: Function,
    required: true,
  },
  exportLoading: {
    type: Boolean,
    default: false,
  },
  canExport: {
    type: Boolean,
    default: true,
  },
  rowCount: {
    type: Number,
    default: 0,
  },
});

defineEmits(["reset", "cancel", "export"]);
</script>
