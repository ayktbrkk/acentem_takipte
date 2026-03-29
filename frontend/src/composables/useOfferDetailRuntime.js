import { computed, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { formatDate, formatDateTime, formatMoney, offerStatusTone as sharedOfferStatusTone } from "../utils/detailFormatters";

export function useOfferDetailRuntime({ props, router, t, localeCode }) {
  const offerResource = createResource({ url: "frappe.client.get", auto: false });
  const offerDetailPayloadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_offer_detail_payload",
    auto: false,
  });
  const relatedOffersResource = createResource({ url: "frappe.client.get_list", auto: false });
  const relatedPoliciesResource = createResource({ url: "frappe.client.get_list", auto: false });

  const offer = computed(() => offerResource.data || {});
  const loading = computed(() => Boolean(offerResource.loading));
  const loadErrorText = computed(() => {
    const err = offerResource.error;
    if (!err) return "";
    return err?.message || err?.exc || t("loadError");
  });
  const resolvedLocaleCode = computed(() => (unref(localeCode) || "en-US"));
  const offerDetailPayload = computed(() =>
    offerDetailPayloadResource.data && typeof offerDetailPayloadResource.data === "object" ? offerDetailPayloadResource.data : {}
  );
  const relatedOffers = computed(() =>
    Array.isArray(offerDetailPayload.value.related_offers)
      ? offerDetailPayload.value.related_offers
      : offer.value.customer && Array.isArray(relatedOffersResource.data)
        ? relatedOffersResource.data
        : []
  );
  const relatedPolicies = computed(() =>
    Array.isArray(offerDetailPayload.value.related_policies)
      ? offerDetailPayload.value.related_policies
      : offer.value.customer && Array.isArray(relatedPoliciesResource.data)
        ? relatedPoliciesResource.data
        : []
  );
  const relatedRecordsCount = computed(() => relatedOffers.value.length + relatedPolicies.value.length);
  const offerNotificationDrafts = computed(() =>
    Array.isArray(offerDetailPayload.value.notification_drafts) ? offerDetailPayload.value.notification_drafts : []
  );
  const offerNotificationOutbox = computed(() =>
    Array.isArray(offerDetailPayload.value.notification_outbox) ? offerDetailPayload.value.notification_outbox : []
  );
  const offerPayments = computed(() => (Array.isArray(offerDetailPayload.value.payments) ? offerDetailPayload.value.payments : []));
  const offerRenewals = computed(() => (Array.isArray(offerDetailPayload.value.renewals) ? offerDetailPayload.value.renewals : []));
  const opsPreviewCount = computed(
    () => offerNotificationDrafts.value.length + offerNotificationOutbox.value.length + offerPayments.value.length + offerRenewals.value.length
  );
  const isOfferConvertible = computed(
    () => !offer.value.converted_policy && ["Sent", "Accepted"].includes(String(offer.value.status || ""))
  );
  const uiOfferStatus = computed(() => sharedOfferStatusTone(offer.value.status));
  const offerHeaderSubtitle = computed(() =>
    [offer.value.customer || null, offer.value.insurance_company || null].filter(Boolean).join(" / ")
  );
  const payloadSourceLead = computed(() => offerDetailPayload.value.source_lead || null);
  const payloadLinkedPolicy = computed(() => offerDetailPayload.value.linked_policy || null);
  const heroCells = computed(() => [
    { label: "Şirket", value: offer.value.company_name || offer.value.insurance_company || "-", variant: "default" },
    { label: "Branş", value: offer.value.branch || "-", variant: "default" },
    { label: "Prim", value: offer.value.premium || offer.value.gross_premium || "-", variant: "lg" },
    { label: "Geçerlilik", value: offer.value.valid_until || "-", variant: "accent" },
  ]);
  const coverages = computed(() => {
    const payload = offerDetailPayload.value;
    if (Array.isArray(payload.coverages)) return payload.coverages;
    if (Array.isArray(payload.items)) return payload.items;
    return [];
  });
  const documents = computed(() => {
    const payload = offerDetailPayload.value;
    if (Array.isArray(payload.documents)) return payload.documents;
    if (Array.isArray(payload.attachments)) return payload.attachments;
    return [];
  });
  const activities = computed(() => {
    const payload = offerDetailPayload.value;
    if (Array.isArray(payload.activity)) return payload.activity;
    return [];
  });
  const offerFields = computed(() => [
    { label: "Şirket", value: offer.value.company_name || offer.value.insurance_company || "-" },
    { label: "Branş", value: offer.value.branch || "-" },
    { label: "Başlangıç", value: fmtDate(offer.value.start_date) },
    { label: "Bitiş", value: fmtDate(offer.value.end_date) },
    { label: "Geçerlilik", value: fmtDate(offer.value.valid_until) },
    { label: "Prim", value: fmtMoney(offer.value.premium || offer.value.gross_premium, offer.value.currency || "TRY") },
    { label: "Komisyon", value: fmtMoney(offer.value.commission || offer.value.commission_amount, offer.value.currency || "TRY") },
  ]);
  const recordFields = computed(() => [
    { label: "Oluşturan", value: offer.value.owner || "-" },
    { label: "Oluşturulma", value: fmtDateTime(offer.value.creation) },
    { label: "Güncelleyen", value: offer.value.modified_by || "-" },
    { label: "Güncelleme", value: fmtDateTime(offer.value.modified) },
  ]);

  async function loadRelatedRecords() {
    const customer = String(offer.value.customer || "").trim();
    if (!customer) return;
    await Promise.allSettled([
      relatedOffersResource.reload({
        doctype: "AT Offer",
        fields: ["name", "status", "offer_date", "gross_premium", "currency", "modified"],
        filters: [["customer", "=", customer], ["name", "!=", props.name]],
        order_by: "modified desc",
        limit_page_length: 5,
      }),
      relatedPoliciesResource.reload({
        doctype: "AT Policy",
        fields: ["name", "policy_no", "status", "end_date", "gross_premium", "currency", "modified"],
        filters: { customer },
        order_by: "modified desc",
        limit_page_length: 5,
      }),
    ]);
  }

  async function loadOffer() {
    if (!props.name) return;
    await Promise.allSettled([
      offerResource.reload({ doctype: "AT Offer", name: props.name }),
      offerDetailPayloadResource.reload({ name: props.name }),
    ]);
    const hasPayloadRelated =
      Array.isArray(offerDetailPayload.value.related_offers) || Array.isArray(offerDetailPayload.value.related_policies);
    if (!hasPayloadRelated) {
      await loadRelatedRecords();
    }
  }

  function openOfferDesk() {
    if (!props.name) return;
    window.location.assign(`/app/at-offer/${encodeURIComponent(props.name)}`);
  }

  function goBack() {
    router.push({ name: "offer-board", query: { view: "list" } }).catch(() => {
      router.push({ name: "offer-board" });
    });
  }

  function downloadPDF() {
    if (!props.name) return;
    const url = `/api/method/acentem_takipte.acentem_takipte.api.list_exports.download_export?screen=offer_detail&format=pdf&name=${encodeURIComponent(props.name)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function sendEmail() {
    openCommunicationCenterForOffer();
  }

  function convertToPolicy() {
    openConvertInOfferBoard();
  }

  function editOffer() {
    openOfferDesk();
  }

  function openCustomer360(name) {
    if (!name) return;
    router.push({ name: "customer-detail", params: { name } });
  }

  function viewCustomer() {
    openCustomer360(offer.value.customer || offer.value.customer_name);
  }

  function initials(value) {
    const words = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!words.length) return "-";
    return words.map((word) => String(word[0] || "").toUpperCase()).join("");
  }

  function openDocument(doc) {
    const fileUrl = String(doc?.file_url || doc?.url || "").trim();
    if (!fileUrl) return;
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  }

  function openPolicyDetail(name) {
    if (!name) return;
    router.push({ name: "policy-detail", params: { name } });
  }

  function openCommunicationCenterForOffer(item = null) {
    const query = {
      customer: offer.value.customer || "",
      customer_label: offer.value.customer || offer.value.name || props.name || "",
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

  function openOfferDetail(name) {
    if (!name) return;
    router.push({ name: "offer-detail", params: { name } });
  }

  function openPaymentsBoard() {
    router.push({ name: "payments-board" });
  }

  function openRenewalsBoard() {
    router.push({ name: "renewals-board" });
  }

  function openOfferWorkbench() {
    router.push({ name: "offer-board" });
  }

  function openConvertInOfferBoard() {
    if (!props.name || !isOfferConvertible.value) return;
    router.push({ name: "offer-board", query: { view: "list", convert_offer: props.name } });
  }

  function fmtMoney(value, currency = "TRY") {
    return formatMoney(resolvedLocaleCode.value, value, currency);
  }
  function fmtDate(value) {
    return formatDate(resolvedLocaleCode.value, value);
  }
  function fmtDateTime(value) {
    return formatDateTime(resolvedLocaleCode.value, value);
  }
  function relatedOfferMeta(item) {
    return [item?.status || null, fmtMoney(item?.gross_premium, item?.currency || "TRY")].filter(Boolean).join(" / ");
  }
  function relatedPolicyMeta(item) {
    return [item?.status || null, fmtMoney(item?.gross_premium, item?.currency || "TRY")].filter(Boolean).join(" / ");
  }
  function offerPaymentMeta(item) {
    return [item?.payment_direction || null, item?.status || null, fmtMoney(item?.amount_try, "TRY")].filter(Boolean).join(" / ");
  }
  function offerRenewalMeta(item) {
    return [item?.status || null, item?.renewal_date ? fmtDate(item.renewal_date) : null, item?.assigned_to || null]
      .filter(Boolean)
      .join(" / ");
  }
  function notificationPreviewMeta(item) {
    return [item?.reference_doctype || null, item?.modified ? fmtDateTime(item.modified) : null].filter(Boolean).join(" / ");
  }
  function mapOfferActivityEvent(event) {
    if (!event || typeof event !== "object") return null;
    const type = String(event.event_type || "").trim();
    if (!type) return null;
    if (type === "access") {
      const action = String(event.action || "View");
      const actionLabel = action === "Edit" ? t("accessEdit") : action === "Export" ? t("accessExport") : t("accessView");
      return {
        key: event.key || `access-${event.at}-${event.actor}`,
        title: actionLabel,
        description: fmtDateTime(event.at),
        meta: [event.actor || null, event.meta || null].filter(Boolean).join(" / "),
      };
    }
    const titleMap = {
      created: t("timelineCreated"),
      modified: t("timelineUpdated"),
      offer_date: t("timelineOffered"),
      valid_until: t("timelineValidUntil"),
      converted_policy: t("timelineConverted"),
    };
    return {
      key: event.key || `${type}-${event.at || ""}`,
      title: titleMap[type] || type,
      description: event.reference_name || fmtDateTime(event.at),
      meta: [event.actor || null, event.at ? fmtDateTime(event.at) : null].filter(Boolean).join(" / "),
    };
  }
  function mapOfferStatusTone(status) {
    return sharedOfferStatusTone(status);
  }

  watch(
    () => props.name,
    () => {
      loadOffer();
    },
    { immediate: true }
  );

  return {
    offerResource,
    offerDetailPayloadResource,
    relatedOffersResource,
    relatedPoliciesResource,
    offer,
    loading,
    loadErrorText,
    localeCode: resolvedLocaleCode,
    offerDetailPayload,
    relatedOffers,
    relatedPolicies,
    relatedRecordsCount,
    offerNotificationDrafts,
    offerNotificationOutbox,
    offerPayments,
    offerRenewals,
    opsPreviewCount,
    isOfferConvertible,
    uiOfferStatus,
    offerHeaderSubtitle,
    payloadSourceLead,
    payloadLinkedPolicy,
    heroCells,
    coverages,
    documents,
    activities,
    offerFields,
    recordFields,
    loadRelatedRecords,
    loadOffer,
    openOfferDesk,
    goBack,
    downloadPDF,
    sendEmail,
    convertToPolicy,
    editOffer,
    openCustomer360,
    viewCustomer,
    initials,
    openDocument,
    openPolicyDetail,
    openCommunicationCenterForOffer,
    openOfferDetail,
    openPaymentsBoard,
    openRenewalsBoard,
    openOfferWorkbench,
    openConvertInOfferBoard,
    fmtMoney,
    fmtDate,
    fmtDateTime,
    relatedOfferMeta,
    relatedPolicyMeta,
    offerPaymentMeta,
    offerRenewalMeta,
    notificationPreviewMeta,
    mapOfferStatusTone,
    mapOfferActivityEvent,
  };
}
