import { ref, computed } from "vue";

import { useBranchStore } from "../../stores/branch";
import { isPermissionDeniedError } from "./common";

export function useCommunicationCenterQuickDialogs({
  activeLocale,
  filters,
  reloadSnapshot,
  segmentPreviewResource,
  campaignRunResource,
  t,
}) {
  const branchStore = useBranchStore();

  const showSegmentDialog = ref(false);
  const showCampaignDialog = ref(false);
  const showCampaignRunDialog = ref(false);
  const showSegmentPreviewDialog = ref(false);
  const showCallNoteDialog = ref(false);
  const showReminderDialog = ref(false);
  const showQuickMessageDialog = ref(false);
  const campaignRunSelection = ref("");
  const campaignRunLoading = ref(false);
  const campaignRunError = ref("");
  const campaignRunResult = ref(null);
  const segmentPreviewSegment = ref("");
  const segmentPreviewLoading = ref(false);
  const segmentPreviewError = ref("");
  const segmentPreviewPayload = ref(null);

  const quickMessageDialogLabels = computed(() => ({
    save: t("saveDraft"),
    saveAndOpen: t("sendImmediately"),
  }));
  const quickSegmentEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Segment" : "Quick Segment"));
  const quickCampaignEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Kampanya" : "Quick Campaign"));
  const quickCallNoteEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Arama Notu" : "Quick Call Note"));
  const quickReminderEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Hatırlatıcı" : "Quick Reminder"));
  const quickMessageEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Mesaj" : "Quick Message"));
  const segmentPreviewSummary = computed(() => segmentPreviewPayload.value?.summary || null);
  const segmentPreviewRows = computed(() => segmentPreviewPayload.value?.customers || []);

  const quickMessageSuccessHandlers = {
    communication_snapshot: async () => {
      await reloadSnapshot();
    },
  };
  const callNoteSuccessHandlers = {
    "call-notes-list": async () => {},
  };
  const reminderSuccessHandlers = {
    "reminders-list": async () => {
      await reloadSnapshot();
    },
  };
  const segmentSuccessHandlers = {
    "segments-list": async () => {},
  };
  const campaignSuccessHandlers = {
    "campaigns-list": async () => {},
  };

  function buildQuickMessagePayload({ form, openAfter }) {
    return {
      template: form.template || null,
      channel: form.channel || null,
      language: form.language || null,
      customer: form.customer || null,
      office_branch: branchStore.requestBranch || null,
      recipient: form.recipient || null,
      reference_doctype: form.reference_doctype || null,
      reference_name: form.reference_name || null,
      subject: form.subject || null,
      body: form.body || null,
      send_now: openAfter ? 1 : 0,
    };
  }

  async function prepareQuickMessageDialog({ form }) {
    if (filters.customer && !form.customer) form.customer = filters.customer;
    if (filters.channel && !form.channel) form.channel = filters.channel;
    if (filters.referenceDoctype && !form.reference_doctype) form.reference_doctype = filters.referenceDoctype;
    if (filters.referenceName && !form.reference_name) form.reference_name = filters.referenceName;
    if (!form.language) form.language = activeLocale.value === "tr" ? "tr" : "en";
  }

  async function loadSegmentPreview() {
    if (!segmentPreviewSegment.value) return;
    segmentPreviewLoading.value = true;
    segmentPreviewError.value = "";
    try {
      const result = await segmentPreviewResource.submit({
        segment_name: segmentPreviewSegment.value,
        limit: 20,
      });
      segmentPreviewPayload.value = result || null;
    } catch (error) {
      segmentPreviewPayload.value = null;
      segmentPreviewError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedRead")
        : error?.message || error?.exc || t("loadErrorTitle");
    } finally {
      segmentPreviewLoading.value = false;
    }
  }

  async function runCampaignExecution() {
    if (!campaignRunSelection.value) return;
    campaignRunLoading.value = true;
    campaignRunError.value = "";
    try {
      const result = await campaignRunResource.submit({
        campaign_name: campaignRunSelection.value,
        limit: 200,
      });
      campaignRunResult.value = result || null;
      await reloadSnapshot();
    } catch (error) {
      campaignRunResult.value = null;
      campaignRunError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.message || error?.exc || t("loadErrorTitle");
    } finally {
      campaignRunLoading.value = false;
    }
  }

  async function prepareCallNoteDialog({ form }) {
    if (filters.customer && !form.customer) form.customer = filters.customer;
    if (filters.referenceDoctype === "AT Policy" && filters.referenceName && !form.policy) form.policy = filters.referenceName;
    if (filters.referenceDoctype === "AT Claim" && filters.referenceName && !form.claim) form.claim = filters.referenceName;
    if (!form.note_at) form.note_at = new Date().toISOString().slice(0, 16);
  }

  async function prepareReminderDialog({ form }) {
    if (filters.customer && !form.customer) form.customer = filters.customer;
    if (filters.referenceDoctype && !form.source_doctype) form.source_doctype = filters.referenceDoctype;
    if (filters.referenceName && !form.source_name) form.source_name = filters.referenceName;
    if (filters.referenceDoctype === "AT Policy" && filters.referenceName && !form.policy) form.policy = filters.referenceName;
    if (filters.referenceDoctype === "AT Claim" && filters.referenceName && !form.claim) form.claim = filters.referenceName;
    if (!form.remind_at) form.remind_at = new Date().toISOString().slice(0, 16);
  }

  return {
    buildQuickMessagePayload,
    campaignRunError,
    campaignRunLoading,
    campaignRunResult,
    campaignRunSelection,
    campaignSuccessHandlers,
    callNoteSuccessHandlers,
    loadSegmentPreview,
    quickCallNoteEyebrow,
    quickCampaignEyebrow,
    quickMessageDialogLabels,
    quickMessageEyebrow,
    quickMessageSuccessHandlers,
    quickReminderEyebrow,
    quickSegmentEyebrow,
    prepareCallNoteDialog,
    prepareQuickMessageDialog,
    prepareReminderDialog,
    runCampaignExecution,
    segmentPreviewError,
    segmentPreviewLoading,
    segmentPreviewPayload,
    segmentPreviewRows,
    segmentPreviewSegment,
    segmentPreviewSummary,
    segmentSuccessHandlers,
    showCallNoteDialog,
    showCampaignDialog,
    showCampaignRunDialog,
    showQuickMessageDialog,
    showReminderDialog,
    showSegmentDialog,
    showSegmentPreviewDialog,
    reminderSuccessHandlers,
  };
}
