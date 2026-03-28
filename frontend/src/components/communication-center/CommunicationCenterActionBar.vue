<template>
  <div class="flex flex-wrap items-center gap-2">
    <QuickCreateLauncher
      variant="secondary"
      size="sm"
      :label="t('quickSegment')"
      @launch="$emit('launch-segment')"
    />
    <QuickCreateLauncher
      variant="secondary"
      size="sm"
      :label="t('quickCampaign')"
      @launch="$emit('launch-campaign')"
    />
    <QuickCreateLauncher
      variant="secondary"
      size="sm"
      :label="t('runCampaign')"
      @launch="$emit('launch-campaign-run')"
    />
    <QuickCreateLauncher
      variant="secondary"
      size="sm"
      :label="t('previewSegment')"
      @launch="$emit('launch-segment-preview')"
    />
    <QuickCreateLauncher
      variant="secondary"
      size="sm"
      :label="t('quickCallNote')"
      @launch="$emit('launch-call-note')"
    />
    <QuickCreateLauncher
      variant="secondary"
      size="sm"
      :label="t('quickReminder')"
      @launch="$emit('launch-reminder')"
    />
    <QuickCreateLauncher
      v-if="canCreateQuickMessage"
      variant="primary"
      size="sm"
      :label="t('quickMessage')"
      @launch="$emit('launch-quick-message')"
    />
    <ActionButton
      v-if="canReturnToContext"
      variant="secondary"
      size="sm"
      @click="$emit('return-context')"
    >
      {{ returnToLabel }}
    </ActionButton>
    <ActionButton variant="secondary" size="sm" @click="$emit('refresh')">
      {{ t('refresh') }}
    </ActionButton>
    <ActionButton
      variant="secondary"
      size="sm"
      :disabled="snapshotLoading"
      @click="$emit('export-xlsx')"
    >
      {{ t('exportXlsx') }}
    </ActionButton>
    <ActionButton
      variant="primary"
      size="sm"
      :disabled="snapshotLoading"
      @click="$emit('export-pdf')"
    >
      {{ t('exportPdf') }}
    </ActionButton>
    <ActionButton v-if="canRunDispatchCycle" variant="primary" size="sm" :disabled="dispatching" @click="$emit('dispatch')">
      {{ dispatching ? t('dispatching') : t('dispatch') }}
    </ActionButton>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import QuickCreateLauncher from "../app-shell/QuickCreateLauncher.vue";

defineProps({
  canCreateQuickMessage: {
    type: Boolean,
    default: false,
  },
  canReturnToContext: {
    type: Boolean,
    default: false,
  },
  canRunDispatchCycle: {
    type: Boolean,
    default: false,
  },
  dispatching: {
    type: Boolean,
    default: false,
  },
  returnToLabel: {
    type: String,
    default: "",
  },
  snapshotLoading: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits([
  "dispatch",
  "export-pdf",
  "export-xlsx",
  "launch-call-note",
  "launch-campaign",
  "launch-campaign-run",
  "launch-quick-message",
  "launch-reminder",
  "launch-segment",
  "launch-segment-preview",
  "refresh",
  "return-context",
]);
</script>
