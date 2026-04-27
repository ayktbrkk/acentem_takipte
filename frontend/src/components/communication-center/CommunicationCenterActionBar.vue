<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="flex flex-wrap items-center gap-1.5 mr-2">
      <button class="btn btn-outline" @click="runtime.openSegmentDialog()">
        <FeatherIcon name="users" class="h-4 w-4" />
        {{ t('quickSegment') }}
      </button>
      <button class="btn btn-outline" @click="runtime.openCampaignDialog()">
        <FeatherIcon name="layers" class="h-4 w-4" />
        {{ t('quickCampaign') }}
      </button>
      <button class="btn btn-outline" @click="runtime.openCampaignRunDialog()">
        <FeatherIcon name="play" class="h-4 w-4" />
        {{ t('runCampaign') }}
      </button>
      <button class="btn btn-outline" @click="runtime.openSegmentPreviewDialog()">
        <FeatherIcon name="eye" class="h-4 w-4" />
        {{ t('previewSegment') }}
      </button>
      <button class="btn btn-outline" @click="runtime.openCallNoteDialog()">
        <FeatherIcon name="phone" class="h-4 w-4" />
        {{ t('quickCallNote') }}
      </button>
      <button class="btn btn-outline" @click="runtime.openReminderDialog()">
        <FeatherIcon name="bell" class="h-4 w-4" />
        {{ t('quickReminder') }}
      </button>
    </div>

    <div class="h-6 w-px bg-slate-200 mx-1"></div>

    <button
      v-if="canCreateQuickMessage"
      class="btn btn-primary"
      @click="runtime.openQuickMessageDialog()"
    >
      <FeatherIcon name="message-square" class="h-4 w-4" />
      {{ t('quickMessage') }}
    </button>

    <button
      v-if="canReturnToContext"
      class="btn btn-outline"
      @click="runtime.returnToContext()"
    >
      <FeatherIcon name="arrow-left" class="h-4 w-4" />
      {{ returnToLabel }}
    </button>

    <button class="btn btn-outline" @click="runtime.reloadSnapshot">
      <FeatherIcon name="refresh-cw" :class="['h-4 w-4', runtime.snapshotResource.loading && 'animate-spin']" />
    </button>

    <button
      class="btn btn-outline"
      :disabled="runtime.snapshotResource.loading"
      @click="runtime.downloadCommunicationExport('xlsx')"
    >
      <FeatherIcon name="download" class="h-4 w-4" />
    </button>

    <button
      v-if="canRunDispatchCycle"
      class="btn btn-primary px-6"
      :disabled="dispatching"
      @click="runtime.runDispatchCycle"
    >
      <FeatherIcon :name="dispatching ? 'loader' : 'send'" :class="['h-4 w-4', dispatching && 'animate-spin']" />
      {{ dispatching ? t('dispatching') : t('dispatch') }}
    </button>
  </div>
</template>

<script setup>
import { computed, unref } from "vue";
import { FeatherIcon } from "frappe-ui";

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
