import { computed, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function useCustomerBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  const UNKNOWN_VALUE_SET = new Set(["", "unknown", "none", "null", "undefined"]);

  function t(key) {
    return translateText(key, activeLocale);
  }

  function fallbackLabel() {
    return t("unspecified");
  }

  function normalizeValue(value) {
    const normalized = String(value ?? "").trim();
    return UNKNOWN_VALUE_SET.has(normalized.toLowerCase()) ? "" : normalized;
  }

  function firstPresentValue(...values) {
    for (const value of values) {
      const normalized = normalizeValue(value);
      if (normalized) {
        return normalized;
      }
    }
    return "";
  }

  function normalizeGender(value) {
    const normalized = normalizeValue(value);
    if (normalized === "Male") return t("genderMale");
    if (normalized === "Female") return t("genderFemale");
    if (normalized === "Other") return t("genderOther");
    return fallbackLabel();
  }

  function normalizeMaritalStatus(value) {
    const normalized = normalizeValue(value);
    if (normalized === "Single") return t("maritalSingle");
    if (normalized === "Married") return t("maritalMarried");
    if (normalized === "Divorced") return t("maritalDivorced");
    if (normalized === "Widowed") return t("maritalWidowed");
    return fallbackLabel();
  }

  const filters = reactive({
    query: "",
    consent_status: "",
    gender: "",
    office_branch: "",
    sort: "modified desc",
  });

  const pagination = reactive({
    page: 1,
    pageLength: 20,
  });

  const customerResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_customer_workbench_rows",
    auto: false,
  });

  const summary = computed(() => {
    unref(activeLocale);
    const data = unref(customerResource.data) || {};
    return {
      total: data.total || 0,
      active: data.active_count || 0,
      individual: data.individual_count || 0,
      corporate: data.corporate_count || 0,
    };
  });

  const rows = computed(() => {
    unref(activeLocale);
    const data = unref(customerResource.data) || {};
    return (data.rows || []).map(row => {
      const maritalStatus = firstPresentValue(row.marital_status);

      return {
        ...row,
        identity_primary: row.full_name || fallbackLabel(),
        identity_secondary: `${row.name || fallbackLabel()} | ${row.customer_type === "Corporate" ? t("corporate") : t("individual")} | ${row.tax_id || fallbackLabel()}`,
        contact_primary: row.phone || fallbackLabel(),
        contact_secondary: row.email || fallbackLabel(),
        personal_primary: maritalStatus
          ? normalizeMaritalStatus(maritalStatus)
          : firstPresentValue(row.occupation, row.job_title) || fallbackLabel(),
        personal_secondary: `${normalizeGender(row.gender)} | ${firstPresentValue(row.birth_date) || fallbackLabel()}`,
        mgmt_primary: firstPresentValue(row.assigned_agent, row.sales_entity, row.segment, row.owner) || fallbackLabel(),
        mgmt_secondary: t(`status_${String(row.consent_status || "Unknown").toLowerCase()}`),
        customer_type_label: row.customer_type === "Corporate" ? t("corporate") : t("individual"),
        consent_status_label: t(`status_${String(row.consent_status || "Unknown").toLowerCase()}`),
      };
    });
  });

  const loading = computed(() => unref(customerResource.loading));

  async function reload() {
    const payload = await customerResource.reload({
      filters: JSON.stringify(filters),
      page: pagination.page,
      page_length: pagination.pageLength,
    });
    if (payload !== undefined && typeof customerResource.setData === "function") {
      customerResource.setData(payload);
    }
  }

  function setPage(p) {
    pagination.page = p;
    reload();
  }

  function updateFilter(key, value) {
    filters[key] = value;
    pagination.page = 1;
    reload();
  }

  function openCustomer(name) {
    router.push({ name: "customer-detail", params: { name } });
  }

  // Initial load
  reload();

  return {
    filters,
    pagination,
    summary,
    rows,
    loading,
    t,
    reload,
    setPage,
    updateFilter,
    openCustomer,
  };
}

