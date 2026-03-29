import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";

const resourceValue = (resource, fallback = null) => {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

export function usePolicyDetailRuntime({ props, router, activeTab }) {
  const policy360Resource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_policy_360_payload",
    auto: false,
  });
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
    if (props.name && typeof window !== "undefined") {
      window.location.assign(`/app/at-policy/${encodeURIComponent(props.name)}`);
    }
  }

  function openCustomer(name) {
    if (name) router.push({ name: "customer-detail", params: { name } });
  }

  function openPolicyDocuments() {
    if (!props.name) return;
    router.push({
      name: "files-list",
      query: {
        attached_to_doctype: "AT Policy",
        attached_to_name: props.name,
      },
    });
  }

  async function load() {
    if (!props.name) return;

    try {
      const payload = await policy360Resource.reload({ name: props.name });
      const data = payload || {};
      policyR.setData(data.policy || {});
      customerR.setData(data.customer || null);
      endorsementR.setData(data.endorsements || []);
      commentR.setData(data.comments || []);
      communicationR.setData(data.communications || []);
      snapshotR.setData(data.snapshots || []);
      paymentR.setData(data.payments || []);
      fileR.setData(data.files || []);
      notificationR.setData(data.notifications || []);
      selectedSnapshotName.value = asArray(data.snapshots).at(-1)?.name || "";
    } catch {
      policyR.setData({});
      customerR.setData(null);
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
    load,
    timelineLoading,
    customerLoading,
    endorsementLoading,
    paymentLoading,
    fileLoading,
    endorsementStatusClass,
  };
}
