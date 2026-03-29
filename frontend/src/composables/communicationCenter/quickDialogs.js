import { computed } from "vue";

export function useCommunicationCenterQuickDialogs({ filters, branchStore, activeLocale, t, reloadSnapshot, runtime }) {
  const quickMessageDialogLabels = computed(() => ({
    save: t("saveDraft"),
    saveAndOpen: t("sendImmediately"),
  }));

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
    quickMessageDialogLabels,
    quickMessageSuccessHandlers,
    callNoteSuccessHandlers,
    reminderSuccessHandlers,
    segmentSuccessHandlers,
    campaignSuccessHandlers,
    buildQuickMessagePayload,
    prepareQuickMessageDialog,
    prepareCallNoteDialog,
    prepareReminderDialog,
  };
}
