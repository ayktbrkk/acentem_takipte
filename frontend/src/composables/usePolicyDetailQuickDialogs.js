import { computed, ref } from "vue";
import { createResource } from "frappe-ui";

import { getLocalizedText, getQuickCreateConfig } from "../config/quickCreateRegistry";

const QUICK_OPTION_LIMIT = 200;

export function usePolicyDetailQuickDialogs({ props, policy, customer, activeLocale, load }) {
  const showOwnershipAssignmentDialog = ref(false);
  const showOwnershipAssignmentEditDialog = ref(false);
  const editingOwnershipAssignment = ref(null);

  const ownershipAssignmentEyebrow = computed(() => {
    return (
      getLocalizedText(getQuickCreateConfig("ownership_assignment")?.title, activeLocale.value) ||
      (activeLocale.value === "tr" ? "Hızlı Atama" : "Quick Assignment")
    );
  });

  const ownershipAssignmentEditEyebrow = computed(() => {
    return (
      getLocalizedText(getQuickCreateConfig("ownership_assignment_edit")?.title, activeLocale.value) ||
      (activeLocale.value === "tr" ? "Atamayı Düzenle" : "Edit Assignment")
    );
  });

  const policyQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
  });

  const policyQuickPolicyResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
  });

  const policyQuickOptionsMap = computed(() => ({
    customers: asArray(resourceValue(policyQuickCustomerResource, [])).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    })),
    policies: asArray(resourceValue(policyQuickPolicyResource, [])).map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
  }));

  const ownershipAssignmentSuccessHandlers = {
    "ownership-assignments-list": async () => {
      await load?.();
    },
  };

  async function ensurePolicyQuickOptionSources() {
    await Promise.allSettled([
      policyQuickCustomerResource.reload({
        doctype: "AT Customer",
        fields: ["name", "full_name"],
        order_by: "modified desc",
        limit_page_length: QUICK_OPTION_LIMIT,
      }),
      policyQuickPolicyResource.reload({
        doctype: "AT Policy",
        fields: ["name", "policy_no", "customer"],
        filters: props.name ? { name: props.name } : {},
        order_by: "modified desc",
        limit_page_length: QUICK_OPTION_LIMIT,
      }),
    ]);
  }

  async function prepareOwnershipAssignmentDialog({ form }) {
    await ensurePolicyQuickOptionSources();
    if (!form.source_doctype) form.source_doctype = "AT Policy";
    if (!form.source_name) form.source_name = props.name || "";
    if (!form.policy) form.policy = props.name || "";
    if (!form.customer) form.customer = customer.value?.name || policy.value.customer || "";
  }

  async function prepareOwnershipAssignmentEditDialog({ resetForm }) {
    await ensurePolicyQuickOptionSources();
    const assignment = editingOwnershipAssignment.value || {};
    resetForm({
      doctype: "AT Ownership Assignment",
      name: assignment.name || "",
      source_doctype: assignment.source_doctype || "AT Policy",
      source_name: assignment.source_name || props.name || "",
      customer: assignment.customer || customer.value?.name || policy.value.customer || "",
      policy: assignment.policy || props.name || "",
      assigned_to: assignment.assigned_to || "",
      assignment_role: assignment.assignment_role || "Owner",
      status: assignment.status || "Open",
      priority: assignment.priority || "Normal",
      due_date: assignment.due_date || "",
      notes: assignment.notes || "",
    });
  }

  function openQuickOwnershipAssignment() {
    showOwnershipAssignmentDialog.value = true;
  }

  function openEditOwnershipAssignment(assignment) {
    editingOwnershipAssignment.value = assignment || null;
    showOwnershipAssignmentEditDialog.value = true;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : value == null ? [] : [value];
  }

  function resourceValue(resource, fallback = null) {
    const value = resource?.data;
    return value == null ? fallback : value;
  }

  return {
    activeLocale,
    ownershipAssignmentEyebrow,
    ownershipAssignmentEditEyebrow,
    policyQuickOptionsMap,
    ownershipAssignmentSuccessHandlers,
    showOwnershipAssignmentDialog,
    showOwnershipAssignmentEditDialog,
    prepareOwnershipAssignmentDialog,
    prepareOwnershipAssignmentEditDialog,
    openQuickOwnershipAssignment,
    openEditOwnershipAssignment,
    editingOwnershipAssignment,
    ensurePolicyQuickOptionSources,
    policyQuickCustomerResource,
    policyQuickPolicyResource,
  };
}
