import { computed, onBeforeUnmount, ref, unref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";

export function useLeadDetailRuntime({ name, activeLocale }) {
  const router = useRouter();
  const leadName = computed(() => String(unref(name) || "").trim());
  const localeValue = computed(() => unref(activeLocale) || "en");
  const localeCode = computed(() => (localeValue.value === "tr" ? "tr-TR" : "en-US"));
  const copy = {
    tr: {
      breadcrumb: "Satış → Fırsatlar",
      overview: "Fırsat Detayı",
      openDesk: "Yönetim Ekranını Aç",
      backList: "Listeye Dön",
      loading: "Yükleniyor...",
      loadError: "Fırsat detayı yüklenemedi.",
      leadInfoTitle: "Lead Bilgileri",
      conversionTitle: "Dönüşüm Durumu",
      relatedTitle: "İlişkili Kayıtlar",
      recentOffersTitle: "İlgili Teklifler",
      recentPoliciesTitle: "İlgili Poliçeler",
      noRelatedOffers: "İlgili teklif bulunamadı.",
      noRelatedPolicies: "İlgili poliçe bulunamadı.",
      opsPreviewTitle: "İletişim ve Operasyon",
      notifDraftsTitle: "Bildirim Taslakları",
      notifOutboxTitle: "Giden Bildirimler",
      paymentsPreviewTitle: "Ödeme Hareketleri",
      renewalsPreviewTitle: "Yenileme Görevleri",
      noNotifDrafts: "Bildirim taslağı yok.",
      noNotifOutbox: "Giden bildirim yok.",
      noPayments: "Ödeme hareketi yok.",
      noRenewals: "Yenileme görevi yok.",
      timelineMetaTitle: "Kayıt Zamanları",
      activityTimelineTitle: "Aktivite Özeti",
      quickActionsTitle: "Hızlı İşlemler",
      tabOverview: "Genel",
      tabConversion: "Dönüşüm",
      tabRelated: "İlişkili",
      tabOperations: "Operasyon",
      tabActivity: "Aktivite",
      openCustomer360: "Müşteri Detayını Aç",
      openOffer: "Teklif Detayını Aç",
      openPolicy: "Poliçeyi Aç",
      openCommunication: "İletişim Merkezini Aç",
      openPayments: "Ödemeleri Aç",
      openRenewals: "Yenileme Görevlerini Aç",
      customer: "Müşteri",
      phone: "Telefon",
      taxId: "Kimlik / Vergi No",
      email: "E-posta",
      officeBranch: "Ofis Şubesi",
      salesEntity: "Satış Birimi",
      company: "Sigorta Şirketi",
      branch: "Branş",
      estimatedGross: "Tahmini Brüt Prim",
      notes: "Notlar",
      convertedOffer: "Dönüşen Teklif",
      convertedPolicy: "Dönüşen Poliçe",
      noConversion: "Henüz dönüşüm yok",
      nextAction: "Sonraki Aksiyon",
      missingFields: "Eksik Alanlar",
      conversionActionConvert: "Teklife Çevir",
      conversionActionReview: "Bilgileri Tamamla",
      conversionActionClosed: "Kapalı Lead",
      linkedOfferTitle: "Dönüşen Teklif Özeti",
      linkedPolicyTitle: "Dönüşen Poliçe Özeti",
      accessView: "Kayıt Görüntülendi",
      accessEdit: "Kayıt Düzenlendi",
      accessExport: "Kayıt Dışa Aktarıldı",
      createOffer: "Teklif Oluştur",
      converting: "Çevriliyor...",
      convertLeadSuccess: "Lead teklife dönüştürüldü.",
      convertLeadError: "Lead teklife çevrilemedi.",
      status: "Durum",
      stale: "Takip Durumu",
      createdAt: "Oluşturuldu",
      modifiedAt: "Güncellendi",
      timelineEventCreated: "Lead oluşturuldu",
      timelineEventUpdated: "Lead güncellendi",
      timelineEventOffer: "Teklife dönüştü",
      timelineEventPolicy: "Poliçeye dönüştü",
    },
    en: {
      breadcrumb: "Sales → Leads",
      overview: "Opportunity Details",
      openDesk: "Open Desk",
      backList: "Back to List",
      loading: "Loading...",
      loadError: "Failed to load lead detail.",
      leadInfoTitle: "Lead Information",
      conversionTitle: "Conversion Status",
      relatedTitle: "Related Records",
      recentOffersTitle: "Related Offers",
      recentPoliciesTitle: "Related Policies",
      noRelatedOffers: "No related offers found.",
      noRelatedPolicies: "No related policies found.",
      opsPreviewTitle: "Communication & Operations",
      notifDraftsTitle: "Notification Drafts",
      notifOutboxTitle: "Outbox",
      paymentsPreviewTitle: "Payments",
      renewalsPreviewTitle: "Renewal Tasks",
      noNotifDrafts: "No notification drafts.",
      noNotifOutbox: "No outbox records.",
      noPayments: "No payments.",
      noRenewals: "No renewal tasks.",
      timelineMetaTitle: "Record Timestamps",
      activityTimelineTitle: "Activity Summary",
      quickActionsTitle: "Quick Actions",
      tabOverview: "Overview",
      tabConversion: "Conversion",
      tabRelated: "Related",
      tabOperations: "Operations",
      tabActivity: "Activity",
      openCustomer360: "Open Customer Details",
      openOffer: "Open Offer Details",
      openPolicy: "Open Policy",
      openCommunication: "Open Communication Center",
      openPayments: "Open Payments",
      openRenewals: "Open Renewals",
      customer: "Customer",
      phone: "Phone",
      taxId: "Identity / Tax Number",
      email: "Email",
      officeBranch: "Office Branch",
      salesEntity: "Sales Entity",
      company: "Insurance Company",
      branch: "Branch",
      estimatedGross: "Estimated Gross Premium",
      notes: "Notes",
      convertedOffer: "Converted Offer",
      convertedPolicy: "Converted Policy",
      noConversion: "No conversion yet",
      nextAction: "Next Action",
      missingFields: "Missing Fields",
      conversionActionConvert: "Convert to Offer",
      conversionActionReview: "Complete Fields",
      conversionActionClosed: "Closed Lead",
      linkedOfferTitle: "Converted Offer Snapshot",
      linkedPolicyTitle: "Converted Policy Snapshot",
      accessView: "Record Viewed",
      accessEdit: "Record Edited",
      accessExport: "Record Exported",
      createOffer: "Create Offer",
      converting: "Converting...",
      convertLeadSuccess: "Lead converted to offer.",
      convertLeadError: "Failed to convert lead to offer.",
      status: "Status",
      stale: "Follow-up",
      createdAt: "Created",
      modifiedAt: "Modified",
      timelineEventCreated: "Lead created",
      timelineEventUpdated: "Lead updated",
      timelineEventOffer: "Converted to offer",
      timelineEventPolicy: "Converted to policy",
    },
  };

  function t(key) {
    return copy[localeValue.value]?.[key] || copy.en[key] || key;
  }

  const leadResource = createResource({ url: "frappe.client.get", auto: false });
  const leadDetailPayloadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_lead_detail_payload",
    auto: false,
  });
  const leadRelatedOffersResource = createResource({ url: "frappe.client.get_list", auto: false });
  const leadRelatedPoliciesResource = createResource({ url: "frappe.client.get_list", auto: false });
  const leadConvertResource = createResource({
    url: "acentem_takipte.doctype.at_lead.at_lead.convert_to_offer",
    auto: false,
  });

  const lead = computed(() => leadResource.data || {});
  const loading = computed(() => leadResource.loading);
  const loadErrorText = computed(() => {
    const err = leadResource.error;
    if (!err) return "";
    return err?.message || err?.exc || t("loadError");
  });
  const actionErrorText = ref("");
  const actionSuccessText = ref("");
  const lastConvertedOfferName = ref("");
  const activeLeadTab = ref("overview");
  let actionFlashTimer = null;

  const leadDetailPayload = computed(() =>
    leadDetailPayloadResource.data && typeof leadDetailPayloadResource.data === "object" ? leadDetailPayloadResource.data : {}
  );

  const leadDisplayTitle = computed(() => {
    const first = String(lead.value.first_name || "").trim();
    const last = String(lead.value.last_name || "").trim();
    return `${first} ${last}`.trim() || lead.value.name || leadName.value;
  });
  const leadHeaderSubtitle = computed(() =>
    [lead.value.email || null, lead.value.customer || null].filter(Boolean).join(" / ")
  );
  const leadHeaderSummaryItems = computed(() => [
    { key: "status", label: t("status"), value: lead.value.status || "-" },
    { key: "stale", label: t("stale"), value: leadStaleLabel(leadStaleState(lead.value)) },
    { key: "est", label: t("estimatedGross"), value: fmtMoney(lead.value.estimated_gross_premium, "TRY") },
    { key: "offer", label: t("convertedOffer"), value: lead.value.converted_offer || "-" },
    { key: "policy", label: t("convertedPolicy"), value: lead.value.converted_policy || "-" },
  ]);
  const leadNotificationDrafts = computed(() =>
    Array.isArray(leadDetailPayload.value.notification_drafts) ? leadDetailPayload.value.notification_drafts : []
  );
  const leadNotificationOutbox = computed(() =>
    Array.isArray(leadDetailPayload.value.notification_outbox) ? leadDetailPayload.value.notification_outbox : []
  );
  const leadPayments = computed(() => (Array.isArray(leadDetailPayload.value.payments) ? leadDetailPayload.value.payments : []));
  const leadRenewals = computed(() => (Array.isArray(leadDetailPayload.value.renewals) ? leadDetailPayload.value.renewals : []));
  const opsPreviewCount = computed(
    () => leadNotificationDrafts.value.length + leadNotificationOutbox.value.length + leadPayments.value.length + leadRenewals.value.length
  );
  const relatedOffers = computed(() =>
    Array.isArray(leadDetailPayload.value.related_offers)
      ? leadDetailPayload.value.related_offers
      : lead.value.customer && Array.isArray(leadRelatedOffersResource.data)
        ? leadRelatedOffersResource.data
        : []
  );
  const relatedPolicies = computed(() =>
    Array.isArray(leadDetailPayload.value.related_policies)
      ? leadDetailPayload.value.related_policies
      : lead.value.customer && Array.isArray(leadRelatedPoliciesResource.data)
        ? leadRelatedPoliciesResource.data
        : []
  );
  const relatedRecordsCount = computed(() => relatedOffers.value.length + relatedPolicies.value.length);

  const leadInfoFacts = computed(() => [
    { key: "customer", label: t("customer"), value: lead.value.customer || "-" },
    { key: "phone", label: t("phone"), value: lead.value.phone || "-" },
    { key: "tax", label: t("taxId"), value: lead.value.tax_id || "-" },
    { key: "email", label: t("email"), value: lead.value.email || "-" },
    { key: "office_branch", label: t("officeBranch"), value: lead.value.office_branch || "-" },
    { key: "sales", label: t("salesEntity"), value: lead.value.sales_entity || "-" },
    { key: "company", label: t("company"), value: lead.value.insurance_company || "-" },
    { key: "branch", label: t("branch"), value: lead.value.branch || "-" },
    { key: "est", label: t("estimatedGross"), value: fmtMoney(lead.value.estimated_gross_premium, "TRY") },
  ]);
  const leadConversionFacts = computed(() => {
    const row = lead.value;
    const items = [];
    if (row.converted_offer) items.push({ key: "offer", label: t("convertedOffer"), value: row.converted_offer });
    if (row.converted_policy) items.push({ key: "policy", label: t("convertedPolicy"), value: row.converted_policy });
    if (!items.length) {
      const nextAction =
        String(row.status || "") === "Closed"
          ? t("conversionActionClosed")
          : canConvertLead(row)
            ? t("conversionActionConvert")
            : t("conversionActionReview");
      items.push({ key: "none", label: t("convertedPolicy"), value: t("noConversion") });
      items.push({ key: "next", label: t("nextAction"), value: nextAction });
      const missing = leadConversionMissingFields(row);
      if (missing) items.push({ key: "missing", label: t("missingFields"), value: missing });
    }
    return items;
  });
  const leadActivityItems = computed(() => {
    const payloadEvents = Array.isArray(leadDetailPayload.value.activity) ? leadDetailPayload.value.activity : [];
    if (payloadEvents.length) {
      return payloadEvents.map(mapLeadActivityEvent).filter(Boolean);
    }
    const items = [];
    if (lead.value.creation) {
      items.push({
        key: "created",
        title: t("timelineEventCreated"),
        description: fmtDateTime(lead.value.creation),
        meta: lead.value.owner || "-",
      });
    }
    if (lead.value.converted_offer) {
      items.push({
        key: "converted_offer",
        title: t("timelineEventOffer"),
        description: lead.value.converted_offer,
        meta: lead.value.converted_policy ? `${t("openPolicy")}: ${lead.value.converted_policy}` : "",
      });
    }
    if (lead.value.converted_policy) {
      items.push({
        key: "converted_policy",
        title: t("timelineEventPolicy"),
        description: lead.value.converted_policy,
        meta: lead.value.converted_offer ? `${t("openOffer")}: ${lead.value.converted_offer}` : "",
      });
    }
    if (lead.value.modified) {
      items.push({
        key: "modified",
        title: t("timelineEventUpdated"),
        description: fmtDateTime(lead.value.modified),
        meta: lead.value.modified_by || lead.value.owner || "-",
      });
    }
    return items;
  });
  const linkedConvertedOfferSummary = computed(() => leadDetailPayload.value.linked_offer || null);
  const linkedConvertedPolicySummary = computed(() => leadDetailPayload.value.linked_policy || null);
  const linkedConversionCards = computed(() => {
    const cards = [];
    if (linkedConvertedOfferSummary.value?.name) {
      cards.push({
        key: "linked-offer",
        title: t("linkedOfferTitle"),
        subtitle: linkedConvertedOfferSummary.value.name,
        description: fmtDate(linkedConvertedOfferSummary.value.offer_date),
        meta: [linkedConvertedOfferSummary.value.status || null, fmtMoney(linkedConvertedOfferSummary.value.gross_premium, linkedConvertedOfferSummary.value.currency || "TRY")]
          .filter(Boolean)
          .join(" / "),
        actionLabel: t("openOffer"),
        open: () => openOfferDetail(linkedConvertedOfferSummary.value.name),
      });
    }
    if (linkedConvertedPolicySummary.value?.name) {
      cards.push({
        key: "linked-policy",
        title: t("linkedPolicyTitle"),
        subtitle: linkedConvertedPolicySummary.value.policy_no || linkedConvertedPolicySummary.value.name,
        description: fmtDate(linkedConvertedPolicySummary.value.end_date),
        meta: [linkedConvertedPolicySummary.value.status || null, fmtMoney(linkedConvertedPolicySummary.value.gross_premium, linkedConvertedPolicySummary.value.currency || "TRY")]
          .filter(Boolean)
          .join(" / "),
        actionLabel: t("openPolicy"),
        open: () => openPolicyDetail(linkedConvertedPolicySummary.value.name),
      });
    }
    return cards;
  });
  const leadInfoFields = computed(() => leadInfoFacts.value.map((item) => ({ label: item.label, value: item.value })));
  const leadConversionFields = computed(() => leadConversionFacts.value.map((item) => ({ label: item.label, value: item.value })));
  const leadMetaFields = computed(() => [
    { label: t("createdAt"), value: fmtDateTime(lead.value.creation) },
    { label: t("modifiedAt"), value: fmtDateTime(lead.value.modified) },
    { label: t("status"), value: lead.value.status || "-" },
    { label: t("stale"), value: leadStaleLabel(leadStaleState(lead.value)) },
  ]);
  const heroCells = computed(() => [
    { label: t("customer"), value: lead.value.customer || lead.value.email || "-" },
    { label: t("officeBranch"), value: lead.value.office_branch || "-" },
    { label: t("estimatedGross"), value: fmtMoney(lead.value.estimated_gross_premium, "TRY"), variant: "lg" },
    {
      label: t("convertedOffer"),
      value: lead.value.converted_offer || t("noConversion"),
      variant: canConvertLead(lead.value) ? "accent" : "default",
    },
  ]);
  const leadTabs = computed(() => [
    { value: "overview", label: t("tabOverview") },
    { value: "conversion", label: t("tabConversion") },
    { value: "related", label: t("tabRelated"), count: relatedRecordsCount.value || undefined },
    { value: "operations", label: t("tabOperations"), count: opsPreviewCount.value || undefined },
    { value: "activity", label: t("tabActivity"), count: leadActivityItems.value.length || undefined },
  ]);
  const uiLeadStatus = computed(() => mapLeadStatusTone(lead.value.status));
  const uiLeadStaleStatus = computed(() => mapLeadStaleTone(leadStaleState(lead.value)));

  async function loadLeadRelatedRecords() {
    const customer = String(lead.value.customer || "").trim();
    if (!customer) return;
    await Promise.allSettled([
      leadRelatedOffersResource.reload({
        doctype: "AT Offer",
        fields: ["name", "status", "offer_date", "gross_premium", "currency", "modified"],
        filters: { customer },
        order_by: "modified desc",
        limit_page_length: 5,
      }),
      leadRelatedPoliciesResource.reload({
        doctype: "AT Policy",
        fields: ["name", "policy_no", "status", "end_date", "gross_premium", "currency", "modified"],
        filters: { customer },
        order_by: "modified desc",
        limit_page_length: 5,
      }),
    ]);
  }

  async function loadLead() {
    const currentName = leadName.value;
    if (!currentName) return;
    const [leadResult] = await Promise.allSettled([
      leadResource.reload({ doctype: "AT Lead", name: currentName }),
      leadDetailPayloadResource.reload({ name: currentName }),
    ]);
    const result = leadResult.status === "fulfilled" ? leadResult.value : null;
    const hasPayloadRelated =
      Array.isArray(leadDetailPayload.value.related_offers) || Array.isArray(leadDetailPayload.value.related_policies);
    if (!hasPayloadRelated) {
      await loadLeadRelatedRecords();
    }
    return result;
  }

  function goBack() {
    router.push({ name: "lead-list" });
  }
  function openDeskLead() {
    const currentName = leadName.value;
    if (!currentName) return;
    window.location.assign(`/app/at-lead/${encodeURIComponent(currentName)}`);
  }
  function openCustomer360(name) {
    if (!name) return;
    router.push({ name: "customer-detail", params: { name } });
  }
  function openOfferDetail(name) {
    if (!name) return;
    router.push({ name: "offer-detail", params: { name } });
  }
  function openPolicyDetail(name) {
    if (!name) return;
    router.push({ name: "policy-detail", params: { name } });
  }
  function openCommunicationCenterForLead(item = null) {
    const query = {
      customer: lead.value.customer || "",
      customer_label: leadDisplayTitle.value || lead.value.customer || "",
      return_to: router.currentRoute.value?.fullPath || "",
    };
    if (item && typeof item === "object") {
      const channel = String(item.channel || "").trim();
      const status = String(item.status || "").trim();
      const referenceDoctype = String(item.reference_doctype || "").trim();
      const referenceName = String(item.reference_name || "").trim();
      if (channel) query.channel = channel;
      if (status) query.status = status;
      if (referenceDoctype) {
        query.reference_doctype = referenceDoctype;
        query.reference_label = referenceDoctype;
      }
      if (referenceName) query.reference_name = referenceName;
    }
    router.push({ name: "communication-center", query });
  }
  function openPaymentsBoard() {
    router.push({ name: "payments-board" });
  }
  function openRenewalsBoard() {
    router.push({ name: "renewals-board" });
  }

  function canConvertLead(row) {
    if (!row || row.converted_offer || row.converted_policy) return false;
    if (String(row.status || "") === "Closed") return false;
    if (!row.customer || !row.sales_entity || !row.insurance_company || !row.branch) return false;
    const estimated = Number(row.estimated_gross_premium || 0);
    return Number.isFinite(estimated) && estimated > 0;
  }
  function clearActionFeedback() {
    if (actionFlashTimer) {
      window.clearTimeout(actionFlashTimer);
      actionFlashTimer = null;
    }
    actionErrorText.value = "";
    actionSuccessText.value = "";
    lastConvertedOfferName.value = "";
  }
  function scheduleActionFeedbackClear() {
    if (actionFlashTimer) window.clearTimeout(actionFlashTimer);
    actionFlashTimer = window.setTimeout(() => {
      actionErrorText.value = "";
      actionSuccessText.value = "";
      lastConvertedOfferName.value = "";
      actionFlashTimer = null;
    }, 4000);
  }
  async function convertLeadToOffer() {
    const row = lead.value;
    if (!canConvertLead(row) || !row?.name || leadConvertResource.loading) return;
    clearActionFeedback();
    try {
      const result = await leadConvertResource.submit({ lead_name: row.name });
      const offerName = String(result?.offer || "").trim();
      if (offerName) {
        lastConvertedOfferName.value = offerName;
        actionSuccessText.value = "";
        await loadLead();
        scheduleActionFeedbackClear();
        router.push({ name: "offer-detail", params: { name: offerName } });
        return;
      }
      actionSuccessText.value = String(result?.message || t("convertLeadSuccess"));
      await loadLead();
      scheduleActionFeedbackClear();
    } catch (error) {
      actionErrorText.value = parseActionError(error) || t("convertLeadError");
      scheduleActionFeedbackClear();
    }
  }
  function parseActionError(error) {
    const direct = error?.message || error?.exc_type;
    if (direct) return String(direct);
    const serverMessage =
      error?._server_messages ||
      error?.messages?.[0] ||
      error?.response?._server_messages ||
      error?.response?.message;
    if (!serverMessage) return "";
    try {
      const parsed = typeof serverMessage === "string" ? JSON.parse(serverMessage) : serverMessage;
      if (Array.isArray(parsed) && parsed.length) return String(parsed[0]).replace(/<[^>]*>/g, "").trim();
    } catch {
      return String(serverMessage).replace(/<[^>]*>/g, "").trim();
    }
    return "";
  }
  function leadConversionMissingFields(row) {
    if (!row || row.converted_offer || row.converted_policy) return "";
    const missing = [];
    if (!row.customer) missing.push(t("customer"));
    if (!row.sales_entity) missing.push(t("salesEntity"));
    if (!row.insurance_company) missing.push(t("company"));
    if (!row.branch) missing.push(t("branch"));
    const estimated = Number(row.estimated_gross_premium || 0);
    if (!(Number.isFinite(estimated) && estimated > 0)) missing.push(t("estimatedGross"));
    return missing.join(", ");
  }
  function leadAgeDays(value) {
    if (!value) return 999;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 999;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
  }
  function leadStaleState(row) {
    const days = leadAgeDays(row?.modified);
    if (days >= 8) return "Stale";
    if (days >= 3) return "FollowUp";
    return "Fresh";
  }
  function leadStaleLabel(state) {
    if (state === "Fresh") return localeValue.value === "tr" ? "Güncel" : "Fresh";
    if (state === "FollowUp") return localeValue.value === "tr" ? "Takip Et" : "Follow Up";
    return localeValue.value === "tr" ? "Bekliyor" : "Stale";
  }
  function fmtMoney(value, currency = "TRY") {
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }
  function fmtDate(value) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "medium" }).format(new Date(value));
    } catch {
      return String(value);
    }
  }
  function fmtDateTime(value) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch {
      return String(value);
    }
  }
  function mapLeadActivityEvent(event) {
    if (!event || typeof event !== "object") return null;
    const type = String(event.type || event.event_type || "").trim();
    if (!type) return null;
    if (type === "access") {
      const actionLabel = String(event.action || event.label || type).trim();
      return {
        key: event.key || `access-${event.at}-${event.actor}`,
        title: actionLabel,
        description: fmtDateTime(event.at),
        meta: [event.actor || null, event.meta || null].filter(Boolean).join(" / "),
      };
    }
    const titleMap = {
      created: t("timelineEventCreated"),
      modified: t("timelineEventUpdated"),
      converted_offer: t("timelineEventOffer"),
      converted_policy: t("timelineEventPolicy"),
    };
    return {
      key: event.key || `${type}-${event.at || ""}`,
      title: titleMap[type] || type,
      description: event.reference_name || fmtDateTime(event.at),
      meta: [event.actor || null, event.at ? fmtDateTime(event.at) : null].filter(Boolean).join(" / "),
    };
  }
  function relatedOfferMeta(item) {
    const parts = [item?.status || null, fmtMoney(item?.gross_premium, item?.currency || "TRY")].filter(Boolean);
    return parts.join(" / ");
  }
  function relatedPolicyMeta(item) {
    const parts = [item?.status || null, fmtMoney(item?.gross_premium, item?.currency || "TRY")].filter(Boolean);
    return parts.join(" / ");
  }
  function leadPaymentMeta(item) {
    return [item?.payment_direction || null, item?.status || null, fmtMoney(item?.amount_try, "TRY")].filter(Boolean).join(" / ");
  }
  function leadRenewalMeta(item) {
    return [item?.status || null, item?.renewal_date ? fmtDate(item.renewal_date) : null, item?.assigned_to || null]
      .filter(Boolean)
      .join(" / ");
  }
  function notificationPreviewMeta(item) {
    return [item?.reference_doctype || null, item?.modified ? fmtDateTime(item.modified) : null].filter(Boolean).join(" / ");
  }
  function mapLeadStatusTone(status) {
    const normalized = String(status || "draft").trim().toLowerCase();
    if (["converted", "qualified", "won", "active"].includes(normalized)) return "active";
    if (["open", "new", "contacted", "pending"].includes(normalized)) return "waiting";
    if (["lost", "closed", "cancelled"].includes(normalized)) return "cancel";
    return "draft";
  }
  function mapLeadStaleTone(state) {
    const normalized = String(state || "fresh").trim().toLowerCase();
    if (["stale", "aging"].includes(normalized)) return "waiting";
    if (["critical", "overdue"].includes(normalized)) return "cancel";
    return "active";
  }

  watch(
    leadName,
    () => {
      clearActionFeedback();
      activeLeadTab.value = "overview";
      loadLead();
    },
    { immediate: true }
  );
  onBeforeUnmount(clearActionFeedback);

  return {
    lead,
    loading,
    loadErrorText,
    leadDisplayTitle,
    leadHeaderSubtitle,
    leadHeaderSummaryItems,
    leadTabs,
    activeLeadTab,
    relatedOffers,
    relatedPolicies,
    leadNotificationDrafts,
    leadNotificationOutbox,
    leadPayments,
    leadRenewals,
    leadInfoFields,
    leadConversionFields,
    leadMetaFields,
    leadActivityItems,
    linkedConversionCards,
    uiLeadStatus,
    uiLeadStaleStatus,
    heroCells,
    actionErrorText,
    actionSuccessText,
    lastConvertedOfferName,
    leadConvertResource,
    leadDetailPayloadResource,
    fmtDate,
    fmtDateTime,
    relatedOfferMeta,
    relatedPolicyMeta,
    notificationPreviewMeta,
    leadPaymentMeta,
    leadRenewalMeta,
    canConvertLead,
    openCustomer360,
    openOfferDetail,
    openPolicyDetail,
    openCommunicationCenterForLead,
    openPaymentsBoard,
    openRenewalsBoard,
    goBack,
    openDeskLead,
    convertLeadToOffer,
    mapLeadStatusTone,
    mapLeadStaleTone,
    leadStaleState,
    leadStaleLabel,
    leadConversionMissingFields,
    leadConversionState,
    leadAgeDays,
    parseActionError,
  };
}

