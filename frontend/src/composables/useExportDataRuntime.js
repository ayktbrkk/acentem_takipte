import { computed, reactive, ref, unref } from "vue";

export function useExportDataRuntime({ t, router, authStore }) {
  const activeLocale = computed(() => unref(authStore.locale) || "en");

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

  function buildExportUrl() {
    const params = new URLSearchParams({
      screen: form.screen,
      format: form.format,
    });

    if (form.filename) params.set("filename", form.filename);
    if (form.startDate) params.set("start_date", form.startDate);
    if (form.endDate) params.set("end_date", form.endDate);
    if (form.status) params.set("status", form.status);

    return `/api/method/acentem_takipte.acentem_takipte.api.list_exports.download_export?${params.toString()}`;
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
    const url = buildExportUrl();
    window.open(url, "_blank", "noopener,noreferrer");
    addHistory();
    message.value = t("exportStarted");
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
    buildExportUrl,
    addHistory,
    downloadExport,
    resetForm,
    cancel,
  };
}
