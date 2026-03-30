import { computed, getCurrentInstance, ref, unref, watch, onBeforeUnmount } from "vue";
import { createResource } from "frappe-ui";

import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { buildOfficeBranchOptions } from "../utils/officeBranchTree";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resourceValue(resource, fallback) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

export function useAuxRecordDetailQuickDialogs({
  props,
  config,
  activeLocale,
  authStore,
  branchStore,
  activeDoctype,
  doc,
  reloadDetail,
  localize,
  t,
}) {
  const showQuickEditDialog = ref(false);
  const quickEditConfig = computed(() => config.quickEdit || null);
  const quickEditEyebrow = computed(() => localize(quickEditConfig.value?.label) || t("quickEdit"));
  const canUseQuickEdit = computed(() => {
    const registryKey = quickEditConfig.value?.registryKey;
    if (!registryKey) return false;
    return authStore.can(["quickEdit", registryKey]);
  });

  const copiedRecordKey = ref("");
  let copiedRecordTimer = null;

  const auxQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: {},
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });
  const auxQuickPolicyResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: {},
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });
  const auxQuickInsuranceCompanyResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Insurance Company",
      fields: ["name", "company_name", "company_code"],
      order_by: "company_name asc",
      limit_page_length: 500,
    },
  });
  const auxQuickSalesEntityResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Sales Entity",
      fields: ["name", "full_name", "entity_type"],
      order_by: "full_name asc",
      limit_page_length: 500,
    },
  });
  const auxQuickAccountingEntryResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Accounting Entry",
      fields: ["name", "source_doctype", "source_name", "status"],
      filters: {},
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const quickEditOptionsMap = computed(() => ({
    customers: asArray(resourceValue(auxQuickCustomerResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
    policies: asArray(resourceValue(auxQuickPolicyResource, [])).map((row) => ({ value: row.name, label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}` })),
    insuranceCompanies: asArray(resourceValue(auxQuickInsuranceCompanyResource, [])).map((row) => ({ value: row.name, label: `${row.company_name || row.name}${row.company_code ? ` (${row.company_code})` : ""}` })),
    salesEntities: asArray(resourceValue(auxQuickSalesEntityResource, [])).map((row) => ({ value: row.name, label: `${row.full_name || row.name}${row.entity_type ? ` (${row.entity_type})` : ""}` })),
    officeBranches: buildOfficeBranchOptions(asArray(branchStore.items), { locale: activeLocale.value }).map((row) => ({ value: row.value, label: row.label })),
    accountingEntries: asArray(resourceValue(auxQuickAccountingEntryResource, [])).map((row) => ({ value: row.name, label: `${row.name}${row.source_doctype ? ` (${row.source_doctype})` : ""}` })),
  }));

  function buildOfficeBranchLookupFilters(doctype) {
    const selected = unref(branchStore.selected);
    const officeBranch = String(selected?.officeBranch || selected?.office_branch || "").trim();
    if (!officeBranch) return {};
    if (doctype === "AT Customer") return { office_branch: officeBranch };
    if (doctype === "AT Policy") return { office_branch: officeBranch };
    if (doctype === "AT Accounting Entry") return { office_branch: officeBranch };
    return { office_branch: officeBranch };
  }

  function quickEditRegistryCfg() {
    return quickEditConfig.value?.registryKey ? getQuickCreateConfig(quickEditConfig.value.registryKey) : null;
  }

  async function copyRecordValue(value, key) {
    const text = String(value || "").trim();
    if (!text) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      copiedRecordKey.value = key;
      if (copiedRecordTimer) clearTimeout(copiedRecordTimer);
      copiedRecordTimer = window.setTimeout(() => {
        copiedRecordKey.value = "";
        copiedRecordTimer = null;
      }, 1500);
    } catch {
      copiedRecordKey.value = "";
    }
  }

  async function ensureQuickEditOptionSources() {
    const registryKey = quickEditConfig.value?.registryKey;
    if (!registryKey) return;

    auxQuickCustomerResource.params = {
      ...auxQuickCustomerResource.params,
      filters: buildOfficeBranchLookupFilters("AT Customer"),
    };
    auxQuickPolicyResource.params = {
      ...auxQuickPolicyResource.params,
      filters: buildOfficeBranchLookupFilters("AT Policy"),
    };
    auxQuickAccountingEntryResource.params = {
      ...auxQuickAccountingEntryResource.params,
      filters: buildOfficeBranchLookupFilters("AT Accounting Entry"),
    };

    if (["accounting_entry_edit", "reconciliation_item_edit"].includes(registryKey)) {
      await auxQuickAccountingEntryResource.reload().catch(() => {});
    }
    if (["accounting_entry_edit"].includes(registryKey)) {
      await Promise.allSettled([
        auxQuickCustomerResource.reload(),
        auxQuickPolicyResource.reload(),
        auxQuickInsuranceCompanyResource.reload(),
        auxQuickSalesEntityResource.reload(),
      ]);
    }
    if (["branch_master_edit"].includes(registryKey)) {
      await auxQuickInsuranceCompanyResource.reload().catch(() => {});
    }
    if (["sales_entity_master_edit"].includes(registryKey)) {
      await auxQuickSalesEntityResource.reload().catch(() => {});
    }
  }

  function normalizeQuickEditFormValue(field, value) {
    if (field?.type === "checkbox") return value === true || String(value) === "1";
    if (value == null) return "";
    return value;
  }

  async function prepareQuickEditDialog({ form, resetForm }) {
    await ensureQuickEditOptionSources();
    const reg = quickEditRegistryCfg();
    const current = unref(doc) || {};
    const overrides = {};
    for (const field of reg?.fields || []) {
      overrides[field.name] = normalizeQuickEditFormValue(field, current[field.name]);
    }
    resetForm(overrides);
  }

  async function buildQuickEditPayload({ form }) {
    const reg = quickEditRegistryCfg();
    const data = {};
    for (const field of reg?.fields || []) {
      let value = form[field.name];
      if (field.type === "number") {
        value = value === "" || value == null ? null : Number(value);
      } else if (field.type === "checkbox") {
        value = Boolean(value);
      } else if (typeof value === "string") {
        value = value.trim();
        if (!value) value = null;
      }
      data[field.name] = value;
    }
    return { doctype: unref(activeDoctype), name: props.name, data };
  }

  async function afterQuickEditSubmit() {
    await reloadDetail();
  }

  const quickEditSuccessHandlers = {
    aux_detail: async () => {
      await reloadDetail();
    },
  };

  function copyLifecycleCleanup() {
    if (copiedRecordTimer) clearTimeout(copiedRecordTimer);
  }

  watch(
    () => branchStore.selected,
    () => {
      if (!showQuickEditDialog.value) return;
      void ensureQuickEditOptionSources();
    }
  );

  if (getCurrentInstance()) {
    onBeforeUnmount(copyLifecycleCleanup);
  }

  return {
    showQuickEditDialog,
    quickEditConfig,
    quickEditEyebrow,
    canUseQuickEdit,
    copiedRecordKey,
    copyRecordValue,
    auxQuickCustomerResource,
    auxQuickPolicyResource,
    auxQuickInsuranceCompanyResource,
    auxQuickSalesEntityResource,
    auxQuickAccountingEntryResource,
    quickEditOptionsMap,
    quickEditSuccessHandlers,
    prepareQuickEditDialog,
    buildQuickEditPayload,
    afterQuickEditSubmit,
  };
}
