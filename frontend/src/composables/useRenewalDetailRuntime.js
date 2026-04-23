import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function useRenewalDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();

  function t(key) {
    return translateText(key, activeLocale);
  }

  const renewalResource = createResource({
    url: "frappe.client.get",
    auto: false,
    params: { doctype: "AT Renewal Task" },
  });

  const policyResource = createResource({
    url: "frappe.client.get",
    auto: false,
    params: { doctype: "AT Policy" },
  });

  const data = computed(() => unref(renewalResource.data) || {});
  const policy = computed(() => unref(policyResource.data) || {});

  const loading = computed(() => renewalResource.loading || policyResource.loading);

  async function reload() {
    const taskName = unref(name);
    if (!taskName) return;
    const task = await renewalResource.reload({ name: taskName });
    if (task?.policy) {
      await policyResource.reload({ name: task.policy });
    }
  }

  function backToList() {
    router.push({ name: "renewals-board" });
  }

  function openPolicy() {
    if (data.value.policy) {
      router.push({ name: "policy-detail", params: { name: data.value.policy } });
    }
  }

  function formatDate(val) {
    if (!val) return "-";
    return new Intl.DateTimeFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US").format(new Date(val));
  }

  const heroCells = computed(() => [
    { label: t("policy"), value: data.value.policy || "-" },
    { label: t("due"), value: formatDate(data.value.due_date) },
    { label: t("renewal_date"), value: formatDate(data.value.renewal_date), variant: "lg" },
    { label: t("status"), value: t(`status_${String(data.value.status || "Open").toLowerCase().replace(" ", "_")}`), variant: "accent" },
  ]);

  const profileFields = computed(() => [
    { label: t("policy_no"), value: policy.value.policy_no || data.value.policy },
    { label: t("customer"), value: data.value.customer },
    { label: t("branch"), value: data.value.office_branch },
    { label: t("priority"), value: t(`priority_${String(data.value.priority || "Medium").toLowerCase()}`) },
  ]);

  // Watch for name change
  watch(() => unref(name), (newVal) => {
    if (newVal) reload();
  }, { immediate: true });

  return {
    renewal: data,
    policy,
    loading,
    t,
    reload,
    backToList,
    openPolicy,
    formatDate,
    heroCells,
    profileFields,
  };
}
