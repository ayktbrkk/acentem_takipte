<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="flex flex-wrap items-center gap-1.5 mr-2">
      <ActionButton variant="secondary" size="sm" @click="runtime.openSegmentDialog()">
        <FeatherIcon name="users" class="h-4 w-4" />
        {{ t('quickSegment') }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="runtime.openCampaignDialog()">
        <FeatherIcon name="layers" class="h-4 w-4" />
        {{ t('quickCampaign') }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="runtime.openCampaignRunDialog()">
        <FeatherIcon name="play" class="h-4 w-4" />
        {{ t('runCampaign') }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="runtime.openSegmentPreviewDialog()">
        <FeatherIcon name="eye" class="h-4 w-4" />
        {{ t('previewSegment') }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="runtime.openCallNoteDialog()">
        <FeatherIcon name="phone" class="h-4 w-4" />
        {{ t('quickCallNote') }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="runtime.openReminderDialog()">
        <FeatherIcon name="bell" class="h-4 w-4" />
        {{ t('quickReminder') }}
      </ActionButton>
    </div>

    <div class="h-6 w-px bg-slate-200 mx-1"></div>

    <ActionButton
      v-if="canCreateQuickMessage"
      variant="primary"
      size="sm"
      @click="runtime.openQuickMessageDialog()"
    >
      <FeatherIcon name="message-square" class="h-4 w-4" />
      {{ t('quickMessage') }}
    </ActionButton>

    <ActionButton
      v-if="canReturnToContext"
      variant="secondary"
      size="sm"
      @click="runtime.returnToContext()"
    >
      <FeatherIcon name="arrow-left" class="h-4 w-4" />
      {{ returnToLabel }}
    </ActionButton>

    <ActionButton variant="secondary" size="sm" @click="runtime.reloadSnapshot">
      <FeatherIcon name="refresh-cw" :class="['h-4 w-4', runtime.snapshotResource.loading && 'animate-spin']" />
    </ActionButton>

    <ActionButton
      variant="secondary"
      size="sm"
      :disabled="runtime.snapshotResource.loading"
      @click="runtime.downloadCommunicationExport('xlsx')"
    >
      <FeatherIcon name="download" class="h-4 w-4" />
    </ActionButton>

    <ActionButton
      v-if="canRunDispatchCycle"
      variant="primary"
      size="sm"
      :disabled="dispatching"
      @click="runtime.runDispatchCycle"
    >
      <FeatherIcon :name="dispatching ? 'loader' : 'send'" :class="['h-4 w-4', dispatching && 'animate-spin']" />
      {{ dispatching ? t('dispatching') : t('dispatch') }}
    </ActionButton>
  </div>
</template>

<script setup>
import { computed, unref } from "vue";
import { FeatherIcon } from "frappe-ui";
import ActionButton from "../app-shell/ActionButton.vue";

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