export function leadAgeDays(value) {
  if (!value) return 999;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

export function leadStaleState(row) {
  const days = leadAgeDays(row?.modified);
  if (days >= 8) return "Stale";
  if (days >= 3) return "FollowUp";
  return "Fresh";
}

export function leadStaleLabel(state, locale = "en") {
  if (state === "Fresh") return locale === "tr" ? "Güncel" : "Fresh";
  if (state === "FollowUp") return locale === "tr" ? "Takip Et" : "Follow Up";
  return locale === "tr" ? "Bekliyor" : "Stale";
}

export function leadConversionState(row) {
  if (row?.converted_policy) return "Policy";
  if (row?.converted_offer) return "Offer";
  if (String(row?.status || "") === "Closed") return "Closed";
  if (canConvertLead(row)) return "Actionable";
  return "Incomplete";
}

export function canConvertLead(row) {
  if (!row || row.converted_offer || row.converted_policy) return false;
  if (String(row.status || "") === "Closed") return false;
  if (!row.customer || !row.sales_entity || !row.insurance_company || !row.branch) return false;
  const estimated = Number(row.estimated_gross_premium || 0);
  return Number.isFinite(estimated) && estimated > 0;
}

export function leadConversionMissingFields(row, t = (key) => key) {
  if (!row || row.converted_offer || row.converted_policy) return "";
  const missing = [];
  if (!row.customer) missing.push(t("customer"));
  if (!row.sales_entity) missing.push(t("salesEntity"));
  if (!row.insurance_company) missing.push(t("company"));
  if (!row.branch) missing.push(t("branch"));
  const estimated = Number(row.estimated_gross_premium || 0);
  if (!(Number.isFinite(estimated) && estimated > 0)) missing.push(t("estimatedGross"));
  return missing.join(", ");
}

export function mapLeadStatusTone(status) {
  const normalized = String(status || "draft").trim().toLowerCase();
  if (["converted", "qualified", "won", "active"].includes(normalized)) return "active";
  if (["open", "new", "contacted", "pending"].includes(normalized)) return "waiting";
  if (["lost", "closed", "cancelled"].includes(normalized)) return "cancel";
  return "draft";
}

export function mapLeadStaleTone(state) {
  const normalized = String(state || "fresh").trim().toLowerCase();
  if (["stale", "aging"].includes(normalized)) return "waiting";
  if (["critical", "overdue"].includes(normalized)) return "cancel";
  return "active";
}

export function parseLeadActionError(error) {
  const direct = error?.message || error?.exc_type;
  if (direct) return String(direct);
  const serverMessage =
    error?._server_messages ||
    error?.messages?.[0] ||
    error?.response?._server_messages ||
    error?.response?.message;
  if (!serverMessage) return "";
  try {
    const parsed = typeof serverMessage === "string" ? JSON.parse(serverMessage) : serverMessage;
    if (Array.isArray(parsed) && parsed.length) return String(parsed[0]).replace(/<[^>]*>/g, "").trim();
  } catch {
    return String(serverMessage).replace(/<[^>]*>/g, "").trim();
  }
  return "";
}
