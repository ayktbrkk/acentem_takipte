<template>
  <QuickCreateLauncher
    variant="secondary"
    size="sm"
    :label="t('quickSegment')"
    @launch="runtime.openSegmentDialog()"
  />
  <QuickCreateLauncher
    variant="secondary"
    size="sm"
    :label="t('quickCampaign')"
    @launch="runtime.openCampaignDialog()"
  />
  <QuickCreateLauncher
    variant="secondary"
    size="sm"
    :label="t('runCampaign')"
    @launch="runtime.openCampaignRunDialog()"
  />
  <QuickCreateLauncher
    variant="secondary"
    size="sm"
    :label="t('previewSegment')"
    @launch="runtime.openSegmentPreviewDialog()"
  />
  <QuickCreateLauncher
    variant="secondary"
    size="sm"
    :label="t('quickCallNote')"
    @launch="runtime.openCallNoteDialog()"
  />
  <QuickCreateLauncher
    variant="secondary"
    size="sm"
    :label="t('quickReminder')"
    @launch="runtime.openReminderDialog()"
  />
  <QuickCreateLauncher
    v-if="canCreateQuickMessage"
    variant="primary"
    size="sm"
    :label="t('quickMessage')"
    @launch="runtime.openQuickMessageDialog()"
  />
  <ActionButton
    v-if="canReturnToContext"
    variant="secondary"
    size="sm"
    @click="runtime.returnToContext()"
  >
    {{ returnToLabel }}
  </ActionButton>
  <ActionButton variant="secondary" size="sm" @click="runtime.reloadSnapshot">
    {{ t('refresh') }}
  </ActionButton>
  <ActionButton
    variant="secondary"
    size="sm"
    :disabled="runtime.snapshotResource.loading"
    @click="runtime.downloadCommunicationExport('xlsx')"
  >
    {{ t('exportXlsx') }}
  </ActionButton>
  <ActionButton
    variant="primary"
    size="sm"
    :disabled="runtime.snapshotResource.loading"
    @click="runtime.downloadCommunicationExport('pdf')"
  >
    {{ t('exportPdf') }}
  </ActionButton>
  <ActionButton
    v-if="canRunDispatchCycle"
    variant="primary"
    size="sm"
    :disabled="dispatching"
    @click="runtime.runDispatchCycle"
  >
    {{ dispatching ? t('dispatching') : t('dispatch') }}
  </ActionButton>
</template>

<script setup>
import { computed, unref } from "vue";
import ActionButton from "../app-shell/ActionButton.vue";
import QuickCreateLauncher from "../app-shell/QuickCreateLauncher.vue";

const props = defineProps({
  runtime: {
    type: Object,
    required: true,
  },
  state: {
    type: Object,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

const canCreateQuickMessage = computed(() => unref(props.state.canCreateQuickMessage));
const canReturnToContext = computed(() => unref(props.state.canReturnToContext));
const returnToLabel = computed(() => unref(props.state.returnToLabel));
const canRunDispatchCycle = computed(() => unref(props.runtime.canRunDispatchCycle));
const dispatching = computed(() => unref(props.runtime.dispatching));
</script>
