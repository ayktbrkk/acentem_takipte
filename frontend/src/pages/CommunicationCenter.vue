<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="recordCount"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <CommunicationCenterActionBar :state="state" :runtime="runtime" :t="t" />
    </template>

    <CommunicationCenterOverview :filters="filters" :state="state" :runtime="runtime" :t="t" />

    <CommunicationCenterAlerts
      :snapshot-error-message="state.snapshotErrorMessage"
      :operation-error="runtime.operationError"
      :t="t"
    />

    <CommunicationCenterQueueSections :state="state" :runtime="runtime" :actions="actions" :t="t" />

    <CommunicationCenterDialogs
      :active-locale="activeLocale"
      :quick-dialogs="quickDialogs"
      :runtime="runtime"
      :state="state"
      :t="t"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useCommunicationStore } from "../stores/communication";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import CommunicationCenterActionBar from "../components/communication-center/CommunicationCenterActionBar.vue";
import CommunicationCenterAlerts from "../components/communication-center/CommunicationCenterAlerts.vue";
import CommunicationCenterDialogs from "../components/communication-center/CommunicationCenterDialogs.vue";
import CommunicationCenterOverview from "../components/communication-center/CommunicationCenterOverview.vue";
import CommunicationCenterQueueSections from "../components/communication-center/CommunicationCenterQueueSections.vue";
import { useCommunicationCenterRuntime } from "../composables/communicationCenter/runtime";
import { translateText } from "../utils/i18n";
import { useCommunicationCenterState } from "../composables/communicationCenter/state";
import { useCommunicationCenterActions } from "../composables/communicationCenter/actions";
import { useCommunicationCenterQuickDialogs } from "../composables/communicationCenter/quickDialogs";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const communicationStore = useCommunicationStore();

const activeLocale = computed(() => unref(authStore.locale) || "en");
const recordCount = computed(() => (unref(state.outboxItems)?.length || 0) + (unref(state.draftItems)?.length || 0));

function t(key) {
  return translateText(key, activeLocale);
}

const filters = communicationStore.state.filters;

const runtime = useCommunicationCenterRuntime({ route, router, branchStore, communicationStore, filters, t });
const state = useCommunicationCenterState({
  route,
  authStore,
  branchStore,
  communicationStore,
  filters,
  t,
  activeLocale,
  runtime,
});
const actions = useCommunicationCenterActions({
  router,
  canRetryOutboxAction: state.canRetryOutboxAction,
  canSendDraftNowAction: state.canSendDraftNowAction,
  referenceTypeLabel: state.referenceTypeLabel,
  t,
});
const quickDialogs = useCommunicationCenterQuickDialogs({
  filters,
  branchStore,
  activeLocale,
  t,
  reloadSnapshot: runtime.reloadSnapshot,
  runtime,
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
