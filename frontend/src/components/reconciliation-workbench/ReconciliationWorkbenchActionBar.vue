<template>
  <div class="flex flex-wrap items-center gap-2">
    <ActionButton variant="secondary" size="sm" @click="$emit('open-import')">
      {{ props.t("importStatement") }}
    </ActionButton>
    <ActionButton
      variant="secondary"
      size="sm"
      :disabled="props.bulkActionLoading || !props.canBulkAction || props.selectedCount === 0"
      :title="props.selectedCount === 0 ? props.t('selectRowsFirst') : undefined"
      @click="$emit('bulk-resolve')"
    >
      {{ props.bulkActionLoading ? props.t("bulkResolving") : props.t("bulkResolve") }}
    </ActionButton>
    <ActionButton
      variant="secondary"
      size="sm"
      :disabled="props.bulkActionLoading || !props.canBulkAction || props.selectedCount === 0"
      :title="props.selectedCount === 0 ? props.t('selectRowsFirst') : undefined"
      @click="$emit('bulk-ignore')"
    >
      {{ props.bulkActionLoading ? props.t("bulkIgnoring") : props.t("bulkIgnore") }}
    </ActionButton>
    <span v-if="props.selectedCount > 0" class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
      {{ props.selectedCount }} {{ props.t("selectedRows") }}
    </span>
    <ActionButton variant="secondary" size="sm" :disabled="props.syncing" @click="$emit('sync')">
      {{ props.syncing ? props.t("syncing") : props.t("sync") }}
    </ActionButton>
    <ActionButton variant="primary" size="sm" :disabled="props.reconciling" @click="$emit('reconcile')">
      {{ props.reconciling ? props.t("reconciling") : props.t("reconcile") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" @click="$emit('refresh')">
      {{ props.t("refresh") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="props.workbenchLoading" @click="$emit('export-xlsx')">
      {{ props.t("exportXlsx") }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" :disabled="props.workbenchLoading" @click="$emit('export-pdf')">
      {{ props.t("exportPdf") }}
    </ActionButton>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

const props = defineProps({
  t: { type: Function, required: true },
  syncing: { type: Boolean, default: false },
  reconciling: { type: Boolean, default: false },
  bulkActionLoading: { type: Boolean, default: false },
  openRowCount: { type: Number, default: 0 },
  selectedCount: { type: Number, default: 0 },
  canBulkAction: { type: Boolean, default: true },
  workbenchLoading: { type: Boolean, default: false },
});

defineEmits([
  "open-import",
  "bulk-resolve",
  "bulk-ignore",
  "sync",
  "reconcile",
  "refresh",
  "export-xlsx",
  "export-pdf",
]);
</script>
