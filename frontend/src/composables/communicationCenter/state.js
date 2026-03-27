import { computed, onMounted, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { openTabularExport } from "../../utils/listExport";
import { resolveSameOriginPath } from "../../utils/safeNavigation";
import { useAuthStore } from "../../stores/auth";
import { useBranchStore } from "../../stores/branch";
import { useCommunicationStore } from "../../stores/communication";
import { useCustomFilterPresets } from "../useCustomFilterPresets";
import { getSourcePanelConfig } from "../../utils/sourcePanel";
import { isPermissionDeniedError } from "./common";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resourceValue(resource, fallback = null) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function statusLabelFrom(t, status) {
  if (status === "Queued") return t("queued");
  if (status === "Processing") return t("processing");
  if (status === "Sent") return t("sent");
  if (status === "Failed") return t("failed");
  if (status === "Dead") return t("dead");
  return status || "-";
}

function channelLabelFrom(t, channel) {
  if (channel === "SMS") return t("sms");
  if (channel === "Email") return t("email");
  if (channel === "WHATSAPP") return t("whatsapp");
  return channel || "-";
}

function referenceTypeLabelFrom(t, doctype) {
  const value = String(doctype || "").trim();
  if (value === "AT Lead") return t("referenceLead");
  if (value === "AT Offer") return t("referenceOffer");
  if (value === "AT Policy") return t("referencePolicy");
  if (value === "AT Customer") return t("referenceCustomer");
  if (value === "AT Claim") return t("referenceClaim");
  if (value === "AT Payment") return t("referencePayment");
  if (value === "AT Renewal Task") return t("referenceRenewalTask");
  if (value === "AT Accounting Entry") return t("referenceAccountingEntry");
  if (value === "AT Reconciliation Item") return t("referenceReconciliationItem");
  return value || "-";
}

function buildCopy(activeLocale) {
  return {
    tr: {
      breadcrumb: "Kontrol Merkezi → İletişim",
      recordCount: "kayıt",
      title: "İletişim Merkezi",
      subtitle: "Bildirim kuyruğu, dağıtım ve yeniden deneme operasyonları",
      refresh: "Yenile",
      exportXlsx: "Excel",
      exportPdf: "PDF",
      dispatch: "Dağıtımı Çalıştır",
      dispatching: "Çalışıyor...",
      runCampaign: "Kampanyayı Çalıştır",
      campaignRunTitle: "Kampanya Çalıştır",
      selectCampaign: "Kampanya seçin",
      previewSegment: "Segment Önizleme",
      segmentPreviewTitle: "Segment Üye Önizleme",
      selectSegment: "Segment seçin",
      quickSegment: "Segment",
      quickSegmentSubtitle: "Hedef müşteri segmenti oluştur",
      quickCampaign: "Kampanya",
      quickCampaignSubtitle: "Segmente bağlı kampanya oluştur",
      quickCallNote: "Arama Notu",
      quickCallNoteSubtitle: "Telefon görüşmesini not olarak kaydet",
      quickReminder: "Hatırlatıcı",
      quickReminderSubtitle: "Müşteri veya kayıt için zaman bazlı hatırlatıcı ekle",
      startAssignmentContext: "Atamayı İşleme Al",
      blockAssignmentContext: "Atamayı Bloke Et",
      closeAssignmentContext: "Atamayı Kapat",
      clearCallFollowUpContext: "Arama Takibini Temizle",
      completeReminderContext: "Hatırlatıcıyı Tamamla",
      cancelReminderContext: "İptal",
      quickMessage: "Hızlı İletişim",
      quickMessageSubtitle: "Taslak kaydet veya seçili kanal ile hemen gönder",
      saveDraft: "Taslak Kaydet",
      sendImmediately: "Hemen Gönder",
      filtersTitle: "Filtreler",
      advancedFilters: "Gelişmiş Filtreler",
      hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
      activeFilters: "aktif filtre",
      presetLabel: "Filtre Şablonu",
      presetDefault: "Standart",
      savePreset: "Kaydet",
      deletePreset: "Sil",
      savePresetPrompt: "Filtre şablonu adı",
      deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
      applyFilters: "Uygula",
      clearFilters: "Filtreleri Temizle",
      customerFilter: "Müşteri (AT Customer)",
      customerContext: "Müşteri Filtresi",
      clearCustomer: "Müşteri Filtresini Temizle",
      referenceContext: "Kayıt Bağlamı",
      clearContext: "Bağlam Filtrelerini Temizle",
      allStatuses: "Tüm durumlar",
      allChannels: "Tüm kanallar",
      allReferenceTypes: "Tüm kayıt tipleri",
      referenceNameFilter: "Kayıt adı / ID",
      outboxTitle: "Gönderim Kuyruğu",
      draftTitle: "Bildirim Taslakları",
      loading: "Yükleniyor...",
      loadErrorTitle: "İletişim Verileri Yüklenemedi",
      permissionDeniedRead: "İletişim verilerini görmek için yetkiniz yok.",
      permissionDeniedAction: "Bu iletişim işlemini yapmaya yetkiniz yok.",
      emptyOutbox: "Gönderim kuyruğu kaydı bulunamadı.",
      emptyOutboxTitle: "Kuyruk Kaydı Yok",
      emptyDrafts: "Taslak kaydı bulunamadı.",
      emptyDraftsTitle: "Taslak Kaydı Yok",
      recipient: "Alıcı",
      channel: "Kanal",
      status: "Durum",
      recordType: "Kayıt Türü",
      attempts: "Deneme",
      nextRetry: "Sonraki Deneme",
      actions: "Aksiyon",
      error: "Hata",
      retry: "Tekrar Dene",
      sendNow: "Hemen Gönder",
      openRef: "Kaydı Aç",
      queued: "Kuyrukta",
      processing: "İşleniyor",
      sent: "Gönderildi",
      failed: "Başarısız",
      dead: "Kalıcı Hata",
      sms: "SMS",
      email: "E-posta",
      whatsapp: "WhatsApp",
      openPolicyPanel: "Poliçeyi Aç",
      openCustomerPanel: "Müşteriyi Aç",
      openOffersPanel: "Teklif Panosu",
      openClaimsPanel: "Hasar Panosu",
      openPaymentsPanel: "Ödeme Panosu",
      openRenewalsPanel: "Yenileme Panosu",
      openReconciliationPanel: "Mutabakat Panosu",
      openCommunicationPanel: "İletişim Kaydı",
      openMasterDataPanel: "Ana Veri Kaydı",
      referenceLead: "Lead",
      referenceOffer: "Teklif",
      referencePolicy: "Poliçe",
      referenceCustomer: "Müşteri",
      referenceClaim: "Hasar",
      referencePayment: "Ödeme",
      referenceRenewalTask: "Yenileme",
      referenceAccountingEntry: "Muhasebe",
      referenceReconciliationItem: "Mutabakat",
      matchedCustomers: "Eşleşen Müşteriler",
      createdDrafts: "Üretilen Taslaklar",
      skippedRows: "Atlanan Kayıtlar",
      previewRows: "Önizleme Satırı",
      hasMore: "Devamı Var",
      yes: "Evet",
      no: "Hayır",
      policies: "Poliçe",
      overdueInstallments: "Geciken Taksit",
      renewalWindow: "Yenileme Penceresi",
    },
    en: {
      breadcrumb: "Control Center → Communication",
      recordCount: "records",
      title: "Communication Center",
      subtitle: "Notification queue, dispatch and retry operations",
      refresh: "Refresh",
      exportXlsx: "Excel",
      exportPdf: "PDF",
      dispatch: "Run Dispatch",
      dispatching: "Running...",
      runCampaign: "Run Campaign",
      campaignRunTitle: "Run Campaign",
      selectCampaign: "Select campaign",
      previewSegment: "Preview Segment",
      segmentPreviewTitle: "Segment Member Preview",
      selectSegment: "Select segment",
      quickSegment: "Segment",
      quickSegmentSubtitle: "Create a target customer segment",
      quickCampaign: "Campaign",
      quickCampaignSubtitle: "Create a segment-based campaign",
      quickCallNote: "Call Note",
      quickCallNoteSubtitle: "Log a phone conversation as an interaction note",
      quickReminder: "Reminder",
      quickReminderSubtitle: "Create a time-based reminder for the current context",
      startAssignmentContext: "Start Assignment",
      blockAssignmentContext: "Block Assignment",
      closeAssignmentContext: "Close Assignment",
      clearCallFollowUpContext: "Clear Call Follow-up",
      completeReminderContext: "Complete Reminder",
      cancelReminderContext: "Cancel Reminder",
      quickMessage: "Quick Message",
      quickMessageSubtitle: "Save as draft or send immediately",
      saveDraft: "Save Draft",
      sendImmediately: "Send Now",
      filtersTitle: "Filters",
      advancedFilters: "Advanced Filters",
      hideAdvancedFilters: "Hide Advanced Filters",
      activeFilters: "active filters",
      presetLabel: "Filter Preset",
      presetDefault: "Standard",
      savePreset: "Save",
      deletePreset: "Delete",
      savePresetPrompt: "Filter preset name",
      deletePresetConfirm: "Delete selected custom filter preset?",
      applyFilters: "Apply",
      clearFilters: "Clear Filters",
      customerFilter: "Customer (AT Customer)",
      customerContext: "Customer Filter",
      clearCustomer: "Clear Customer Filter",
      referenceContext: "Record Context",
      clearContext: "Clear Context Filters",
      allStatuses: "All statuses",
      allChannels: "All channels",
      allReferenceTypes: "All record types",
      referenceNameFilter: "Record name / ID",
      outboxTitle: "Outbox Queue",
      draftTitle: "Notification Drafts",
      loading: "Loading...",
      loadErrorTitle: "Failed to Load Communication Data",
      permissionDeniedRead: "You do not have permission to view communication data.",
      permissionDeniedAction: "You do not have permission to perform this communication action.",
      emptyOutbox: "No outbox records found.",
      emptyOutboxTitle: "No Outbox Records",
      emptyDrafts: "No draft records found.",
      emptyDraftsTitle: "No Draft Records",
      recipient: "Recipient",
      channel: "Channel",
      status: "Status",
      recordType: "Record Type",
      attempts: "Attempts",
      nextRetry: "Next Retry",
      actions: "Actions",
      error: "Error",
      retry: "Retry",
      sendNow: "Send Now",
      openRef: "Open Record",
      queued: "Queued",
      processing: "Processing",
      sent: "Sent",
      failed: "Failed",
      dead: "Dead",
      sms: "SMS",
      email: "Email",
      whatsapp: "WhatsApp",
      openPolicyPanel: "Open Policy",
      openCustomerPanel: "Open Customer",
      openOffersPanel: "Offers Board",
      openClaimsPanel: "Claims Board",
      openPaymentsPanel: "Payments Board",
      openRenewalsPanel: "Renewals Board",
      openReconciliationPanel: "Reconciliation Board",
      openCommunicationPanel: "Communication Record",
      openMasterDataPanel: "Master Data Record",
      referenceLead: "Lead",
      referenceOffer: "Offer",
      referencePolicy: "Policy",
      referenceCustomer: "Customer",
      referenceClaim: "Claim",
      referencePayment: "Payment",
      referenceRenewalTask: "Renewal",
      referenceAccountingEntry: "Accounting",
      referenceReconciliationItem: "Reconciliation",
      matchedCustomers: "Matched Customers",
      createdDrafts: "Created Drafts",
      skippedRows: "Skipped Rows",
      previewRows: "Preview Rows",
      hasMore: "Has More",
      yes: "Yes",
      no: "No",
      policies: "Policies",
      overdueInstallments: "Overdue Installments",
      renewalWindow: "Renewal Window",
    },
  };
}

function createStatusCards(communicationStore) {
  return communicationStore.statusCards.map((item) => ({
    key: item.key,
    status: item.status,
    value: item.value,
  }));
}

export function useCommunicationCenterState({
  t,
  activeLocale,
  route,
  router,
  authStore,
  branchStore,
  communicationStore,
  reloadSnapshot,
  snapshotResource,
  communicationQuickTemplateResource,
  communicationQuickCustomerResource,
  communicationQuickPolicyResource,
  communicationQuickClaimResource,
  communicationQuickSegmentResource,
  communicationQuickCampaignResource,
}) {
  const copy = buildCopy(activeLocale);
  const filters = communicationStore.state.filters;

  const quickSegmentEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Segment" : "Quick Segment"));
  const quickCampaignEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Kampanya" : "Quick Campaign"));
  const quickCallNoteEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Arama Notu" : "Quick Call Note"));
  const quickReminderEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Hatırlatıcı" : "Quick Reminder"));
  const quickMessageEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Mesaj" : "Quick Message"));
  const canCreateQuickMessage = computed(() => authStore.can(["quickCreate", "communication_message"]));
  const canSendDraftNowAction = computed(() => authStore.can(["actions", "communication", "sendDraftNow"]));
  const canRetryOutboxAction = computed(() => authStore.can(["actions", "communication", "retryOutbox"]));
  const canRunDispatchCycle = computed(() => authStore.can(["actions", "communication", "runDispatchCycle"]));
  const returnToTarget = computed(() => String(route.query.return_to || "").trim());
  const safeReturnTo = computed(() => resolveSameOriginPath(returnToTarget.value) || "");
  const canReturnToContext = computed(() => Boolean(safeReturnTo.value || hasContextFilters.value));
  const returnToLabel = computed(() => {
    if (safeReturnTo.value) return activeLocale.value === "tr" ? "Kaynaga Don" : "Back to Source";
    return activeLocale.value === "tr" ? "Geri" : "Back";
  });

  const snapshotData = computed(() => communicationStore.state.snapshot || {});
  const snapshotErrorMessage = computed(() => {
    if (communicationStore.state.error) return communicationStore.state.error;
    const raw = unref(snapshotResource?.error);
    if (!raw) return "";
    if (isPermissionDeniedError(raw)) return t("permissionDeniedRead");
    if (typeof raw === "string") return raw;
    return raw?.message || raw?.exc || t("loadErrorTitle");
  });
  const outboxItems = computed(() => communicationStore.outboxItems);
  const draftItems = computed(() => communicationStore.draftItems);
  const breakdown = computed(() => communicationStore.breakdown);
  const activeFilterCount = computed(() => communicationStore.activeFilterCount);
  const statusCards = computed(() =>
    createStatusCards(communicationStore).map((item) => ({
      key: item.key,
      label: statusLabel(item.status),
      value: item.value,
    }))
  );

  const statusOptions = computed(() => [
    { value: "Queued", label: t("queued") },
    { value: "Processing", label: t("processing") },
    { value: "Sent", label: t("sent") },
    { value: "Failed", label: t("failed") },
    { value: "Dead", label: t("dead") },
  ]);
  const channelOptions = computed(() => [
    { value: "SMS", label: t("sms") },
    { value: "Email", label: t("email") },
    { value: "WHATSAPP", label: t("whatsapp") },
  ]);
  const referenceDoctypeOptions = computed(() => [
    { value: "AT Customer", label: referenceTypeLabel("AT Customer") },
    { value: "AT Lead", label: referenceTypeLabel("AT Lead") },
    { value: "AT Offer", label: referenceTypeLabel("AT Offer") },
    { value: "AT Policy", label: referenceTypeLabel("AT Policy") },
    { value: "AT Claim", label: referenceTypeLabel("AT Claim") },
    { value: "AT Payment", label: referenceTypeLabel("AT Payment") },
    { value: "AT Reminder", label: referenceTypeLabel("AT Reminder") },
    { value: "AT Renewal Task", label: referenceTypeLabel("AT Renewal Task") },
    { value: "AT Accounting Entry", label: referenceTypeLabel("AT Accounting Entry") },
    { value: "AT Reconciliation Item", label: referenceTypeLabel("AT Reconciliation Item") },
    { value: "AT Segment", label: referenceTypeLabel("AT Segment") },
    { value: "AT Campaign", label: referenceTypeLabel("AT Campaign") },
  ]);
  const communicationQuickOptionsMap = computed(() => ({
    notificationTemplates: asArray(resourceValue(communicationQuickTemplateResource, [])).map((row) => ({
      value: row.name,
      label: `${row.template_key || row.name}${row.channel ? ` (${channelLabel(row.channel)})` : ""}`,
    })),
    customers: asArray(resourceValue(communicationQuickCustomerResource, [])).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    })),
    policies: asArray(resourceValue(communicationQuickPolicyResource, [])).map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    claims: asArray(resourceValue(communicationQuickClaimResource, [])).map((row) => ({
      value: row.name,
      label: `${row.claim_no || row.name}${row.policy ? ` - ${row.policy}` : ""}`,
    })),
    segments: asArray(resourceValue(communicationQuickSegmentResource, [])).map((row) => ({
      value: row.name,
      label: `${row.segment_name || row.name}${row.channel_focus ? ` - ${channelLabel(row.channel_focus)}` : ""}`,
    })),
    campaigns: asArray(resourceValue(communicationQuickCampaignResource, [])).map((row) => ({
      value: row.name,
      label: `${row.campaign_name || row.name}${row.channel ? ` - ${channelLabel(row.channel)}` : ""}`,
    })),
  }));

  const customerContextLabel = computed(
    () => String(route.query.customer_label || filters.customer || "").trim() || String(filters.customer || "").trim()
  );
  const referenceContextLabel = computed(() => {
    const doctype = String(route.query.reference_label || filters.referenceDoctype || "").trim();
    const name = String(filters.referenceName || "").trim();
    if (!doctype && !name) return "";
    if (!doctype) return name;
    if (!name) return doctype;
    return `${doctype} / ${name}`;
  });
  const channelStatusContextLabel = computed(() => {
    const parts = [];
    if (filters.channel) parts.push(`${t("channel")}: ${channelLabel(filters.channel)}`);
    if (filters.status) parts.push(`${t("status")}: ${statusLabel(filters.status)}`);
    return parts.join(" • ");
  });
  const hasContextFilters = computed(
    () => Boolean(filters.customer || filters.referenceDoctype || filters.referenceName || filters.channel || filters.status)
  );
  const canStartAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim())
  );
  const canBlockAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim())
  );
  const canCloseAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim())
  );
  const canClearCallNoteContext = computed(
    () => filters.referenceDoctype === "AT Call Note" && Boolean(String(filters.referenceName || "").trim())
  );
  const canCompleteReminderContext = computed(
    () => filters.referenceDoctype === "AT Reminder" && Boolean(String(filters.referenceName || "").trim())
  );
  const canCancelReminderContext = computed(
    () => filters.referenceDoctype === "AT Reminder" && Boolean(String(filters.referenceName || "").trim())
  );

  function buildParams() {
    return {
      customer: filters.customer || null,
      status: filters.status || null,
      channel: filters.channel || null,
      reference_doctype: filters.referenceDoctype || null,
      reference_name: filters.referenceName || null,
      office_branch: branchStore.requestBranch || null,
      limit: filters.limit,
    };
  }

  function buildCustomerQuickFilters() {
    if (!branchStore.requestBranch) return {};
    return { office_branch: branchStore.requestBranch };
  }

  function resetCommunicationFilterState() {
    communicationStore.resetFilters();
  }

  function currentCommunicationPresetPayload() {
    return {
      customer: filters.customer,
      status: filters.status,
      channel: filters.channel,
      referenceDoctype: filters.referenceDoctype,
      referenceName: filters.referenceName,
      limit: Number(filters.limit) || 50,
    };
  }

  function setCommunicationFilterStateFromPayload(payload) {
    filters.customer = String(payload?.customer || "");
    filters.status = String(payload?.status || "");
    filters.channel = String(payload?.channel || "");
    filters.referenceDoctype = String(payload?.referenceDoctype || "");
    filters.referenceName = String(payload?.referenceName || "");
    filters.limit = Number(payload?.limit || 50) || 50;
  }

  function statusClass(status) {
    if (status === "Sent") return "bg-emerald-100 text-emerald-700";
    if (status === "Queued") return "bg-sky-100 text-sky-700";
    if (status === "Processing") return "bg-sky-100 text-sky-700";
    if (status === "Failed") return "bg-amber-100 text-amber-700";
    if (status === "Dead") return "bg-slate-100 text-slate-700";
    return "bg-slate-200 text-slate-700";
  }

  function statusLabel(status) {
    return statusLabelFrom(t, status);
  }

  function channelLabel(channel) {
    return channelLabelFrom(t, channel);
  }

  function sourcePanelConfig(item) {
    return getSourcePanelConfig(item?.reference_doctype, item?.reference_name);
  }

  function canOpenPanel(item) {
    return Boolean(sourcePanelConfig(item));
  }

  function panelActionLabel(item) {
    const cfg = sourcePanelConfig(item);
    return cfg ? t(cfg.labelKey) : "";
  }

  function openPanel(item) {
    const cfg = sourcePanelConfig(item);
    if (!cfg?.url) return;
    router.push(cfg.url);
  }

  function referenceTypeLabel(doctype) {
    return referenceTypeLabelFrom(t, doctype);
  }

  function reloadSnapshot() {
    communicationStore.setLoading(true);
    communicationStore.clearError();
    return snapshotResource.reload()
      .then((result) => {
        communicationStore.setSnapshot(result || {});
        communicationStore.setLoading(false);
        return result;
      })
      .catch((error) => {
        const message = isPermissionDeniedError(error)
          ? t("permissionDeniedRead")
          : error?.message || error?.exc || t("loadErrorTitle");
        communicationStore.setSnapshot({});
        communicationStore.setError(message);
        communicationStore.setLoading(false);
        throw error;
      });
  }

  function downloadCommunicationExport(format) {
    openTabularExport({
      permissionDoctypes: ["AT Notification Outbox", "AT Notification Draft"],
      exportKey: "communication_center",
      title: t("title"),
      columns: [
        t("recordType"),
        t("status"),
        t("channel"),
        t("recipient"),
        t("attempts"),
        t("nextRetry"),
        t("referenceContext"),
        t("error"),
      ],
      rows: [
        ...outboxItems.value.map((row) => ({
          [t("recordType")]: t("outboxTitle"),
          [t("status")]: `${t("outboxTitle")} / ${statusLabel(row.status)}`,
          [t("channel")]: channelLabel(row.channel),
          [t("recipient")]: row.recipient || "-",
          [t("attempts")]: `${row.attempt_count || 0}/${row.max_attempts || 0}`,
          [t("nextRetry")]: row.next_retry_on || "-",
          [t("referenceContext")]: [referenceTypeLabel(row.reference_doctype), row.reference_name].filter(Boolean).join(" / ") || "-",
          [t("error")]: row.error_message || "-",
        })),
        ...draftItems.value.map((row) => ({
          [t("recordType")]: t("draftTitle"),
          [t("status")]: `${t("draftTitle")} / ${statusLabel(row.status)}`,
          [t("channel")]: channelLabel(row.channel),
          [t("recipient")]: row.recipient || "-",
          [t("attempts")]: "-",
          [t("nextRetry")]: "-",
          [t("referenceContext")]: [referenceTypeLabel(row.reference_doctype), row.reference_name].filter(Boolean).join(" / ") || "-",
          [t("error")]: row.error_message || "-",
        })),
      ],
      filters: currentCommunicationPresetPayload(),
      format,
    });
  }

  function clearCustomerFilter() {
    filters.customer = "";
    const nextQuery = { ...route.query };
    delete nextQuery.customer;
    delete nextQuery.customer_label;
    router.replace({ query: nextQuery });
    reloadSnapshot();
  }

  function clearContextFilters() {
    communicationStore.setFilters({
      customer: "",
      status: "",
      channel: "",
      referenceDoctype: "",
      referenceName: "",
    });
    const nextQuery = { ...route.query };
    delete nextQuery.customer;
    delete nextQuery.customer_label;
    delete nextQuery.status;
    delete nextQuery.channel;
    delete nextQuery.reference_doctype;
    delete nextQuery.reference_name;
    delete nextQuery.reference_label;
    router.replace({ query: nextQuery });
    reloadSnapshot();
  }

  function applySnapshotFilters() {
    return reloadSnapshot();
  }

  function resetSnapshotFilters() {
    applyPreset("default", { refresh: false });
    void persistPresetStateToServer();
    return clearContextFilters();
  }

  function returnToContext() {
    if (!canReturnToContext.value) return;
    if (safeReturnTo.value) {
      router.push(safeReturnTo.value);
      return;
    }
    router.back();
  }

  function reloadQuickCustomers() {
    communicationQuickCustomerResource.params = {
      ...communicationQuickCustomerResource.params,
      filters: buildCustomerQuickFilters(),
    };
    communicationQuickPolicyResource.params = {
      ...communicationQuickPolicyResource.params,
      filters: buildCustomerQuickFilters(),
    };
    communicationQuickClaimResource.params = {
      ...communicationQuickClaimResource.params,
      filters: buildCustomerQuickFilters(),
    };
    communicationQuickSegmentResource.params = {
      ...communicationQuickSegmentResource.params,
      filters: buildCustomerQuickFilters(),
    };
    communicationQuickCampaignResource.params = {
      ...communicationQuickCampaignResource.params,
      filters: buildCustomerQuickFilters(),
    };
    return Promise.all([
      communicationQuickCustomerResource.reload(),
      communicationQuickPolicyResource.reload(),
      communicationQuickClaimResource.reload(),
      communicationQuickSegmentResource.reload(),
      communicationQuickCampaignResource.reload(),
    ]);
  }

  const {
    presetKey,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
  } = useCustomFilterPresets({
    screen: "communication_center",
    presetStorageKey: "at:communication-center:preset",
    presetListStorageKey: "at:communication-center:preset-list",
    t,
    getCurrentPayload: currentCommunicationPresetPayload,
    setFilterStateFromPayload: setCommunicationFilterStateFromPayload,
    resetFilterState: resetCommunicationFilterState,
    refresh: reloadSnapshot,
    getSortLocale: () => (activeLocale.value === "tr" ? "tr-TR" : "en-US"),
  });

  function hasRouteContextQuery() {
    return Boolean(
      route.query.customer ||
        route.query.status ||
        route.query.channel ||
        route.query.reference_doctype ||
        route.query.reference_name
    );
  }

  onMounted(() => {
    if (!hasRouteContextQuery()) {
      applyPreset(presetKey.value, { refresh: false });
    }
    void reloadSnapshot();
    void hydratePresetStateFromServer();
  });

  watch(
    () => [
      route.query.customer,
      route.query.customer_label,
      route.query.status,
      route.query.channel,
      route.query.reference_doctype,
      route.query.reference_name,
      route.query.reference_label,
    ],
    ([customer, _customerLabel, status, channel, referenceDoctype, referenceName]) => {
      const nextCustomer = String(customer || "").trim();
      const nextStatus = String(status || "").trim();
      const nextChannel = String(channel || "").trim();
      const nextReferenceDoctype = String(referenceDoctype || "").trim();
      const nextReferenceName = String(referenceName || "").trim();
      if (
        filters.customer === nextCustomer &&
        filters.status === nextStatus &&
        filters.channel === nextChannel &&
        filters.referenceDoctype === nextReferenceDoctype &&
        filters.referenceName === nextReferenceName
      ) {
        return;
      }
      communicationStore.setFilters({
        customer: nextCustomer,
        status: nextStatus,
        channel: nextChannel,
        referenceDoctype: nextReferenceDoctype,
        referenceName: nextReferenceName,
      });
      reloadSnapshot();
    },
    { immediate: true }
  );

  watch(
    () => branchStore.selected,
    () => {
      void reloadQuickCustomers();
      void reloadSnapshot();
    }
  );

  return {
    activeLocale,
    filters,
    quickSegmentEyebrow,
    quickCampaignEyebrow,
    quickCallNoteEyebrow,
    quickReminderEyebrow,
    quickMessageEyebrow,
    canCreateQuickMessage,
    canSendDraftNowAction,
    canRetryOutboxAction,
    canRunDispatchCycle,
    returnToTarget,
    safeReturnTo,
    canReturnToContext,
    returnToLabel,
    snapshotData,
    snapshotErrorMessage,
    outboxItems,
    draftItems,
    breakdown,
    activeFilterCount,
    statusOptions,
    channelOptions,
    referenceDoctypeOptions,
    communicationQuickOptionsMap,
    customerContextLabel,
    referenceContextLabel,
    channelStatusContextLabel,
    hasContextFilters,
    canStartAssignmentContext,
    canBlockAssignmentContext,
    canCloseAssignmentContext,
    canClearCallNoteContext,
    canCompleteReminderContext,
    canCancelReminderContext,
    presetKey,
    presetOptions,
    canDeletePreset,
    onPresetChange,
    savePreset,
    deletePreset,
    statusCards,
    buildParams,
    buildCustomerQuickFilters,
    resetCommunicationFilterState,
    currentCommunicationPresetPayload,
    setCommunicationFilterStateFromPayload,
    statusClass,
    statusLabel,
    channelLabel,
    reloadSnapshot,
    reloadQuickCustomers,
    clearCustomerFilter,
    clearContextFilters,
    applySnapshotFilters,
    resetSnapshotFilters,
    returnToContext,
    downloadCommunicationExport,
    sourcePanelConfig,
    canOpenPanel,
    panelActionLabel,
    openPanel,
    referenceTypeLabel,
  };
}
