import { computed, onBeforeUnmount, ref, unref, watch, onMounted } from "vue";
import { createResource } from "frappe-ui";

import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import { navigateToSameOriginPath } from "../utils/safeNavigation";
import { buildOfficeBranchOptions } from "../utils/officeBranchTree";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resourceValue(resource, fallback) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function humanizeField(field) {
  return String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function useAuxRecordDetailRuntime({ props, config, activeLocale, localeCode, authStore, branchStore, route, router, localize, t }) {
  const resource = createResource({ url: "frappe.client.get", auto: false });
  const resolvedDoctype = ref(config.doctype);
  const activeDoctype = computed(() => resolvedDoctype.value || config.doctype);
  const activeResource = computed(() => resource);
  const activeLoading = computed(() => Boolean(unref(activeResource.value?.loading)));
  const doc = computed(() => {
    const payload = unref(resource.data);
    return payload?.docs?.[0] || payload?.message || payload || null;
  });
  const errorText = computed(() => {
    const current = activeResource.value;
    const err = unref(current?.error);
    return err?.messages?.[0] || err?.message || "";
  });
  const isEmpty = computed(() => !activeLoading.value && !doc.value && !errorText.value);
  const showQuickEditDialog = ref(false);
  const activeDetailTab = ref("overview");
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
      filters: buildOfficeBranchLookupFilters("AT Customer"),
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
      filters: buildOfficeBranchLookupFilters("AT Policy"),
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
      filters: buildOfficeBranchLookupFilters("AT Accounting Entry"),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });
  const auxMutationResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
    auto: false,
  });
  const campaignDraftsResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Notification Draft",
      fields: ["name", "status", "channel", "recipient", "modified"],
      filters: {},
      order_by: "modified desc",
      limit_page_length: 20,
    },
  });
  const campaignOutboxResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Notification Outbox",
      fields: ["name", "status", "channel", "recipient", "attempt_count", "modified"],
      filters: {},
      order_by: "modified desc",
      limit_page_length: 20,
    },
  });
  const sendDraftNowResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.send_draft_now",
    auto: false,
  });
  const retryOutboxResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.retry_outbox_item",
    auto: false,
  });
  const requeueOutboxResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.requeue_outbox_item",
    auto: false,
  });

  function buildOfficeBranchLookupFilters(doctype) {
    const officeBranch = branchStore.requestBranch;
    if (!officeBranch) return {};
    if (!["AT Customer", "AT Policy", "AT Accounting Entry"].includes(String(doctype || "").trim())) return {};
    return { office_branch: officeBranch };
  }

  function quickEditRegistryCfg() {
    return quickEditConfig.value?.registryKey ? getQuickCreateConfig(quickEditConfig.value.registryKey) : null;
  }

  function getDetailDoctypeCandidates() {
    const baseDoctype = String(config.doctype || "").trim();
    if (!baseDoctype) return [];
    if (props.screenKey !== "tasks") return [baseDoctype];

    const fallbackDoctype = "AT Renewal Task";
    if (/^AT-REN-/i.test(String(props.name || "").trim())) {
      return [fallbackDoctype, baseDoctype].filter((value, index, list) => value && list.indexOf(value) === index);
    }

    return [baseDoctype, fallbackDoctype].filter((value, index, list) => value && list.indexOf(value) === index);
  }

  function isNotFoundError(error) {
    const message = [error?.message, error?.messages?.join?.(" "), error?.exc_type].filter(Boolean).join(" ");
    return error?.httpStatus === 404 || /404|not found|does not exist/i.test(message);
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

  function getQuickEditOptionsMap() {
    return {
      customers: asArray(resourceValue(auxQuickCustomerResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
      policies: asArray(resourceValue(auxQuickPolicyResource, [])).map((row) => ({ value: row.name, label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}` })),
      insuranceCompanies: asArray(resourceValue(auxQuickInsuranceCompanyResource, [])).map((row) => ({ value: row.name, label: `${row.company_name || row.name}${row.company_code ? ` (${row.company_code})` : ""}` })),
      salesEntities: asArray(resourceValue(auxQuickSalesEntityResource, [])).map((row) => ({ value: row.name, label: `${row.full_name || row.name}${row.entity_type ? ` (${row.entity_type})` : ""}` })),
      officeBranches: buildOfficeBranchOptions(asArray(branchStore.items), { locale: activeLocale.value }).map((row) => ({ value: row.value, label: row.label })),
      accountingEntries: asArray(resourceValue(auxQuickAccountingEntryResource, [])).map((row) => ({ value: row.name, label: `${row.name}${row.source_doctype ? ` (${row.source_doctype})` : ""}` })),
    };
  }

  const quickEditOptionsMap = computed(() => getQuickEditOptionsMap());

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
    const current = doc.value || {};
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
    return { doctype: activeDoctype.value, name: props.name, data };
  }

  async function afterQuickEditSubmit() {
    await reloadDetail();
  }

  function reloadDetail() {
    const detailPromise = loadDetailRecord();
    if (config.doctype !== "AT Campaign") return detailPromise;
    campaignDraftsResource.params = {
      ...campaignDraftsResource.params,
      filters: {
        reference_doctype: "AT Campaign",
        reference_name: props.name,
      },
    };
    campaignOutboxResource.params = {
      ...campaignOutboxResource.params,
      filters: {
        reference_doctype: "AT Campaign",
        reference_name: props.name,
      },
    };
    return Promise.allSettled([
      detailPromise,
      campaignDraftsResource.reload(),
      campaignOutboxResource.reload(),
    ]).then(([detailResult]) => detailResult.value);
  }

  async function loadDetailRecord() {
    const candidates = getDetailDoctypeCandidates();
    let lastError = null;

    for (const doctype of candidates) {
      try {
        const result = await resource.reload({ doctype, name: props.name });
        resolvedDoctype.value = doctype;
        return result;
      } catch (error) {
        lastError = error;
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  async function sendDraftLifecycle() {
    if (!canSendDraftLifecycle.value || !doc.value?.name) return;
    await sendDraftNowResource.submit({ draft_name: doc.value.name });
    await reloadDetail();
  }

  async function retryOutboxLifecycle() {
    if (!canRetryOutboxLifecycle.value || !doc.value?.name) return;
    await retryOutboxResource.submit({ outbox_name: doc.value.name });
    await reloadDetail();
  }

  async function requeueOutboxLifecycle() {
    if (!canRequeueOutboxLifecycle.value || !doc.value?.name) return;
    await requeueOutboxResource.submit({ outbox_name: doc.value.name });
    await reloadDetail();
  }

  async function markTaskLifecycle(status) {
    if (!isTaskDetail.value || !doc.value?.name || !String(status || "").trim()) return;
    await auxMutationResource.submit({
      doctype: activeDoctype.value,
      name: doc.value.name,
      data: { status },
    });
    await reloadDetail();
  }

  async function markReminderLifecycle(status) {
    if (!isReminderDetail.value || !doc.value?.name || !String(status || "").trim()) return;
    await auxMutationResource.submit({
      doctype: "AT Reminder",
      name: doc.value.name,
      data: { status },
    });
    await reloadDetail();
  }

  async function markAssignmentLifecycle(status) {
    if (!isOwnershipAssignmentDetail.value || !doc.value?.name || !String(status || "").trim()) return;
    await auxMutationResource.submit({
      doctype: "AT Ownership Assignment",
      name: doc.value.name,
      data: { status },
    });
    await reloadDetail();
  }

  function openCommunicationContext() {
    if (!canOpenCommunicationContext.value || !doc.value?.name) return;
    const referenceLabel = String(doc.value?.[config.titleField] || doc.value?.name || "").trim() || doc.value.name;
    router.push({
      name: "communication-center",
      query: {
        reference_doctype: activeDoctype.value,
        reference_name: doc.value.name,
        reference_label: referenceLabel,
        return_to: route.fullPath || route.path,
      },
    });
  }

  function goBack() {
    router.push({ name: `${config.key}-list` });
  }

  function openDesk() {
    navigateToSameOriginPath(`/app/Form/${encodeURIComponent(activeDoctype.value)}/${encodeURIComponent(props.name)}`);
  }

  const panelConfig = computed(() => {
    if (!config.panelRef) return null;
    const row = doc.value || {};
    if (config.panelRef.mode === "source") {
      return getSourcePanelConfig(row?.[config.panelRef.doctypeField], row?.[config.panelRef.nameField]);
    }
    return getSourcePanelConfig(row?.reference_doctype, row?.reference_name);
  });

  function openPanel() {
    if (!panelConfig.value?.url) return;
    navigateToSameOriginPath(panelConfig.value.url);
  }

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

  onMounted(() => {
    reloadDetail();
  });

  onBeforeUnmount(copyLifecycleCleanup);

  const isDraftDetail = computed(() => activeDoctype.value === "AT Notification Draft");
  const isOutboxDetail = computed(() => activeDoctype.value === "AT Notification Outbox");
  const canOpenCommunicationContext = computed(
    () =>
      [
        "AT Notification Draft",
        "AT Notification Outbox",
        "AT Reminder",
        "AT Task",
        "AT Renewal Task",
        "AT Ownership Assignment",
      ].includes(activeDoctype.value) && Boolean(doc.value?.name)
  );
  const isTaskDetail = computed(() => ["AT Task", "AT Renewal Task"].includes(activeDoctype.value));
  const isReminderDetail = computed(() => activeDoctype.value === "AT Reminder");
  const isOwnershipAssignmentDetail = computed(() => activeDoctype.value === "AT Ownership Assignment");
  const draftLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
  const canSendDraftLifecycle = computed(() => isDraftDetail.value && Boolean(doc.value?.name) && draftLifecycleStatus.value !== "Sent");
  const outboxLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
  const canRetryOutboxLifecycle = computed(() => isOutboxDetail.value && Boolean(doc.value?.name) && ["Failed", "Dead"].includes(outboxLifecycleStatus.value));
  const canRequeueOutboxLifecycle = computed(() => isOutboxDetail.value && Boolean(doc.value?.name) && ["Queued", "Processing", "Failed", "Dead"].includes(outboxLifecycleStatus.value));
  const taskLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
  const reminderLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
  const canStartTaskLifecycle = computed(() => isTaskDetail.value && Boolean(doc.value?.name) && taskLifecycleStatus.value === "Open");
  const canBlockTaskLifecycle = computed(() => isTaskDetail.value && Boolean(doc.value?.name) && ["Open", "In Progress"].includes(taskLifecycleStatus.value));
  const canCompleteTaskLifecycle = computed(() => isTaskDetail.value && Boolean(doc.value?.name) && ["Open", "In Progress", "Blocked"].includes(taskLifecycleStatus.value));
  const canCancelTaskLifecycle = computed(() => isTaskDetail.value && Boolean(doc.value?.name) && ["Open", "In Progress", "Blocked"].includes(taskLifecycleStatus.value));
  const canCompleteReminderLifecycle = computed(() => isReminderDetail.value && Boolean(doc.value?.name) && reminderLifecycleStatus.value === "Open");
  const canCancelReminderLifecycle = computed(() => isReminderDetail.value && Boolean(doc.value?.name) && reminderLifecycleStatus.value === "Open");
  const assignmentLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
  const canStartAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(doc.value?.name) && assignmentLifecycleStatus.value !== "In Progress");
  const canBlockAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(doc.value?.name) && assignmentLifecycleStatus.value !== "Blocked");
  const canCloseAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(doc.value?.name) && assignmentLifecycleStatus.value !== "Done");

  return {
    resource,
    resolvedDoctype,
    activeDoctype,
    activeResource,
    activeLoading,
    doc,
    errorText,
    isEmpty,
    showQuickEditDialog,
    activeDetailTab,
    quickEditConfig,
    quickEditEyebrow,
    canUseQuickEdit,
    copiedRecordKey,
    auxQuickCustomerResource,
    auxQuickPolicyResource,
    auxQuickInsuranceCompanyResource,
    auxQuickSalesEntityResource,
    auxQuickAccountingEntryResource,
    auxMutationResource,
    campaignDraftsResource,
    campaignOutboxResource,
    sendDraftNowResource,
    retryOutboxResource,
    requeueOutboxResource,
    quickEditOptionsMap,
    canOpenCommunicationContext,
    isTaskDetail,
    isReminderDetail,
    isOwnershipAssignmentDetail,
    canSendDraftLifecycle,
    canRetryOutboxLifecycle,
    canRequeueOutboxLifecycle,
    canStartTaskLifecycle,
    canBlockTaskLifecycle,
    canCompleteTaskLifecycle,
    canCancelTaskLifecycle,
    canCompleteReminderLifecycle,
    canCancelReminderLifecycle,
    canStartAssignmentLifecycle,
    canBlockAssignmentLifecycle,
    canCloseAssignmentLifecycle,
    reloadDetail,
    copyRecordValue,
    prepareQuickEditDialog,
    buildQuickEditPayload,
    afterQuickEditSubmit,
    sendDraftLifecycle,
    retryOutboxLifecycle,
    requeueOutboxLifecycle,
    markTaskLifecycle,
    markReminderLifecycle,
    markAssignmentLifecycle,
    goBack,
    openCommunicationContext,
    openDesk,
    openPanel,
    panelConfig,
    handleQuickEditSubmit: afterQuickEditSubmit,
    getQuickEditRegistryCfg: quickEditRegistryCfg,
    ensureQuickEditOptionSources,
  };
}
