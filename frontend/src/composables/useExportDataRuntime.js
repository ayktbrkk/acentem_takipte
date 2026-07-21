import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useAtFormatting } from "./useAtFormatting";
import {
  buildClaimsListTableColumns,
  mapClaimRecordToTableRow,
} from "./claimsListTableModel";
import {
  buildCustomerListTableColumns,
  mapCustomerRecordToTableRow,
} from "./customerListTableModel";
import {
  buildOfferListTableColumns,
  mapOfferRecordToTableRow,
} from "./offerListTableModel";
import {
  buildPaymentsListTableColumns,
  mapPaymentRecordToTableRow,
} from "./paymentsListTableModel";
import { buildPolicyListTableColumns, mapPolicyRecordToTableRow } from "./policyListTableModel";
import {
  buildRenewalsListTableColumns,
  mapRenewalRecordToTableRow,
} from "./renewalsListTableModel";

const LIST_PREVIEW_SCREENS = new Set([
  "policy_list",
  "dashboard",
  "customer_list",
  "offer_list",
  "claims_board",
  "payments_board",
  "renewals_board",
]);

const PREVIEW_FIELD_SETS = {
  offer_list: [
    "name",
    "customer",
    "customer.full_name as customer_full_name",
    "customer.customer_type as customer_customer_type",
    "customer.masked_tax_id as customer_masked_tax_id",
    "insurance_company",
    "branch",
    "status",
    "currency",
    "offer_date",
    "valid_until",
    "gross_premium",
    "commission_amount",
  ],
  claims_board: [
    "name",
    "claim_no",
    "policy",
    "policy.policy_no as policy_no",
    "customer",
    "customer.full_name as customer_full_name",
    "claim_status",
    "claim_type",
    "policy.branch as branch",
    "incident_date",
    "estimated_amount",
    "paid_amount",
  ],
  payments_board: [
    "name",
    "payment_no",
    "status",
    "amount",
    "amount_try",
    "due_date",
    "payment_date",
    "customer",
    "customer.full_name as customer_full_name",
    "customer.customer_type as customer_customer_type",
    "customer.masked_tax_id as customer_masked_tax_id",
    "policy",
    "policy.policy_no as policy_no",
  ],
  renewals_board: [
    "name",
    "policy",
    "policy.policy_no as policy_policy_no",
    "customer",
    "customer.full_name as customer_full_name",
    "status",
    "due_date",
    "renewal_date",
  ],
};

const POLICY_PREVIEW_FIELDS = [
  "name as record_name",
  "name",
  "policy_no",
  "customer",
  "customer.full_name as customer_full_name",
  "customer.customer_type as customer_customer_type",
  "customer.masked_tax_id as customer_masked_tax_id",
  "insurance_company",
  "branch",
  "status",
  "currency",
  "issue_date",
  "end_date",
  "gross_premium",
  "commission_amount",
];

function getPreviewDateField(screen) {
  if (screen === "offer_list") return "offer_date";
  if (screen === "claims_board") return "incident_date";
  if (screen === "payments_board" || screen === "renewals_board") return "due_date";
  return "end_date";
}

function getPreviewStatusField(screen) {
  if (screen === "claims_board") return "claim_status";
  return "status";
}

function getPreviewDoctype(screen) {
  const map = {
    offer_list: "AT Offer",
    claims_board: "AT Claim",
    payments_board: "AT Payment",
    renewals_board: "AT Renewal Task",
  };
  return map[screen] || "AT Policy";
}

