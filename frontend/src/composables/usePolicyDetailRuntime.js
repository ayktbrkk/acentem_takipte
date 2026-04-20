import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useAuthStore } from "../stores/auth";

const resourceValue = (resource, fallback = null) => {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

export function usePolicyDetailRuntime({ props, router, activeTab }) {
  const authStore = useAuthStore();
  const policy360Resource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_policy_360_payload",
    auto: false,
  });
  const policyLookupR = createResource({ url: "frappe.client.get_list", auto: false });
  const policyR = createResource({ url: "frappe.client.get", auto: false });
  const customerR = createResource({ url: "frappe.client.get", auto: false });
  const endorsementR = createResource({ url: "frappe.client.get_list", auto: false });
  const commentR = createResource({ url: "frappe.client.get_list", auto: false });
  const communicationR = createResource({ url: "frappe.client.get_list", auto: false });
  const snapshotR = createResource({ url: "frappe.client.get_list", auto: false });
  const paymentR = createResource({ url: "frappe.client.get_list", auto: false });
  const fileR = createResource({ url: "frappe.client.get_list", auto: false });
  const notificationR = createResource({ url: "frappe.client.get_list", auto: false });

  const policy360Data = computed(() => resourceValue(policy360Resource, {}));
  const policy = computed(() => resourceValue(policyR, {}));
  const activePolicyName = computed(() => String(policy.value?.name || props.name || "").trim());
  const customer = computed(() => resourceValue(customerR, null));
  const endorsements = computed(() => asArray(resourceValue(endorsementR, [])));
  const comments = computed(() => asArray(resourceValue(commentR, [])));
  const communications = computed(() => asArray(resourceValue(communicationR, [])));
  const snapshots = computed(() => {
    const items = asArray(resourceValue(snapshotR, []));
    return [...items].sort((a, b) => Number(a.snapshot_version || 0) - Number(b.snapshot_version || 0));
  });
  const payments = computed(() => asArray(resourceValue(paymentR, [])));
  const files = computed(() => asArray(resourceValue(fileR, [])));
  const assignments = computed(() => asArray(policy360Data.value?.assignments));
  const productProfile = computed(() => policy360Data.value?.product_profile || {});
  const documentProfile = computed(() => policy360Data.value?.document_profile || {});
  const selectedSnapshotName = ref("");

  async function copyIdentity(value, key) {
    const text = String(value || "").trim();
    if (!text) return;

    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== "undefined") {
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
    } catch {
      void key;
    }
  }

  function goBack() {
    router.push({ name: "policy-list" });
  }

  function openDeskPolicy() {
    const policyName = activePolicyName.value;
    if (policyName && typeof window !== "undefined") {
      window.location.assign(`/app/at-policy/${encodeURIComponent(policyName)}`);
    }
  }

  function openCustomer(name) {
    if (name) router.push({ name: "customer-detail", params: { name } });
  }

  function openPolicyDocuments() {
    const policyName = activePolicyName.value;
    if (!policyName) return;
    router.push({
      name: "files-list",
      query: {
        attached_to_doctype: "AT Policy",
        attached_to_name: policyName,
      },
    });
  }

  const showUploadModal = ref(false);

  function openUploadModal() {
    showUploadModal.value = true;
  }

  function closeUploadModal() {
    showUploadModal.value = false;
  }

  async function handleUploadComplete() {
    showUploadModal.value = false;
    const policyName = activePolicyName.value;
    if (policyName) {
      const payload = await policy360Resource.reload({ name: policyName });
      applyPolicyPayload(payload);
    }
  }

  function fmtFileSize(bytes) {
    if (!bytes || bytes === 0) return "-";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  const canUploadDocuments = computed(() =>
    Boolean(authStore.capabilities?.doctypes?.["AT Policy"]?.write)
  );

  function applyPolicyPayload(data) {
    const payload = data || {};
    policyR.setData(payload.policy || {});
    customerR.setData(payload.customer || null);
    endorsementR.setData(payload.endorsements || []);
    commentR.setData(payload.comments || []);
    communicationR.setData(payload.communications || []);
    snapshotR.setData(payload.snapshots || []);
    paymentR.setData(payload.payments || []);
    fileR.setData(payload.files || []);
    notificationR.setData(payload.notifications || []);
    selectedSnapshotName.value = asArray(payload.snapshots).at(-1)?.name || "";
  }

  async function resolvePolicyNameFromCarrierNo(value) {
    const carrierPolicyNo = String(value || "").trim();
    if (!carrierPolicyNo) return "";

    try {
      const rows = await policyLookupR.reload({
        doctype: "AT Policy",
        fields: ["name"],
        filters: { policy_no: carrierPolicyNo },
        order_by: "modified desc",
        limit_page_length: 2,
      });
      const matches = asArray(rows).map((row) => String(row?.name || "").trim()).filter(Boolean);
      return matches.length === 1 ? matches[0] : "";
    } catch {
      return "";
    }
  }

  async function load() {
    const requestedPolicyName = String(props.name || "").trim();
    if (!requestedPolicyName) return;

    try {
      const payload = await policy360Resource.reload({ name: requestedPolicyName });
      applyPolicyPayload(payload);
    } catch {
      const resolvedPolicyName = await resolvePolicyNameFromCarrierNo(requestedPolicyName);
      if (resolvedPolicyName && resolvedPolicyName !== requestedPolicyName) {
        try {
          const payload = await policy360Resource.reload({ name: resolvedPolicyName });
          applyPolicyPayload(payload);
          return;
        } catch {
          // fallback below
        }
      }

      let fallbackPolicy = null;
      let fallbackCustomer = null;
      const fallbackPolicyName = resolvedPolicyName || requestedPolicyName;

      try {
        fallbackPolicy = await policyR.reload({ doctype: "AT Policy", name: fallbackPolicyName });
      } catch {
        fallbackPolicy = null;
      }

      const safePolicy = fallbackPolicy && typeof fallbackPolicy === "object" ? fallbackPolicy : {};
      policyR.setData(safePolicy);

      const customerName = String(safePolicy.customer || "").trim();
      if (customerName) {
        try {
          fallbackCustomer = await customerR.reload({ doctype: "AT Customer", name: customerName });
        } catch {
          fallbackCustomer = null;
        }
      }

      customerR.setData(
        fallbackCustomer && typeof fallbackCustomer === "object" ? fallbackCustomer : null
      );
      endorsementR.setData([]);
      commentR.setData([]);
      communicationR.setData([]);
      snapshotR.setData([]);
      paymentR.setData([]);
      fileR.setData([]);
      notificationR.setData([]);
      selectedSnapshotName.value = "";
    }
  }

  watch(
    () => props.name,
    () => {
      if (activeTab) activeTab.value = "summary";
      void load();
    },
    { immediate: true },
  );

  const timelineLoading = computed(() => Boolean(unref(policy360Resource.loading)));
  const customerLoading = computed(() => Boolean(unref(policy360Resource.loading)));
  const endorsementLoading = computed(() => Boolean(unref(policy360Resource.loading)));
  const paymentLoading = computed(() => Boolean(unref(policy360Resource.loading)));
  const fileLoading = computed(() => Boolean(unref(policy360Resource.loading)));

  const endorsementStatusClass = (s) => (s === "Applied" ? "text-emerald-700" : s === "Cancelled" ? "text-slate-700" : "text-slate-700");

  return {
    policy,
    customer,
    endorsements,
    comments,
    communications,
    snapshots,
    payments,
    files,
    assignments,
    productProfile,
    documentProfile,
    selectedSnapshotName,
    copyIdentity,
    goBack,
    openDeskPolicy,
    openCustomer,
    openPolicyDocuments,
    showUploadModal,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
    canUploadDocuments,
    fmtFileSize,
    load,
    timelineLoading,
    customerLoading,
    endorsementLoading,
    paymentLoading,
    fileLoading,
    endorsementStatusClass,
  };
}
