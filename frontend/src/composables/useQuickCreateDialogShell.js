import { computed } from "vue";

export function useQuickCreateDialogShell(props, authStore) {
  const resolvedLocale = computed(() => props.locale || authStore.locale || "tr");
  const fallbackLabels = computed(() =>
    resolvedLocale.value === "tr"
      ? { cancel: "İptal", save: "Kaydet", saveAndOpen: "Kaydet ve Aç" }
      : { cancel: "Cancel", save: "Save", saveAndOpen: "Save & Open" },
  );
  const saveButtonClass = computed(() => {
    if (props.showSaveAndOpen) {
      return "rounded-lg border border-brand-700 px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60";
    }
    return "rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60";
  });

  return {
    resolvedLocale,
    fallbackLabels,
    saveButtonClass,
  };
}