export function useExportDataRuntime({ t, router, authStore, branchStore }) {
  const activeLocale = computed(() => unref(authStore.locale) || "tr");

  const screenOptions = [
    { value: "dashboard", labelKey: "screenDashboard" },
    { value: "policy_list", labelKey: "screenPolicies" },
    { value: "offer_list", labelKey: "screenOffers" },
    { value: "customer_list", labelKey: "screenCustomers" },
    { value: "claims_board", labelKey: "screenClaims" },
    { value: "payments_board", labelKey: "screenPayments" },
    { value: "renewals_board", labelKey: "screenRenewals" },
  ];

  const localizedScreenOptions = computed(() =>
    screenOptions.map((option) => ({
      value: option.value,
      label: t(option.labelKey),
    })),
  );

  const form = reactive({
    screen: "policy_list",
    format: "xlsx",
    filename: "",
    startDate: "",
    endDate: "",
    status: "",
  });

  const message = ref("");
  const historyRows = ref([]);
  const exportLoading = ref(false);
  const listPreviewLoading = ref(false);
  const listPreviewError = ref("");
  const listPreviewRows = ref([]);

  const listPreviewResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
  });

  const customerPreviewResource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.reports.api.dashboard.get_customer_workbench_rows",
    auto: false,
  });

  const { formatDate, formatCurrency } = useAtFormatting(
    computed(() => (String(unref(activeLocale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en")),
  );

  const showListPreview = computed(() => LIST_PREVIEW_SCREENS.has(form.screen));

  const listPreviewColumns = computed(() => {
    if (form.screen === "customer_list") return buildCustomerListTableColumns(t);
    if (form.screen === "offer_list") return buildOfferListTableColumns(t);
    if (form.screen === "claims_board") return buildClaimsListTableColumns(t);
    if (form.screen === "payments_board") return buildPaymentsListTableColumns(t);
    if (form.screen === "renewals_board") return buildRenewalsListTableColumns(t);
    return buildPolicyListTableColumns(t);
  });

  const listPreviewTableRows = computed(() => {
    const locale = unref(activeLocale);

    if (form.screen === "customer_list") {
      return listPreviewRows.value.map((row) => mapCustomerRecordToTableRow(row, { t, localeCode: locale }));
    }
    if (form.screen === "offer_list") {
      return listPreviewRows.value.map((row) =>
        mapOfferRecordToTableRow(row, {
          formatDate,
          formatCurrency,
          localeCode: locale,
          t,
        }),
      );
    }
    if (form.screen === "claims_board") {
      return listPreviewRows.value.map((row) =>
        mapClaimRecordToTableRow(row, {
          formatDate,
          formatCurrency,
          localeCode: locale,
          t,
        }),
      );
    }
    if (form.screen === "payments_board") {
      return listPreviewRows.value.map((row) =>
        mapPaymentRecordToTableRow(row, {
          localeCode: locale,
          t,
        }),
      );
    }
    if (form.screen === "renewals_board") {
      return listPreviewRows.value.map((row) =>
        mapRenewalRecordToTableRow(row, {
          formatDate,
          localeCode: locale,
          t,
        }),
      );
    }
    return listPreviewRows.value.map((row) =>
      mapPolicyRecordToTableRow(row, {
        formatDate,
        formatCurrency,
        t,
      }),
    );
  });

  function buildListPreviewFilters() {
    const filters = {};

    if (form.screen === "customer_list") {
      return filters;
    }

    const statusField = getPreviewStatusField(form.screen);
    if (form.status) {
      filters[statusField] = form.status;
    }

    const dateField = getPreviewDateField(form.screen);
    if (form.startDate && form.endDate) {
      filters[dateField] = ["between", [form.startDate, form.endDate]];
    } else if (form.startDate) {
      filters[dateField] = [">=", form.startDate];
    } else if (form.endDate) {
      filters[dateField] = ["<=", form.endDate];
    }

    const officeBranch = branchStore?.requestBranch || "";
    if (officeBranch) filters.office_branch = officeBranch;
    return filters;
  }

  async function refreshListPreview() {
    if (!showListPreview.value) {
      listPreviewRows.value = [];
      return;
    }

    listPreviewLoading.value = true;
    listPreviewError.value = "";
    try {
      if (form.screen === "customer_list") {
        const payload = await customerPreviewResource.reload({
          filters: JSON.stringify({
            consent_status: form.status || "",
            office_branch: branchStore?.requestBranch || "",
          }),
          page: 1,
          page_length: 10,
        });
        listPreviewRows.value = payload?.rows || [];
        return;
      }

      const doctype = getPreviewDoctype(form.screen);
      const fields = PREVIEW_FIELD_SETS[form.screen] || POLICY_PREVIEW_FIELDS;
      const orderBy =
        form.screen === "renewals_board"
          ? "`tabAT Renewal Task`.due_date asc, `tabAT Renewal Task`.modified desc"
          : `\`tab${doctype}\`.modified desc`;

      const rows = await listPreviewResource.submit({
        doctype,
        fields,
        filters: buildListPreviewFilters(),
        order_by: orderBy,
        limit_start: 0,
        limit_page_length: 10,
      });
      listPreviewRows.value = Array.isArray(rows) ? rows : [];
    } catch (error) {
      listPreviewRows.value = [];
      listPreviewError.value =
        error?.messages?.join(" ") || error?.message || t("previewLoadError");
    } finally {
      listPreviewLoading.value = false;
    }
  }

  watch(
    () => [form.screen, form.startDate, form.endDate, form.status, branchStore?.requestBranch],
    () => {
      void refreshListPreview();
    },
    { immediate: true },
  );

  function buildExportUrl() {
    const params = new URLSearchParams({
      screen: form.screen,
      export_format: ["pdf", "csv"].includes(String(form.format || "xlsx").trim().toLowerCase())
        ? String(form.format).trim().toLowerCase()
        : "xlsx",
      limit: "5000",
    });

    if (form.filename) params.set("filename", form.filename);
    if (form.startDate) params.set("start_date", form.startDate);
    if (form.endDate) params.set("end_date", form.endDate);
    if (form.status) params.set("status", form.status);

    return `/api/method/acentem_takipte.acentem_takipte.platform.import_export.list_exports_api.download_export?${params.toString()}`;
  }

  function addHistory() {
    const screenLabel = localizedScreenOptions.value.find((option) => option.value === form.screen)?.label || t("screenNoLabel");
    const filename = form.filename || `${form.screen}_${new Date().toISOString().slice(0, 10)}`;
    historyRows.value = [
      {
        id: `${Date.now()}`,
        date: new Intl.DateTimeFormat(activeLocale.value === "tr" ? "tr-TR" : "en-US", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date()),
        screenLabel,
        format: form.format,
        filename,
      },
      ...historyRows.value,
    ].slice(0, 8);
  }

  function downloadExport() {
    if (exportLoading.value) return;
    exportLoading.value = true;
    const url = buildExportUrl();
    window.open(url, "_blank", "noopener,noreferrer");
    addHistory();
    message.value = t("exportStarted");
    window.setTimeout(() => {
      exportLoading.value = false;
    }, 800);
  }

  function resetForm() {
    form.screen = "policy_list";
    form.format = "xlsx";
    form.filename = "";
    form.startDate = "";
    form.endDate = "";
    form.status = "";
    message.value = "";
  }

  function cancel() {
    router.push({ name: "dashboard" });
  }

  return {
    activeLocale,
    screenOptions,
    localizedScreenOptions,
    form,
    message,
    historyRows,
    showListPreview,
    listPreviewColumns,
    listPreviewTableRows,
    listPreviewLoading,
    listPreviewError,
    exportLoading,
    buildExportUrl,
    addHistory,
    downloadExport,
    resetForm,
    cancel,
    refreshListPreview,
  };
}
