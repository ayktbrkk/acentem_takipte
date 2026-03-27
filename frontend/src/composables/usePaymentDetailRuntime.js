import { computed, ref, unref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { formatDate, formatMoney } from "../utils/detailFormatters";

export function usePaymentDetailRuntime({ name, activeLocale }) {
  const router = useRouter();
  const paymentName = computed(() => String(unref(name) || "").trim());
  const localeCode = computed(() => (String(unref(activeLocale) || "en") === "tr" ? "tr-TR" : "en-US"));

  const copy = {
    tr: {
      breadcrumb: "Operasyonlar / Ödemeler",
      back: "Listeye Dön",
      collectPayment: "Tahsilat Kaydet",
      addReceipt: "Dekont Ekle",
      sendReminder: "Hatırlatma Gönder",
      paymentInfo: "Ödeme Bilgileri",
      financialSummary: "Finansal Özet",
      paymentPlan: "Ödeme Planı",
      documents: "Dekont / Fatura",
      timeline: "Zaman Çizgisi",
      customer: "Müşteri",
      linkedRecords: "Bağlı Kayıtlar",
      recordMeta: "Kayıt Meta",
      noInstallments: "Taksit kaydı bulunamadı.",
      noDocuments: "Dekont veya fatura yüklenmemiş.",
      updated: "Güncellendi",
      created: "Oluşturuldu",
      paymentNo: "Ödeme No",
      policy: "Poliçe",
      claim: "Hasar",
      officeBranch: "Şube",
      salesEntity: "Satış Birimi",
      direction: "Yön",
      purpose: "Amaç",
      status: "Durum",
      paymentDate: "Ödeme Tarihi",
      dueDate: "Vade Tarihi",
      referenceNo: "Referans No",
      notes: "Notlar",
      amount: "Tutar",
      amountTry: "TRY Tutar",
      paidAmount: "Tahsil Edilen",
      remainingAmount: "Kalan",
      currency: "Para Birimi",
      fxRate: "Kur",
      fxDate: "Kur Tarihi",
      installmentCount: "Taksit Sayısı",
      installmentIntervalDays: "Taksit Aralığı",
      installmentNo: "Taksit",
      paidOn: "Tahsilat Tarihi",
      owner: "Oluşturan",
      modifiedBy: "Güncelleyen",
      openCustomer: "Müşteri kaydını aç",
      openPolicy: "Poliçeyi Aç",
      openClaim: "Hasar kaydını aç",
    },
    en: {
      breadcrumb: "Operations / Payments",
      back: "Back to list",
      collectPayment: "Record Collection",
      addReceipt: "Add Receipt",
      sendReminder: "Send Reminder",
      paymentInfo: "Payment Info",
      financialSummary: "Financial Summary",
      paymentPlan: "Payment Plan",
      documents: "Receipt / Invoice",
      timeline: "Timeline",
      customer: "Customer",
      linkedRecords: "Linked Records",
      recordMeta: "Record Meta",
      noInstallments: "No installment records found.",
      noDocuments: "No receipt or invoice uploaded.",
      updated: "Updated",
      created: "Created",
      paymentNo: "Payment No",
      policy: "Policy",
      claim: "Claim",
      officeBranch: "Branch",
      salesEntity: "Sales Entity",
      direction: "Direction",
      purpose: "Purpose",
      status: "Status",
      paymentDate: "Payment Date",
      dueDate: "Due Date",
      referenceNo: "Reference No",
      notes: "Notes",
      amount: "Amount",
      amountTry: "TRY Amount",
      paidAmount: "Collected",
      remainingAmount: "Remaining",
      currency: "Currency",
      fxRate: "FX Rate",
      fxDate: "FX Date",
      installmentCount: "Installments",
      installmentIntervalDays: "Installment Interval",
      installmentNo: "Installment",
      paidOn: "Collected On",
      owner: "Owner",
      modifiedBy: "Modified By",
      openCustomer: "Open customer record",
      openPolicy: "Open Policy",
      openClaim: "Open claim record",
    },
  };

  const t = (key) => copy.tr[key] || copy.en[key] || key;

  const paymentResource = createResource({ url: "frappe.client.get", auto: false });
  const installmentResource = createResource({ url: "frappe.client.get_list", auto: false });
  const documentResource = createResource({ url: "frappe.client.get_list", auto: false });

  const payment = computed(() => unref(paymentResource.data) || {});
  const installments = computed(() => (Array.isArray(unref(installmentResource.data)) ? unref(installmentResource.data) : []));
  const documents = computed(() => (Array.isArray(unref(documentResource.data)) ? unref(documentResource.data) : []));

  const amountValue = computed(() => Number(payment.value.amount_try ?? payment.value.amount ?? 0));
  const paidAmount = computed(() =>
    installments.value
      .filter((row) => String(row.status || "").toLowerCase() === "paid")
      .reduce((sum, row) => sum + Number(row.amount_try ?? row.amount ?? 0), 0)
  );
  const remainingAmount = computed(() => Math.max(amountValue.value - paidAmount.value, 0));

  const isOverdue = computed(() => {
    const due = parseDateOnly(payment.value.due_date);
    return Boolean(due && due.getTime() < Date.now() && remainingAmount.value > 0);
  });

  const paymentStatus = computed(() => {
    const raw = String(payment.value.status || "").trim();
    if (raw) return raw;
    if (remainingAmount.value <= 0) return "Paid";
    return isOverdue.value ? "Overdue" : "Draft";
  });

  const heroCells = computed(() => [
    { label: t("paymentNo"), value: payment.value.payment_no || payment.value.name || "-", variant: "default" },
    { label: t("dueDate"), value: formatDate(localeCode.value, payment.value.due_date || payment.value.payment_date), variant: "default" },
    { label: t("amount"), value: formatMoney(localeCode.value, amountValue.value, payment.value.currency), variant: "lg" },
    { label: t("status"), value: paymentStatus.value, variant: "accent" },
  ]);

  const paymentFields = computed(() => [
    { label: t("paymentNo"), value: payment.value.payment_no || payment.value.name || "-" },
    { label: t("policy"), value: payment.value.policy || "-" },
    { label: t("claim"), value: payment.value.claim || "-" },
    { label: t("officeBranch"), value: payment.value.office_branch || "-" },
    { label: t("salesEntity"), value: payment.value.sales_entity || "-" },
    { label: t("direction"), value: payment.value.payment_direction || "-" },
    { label: t("purpose"), value: payment.value.payment_purpose || "-" },
    { label: t("referenceNo"), value: payment.value.reference_no || "-" },
    { label: t("notes"), value: payment.value.notes || "-", span: 2 },
  ]);

  const financialFields = computed(() => [
    { label: t("amount"), value: formatMoney(localeCode.value, payment.value.amount, payment.value.currency), variant: "lg" },
    { label: t("amountTry"), value: formatMoney(localeCode.value, payment.value.amount_try ?? payment.value.amount, "TRY"), variant: "lg" },
    { label: t("paidAmount"), value: formatMoney(localeCode.value, paidAmount.value, "TRY") },
    { label: t("remainingAmount"), value: formatMoney(localeCode.value, remainingAmount.value, "TRY") },
    { label: t("currency"), value: payment.value.currency || "-" },
    { label: t("fxRate"), value: payment.value.fx_rate ? String(payment.value.fx_rate) : "-" },
    { label: t("fxDate"), value: formatDate(localeCode.value, payment.value.fx_date) },
    { label: t("installmentCount"), value: String(payment.value.installment_count ?? installments.value.length ?? "-") },
    { label: t("installmentIntervalDays"), value: payment.value.installment_interval_days ? `${payment.value.installment_interval_days} gün` : "-" },
    { label: t("paymentDate"), value: formatDate(localeCode.value, payment.value.payment_date) },
    { label: t("dueDate"), value: formatDate(localeCode.value, payment.value.due_date) },
    { label: t("status"), value: paymentStatus.value },
  ]);

  const linkedFields = computed(() => [
    { label: t("customer"), value: payment.value.customer || "-" },
    { label: t("policy"), value: payment.value.policy || "-" },
    { label: t("claim"), value: payment.value.claim || "-" },
  ]);

  const recordFields = computed(() => [
    { label: t("owner"), value: payment.value.owner || "-" },
    { label: t("modifiedBy"), value: payment.value.modified_by || "-" },
    { label: t("updated"), value: formatDate(localeCode.value, payment.value.modified) },
    { label: t("created"), value: formatDate(localeCode.value, payment.value.creation) },
  ]);

  function installmentLabel(row) {
    const installmentNo = row?.installment_no ?? "-";
    const installmentCount = row?.installment_count ?? installments.value.length ?? "-";
    return `${installmentNo}/${installmentCount}`;
  }

  function parseDateOnly(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function backToList() {
    router.push("/payments");
  }

  function collectPayment() {
    router.push({
      name: "reconciliation-workbench",
      query: {
        payment: payment.value.name || paymentName.value,
        mode: "collect",
      },
    });
  }

  function addReceipt() {
    router.push({
      name: "communication-center",
      query: {
        payment: payment.value.name || paymentName.value,
        mode: "receipt",
      },
    });
  }

  function sendReminder() {
    router.push({
      name: "communication-center",
      query: {
        payment: payment.value.name || paymentName.value,
        mode: "reminder",
      },
    });
  }

  function openCustomer() {
    if (!payment.value.customer) return;
    router.push({ name: "customer-detail", params: { name: payment.value.customer } });
  }

  function openPolicy() {
    if (!payment.value.policy) return;
    router.push({ name: "policy-detail", params: { name: payment.value.policy } });
  }

  function openClaim() {
    if (!payment.value.claim) return;
    router.push({ name: "claim-detail", params: { name: payment.value.claim } });
  }

  function formatCurrency(value, currency = "TRY") {
    return formatMoney(localeCode.value, value, currency);
  }

  function reload() {
    paymentResource.params = {
      doctype: "AT Payment",
      name: paymentName.value,
    };
    paymentResource.reload();

    installmentResource.params = {
      doctype: "AT Payment Installment",
      fields: ["name", "installment_no", "installment_count", "status", "due_date", "paid_on", "amount", "amount_try"],
      filters: { payment: paymentName.value },
      order_by: "due_date asc",
      limit_page_length: 200,
    };
    installmentResource.reload();

    documentResource.params = {
      doctype: "File",
      fields: ["name", "file_name", "creation"],
      filters: { attached_to_doctype: "AT Payment", attached_to_name: paymentName.value },
      order_by: "creation desc",
      limit_page_length: 50,
    };
    documentResource.reload();
  }

  watch(paymentName, () => reload(), { immediate: true });

  return {
    t,
    payment,
    installments,
    documents,
    amountValue,
    paidAmount,
    remainingAmount,
    paymentStatus,
    heroCells,
    paymentFields,
    financialFields,
    linkedFields,
    recordFields,
    installmentLabel,
    formatDate: (value) => formatDate(localeCode.value, value),
    formatCurrency,
    backToList,
    collectPayment,
    addReceipt,
    sendReminder,
    openCustomer,
    openPolicy,
    openClaim,
  };
}
