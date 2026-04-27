import { computed } from "vue";
import { translateText } from "../utils/i18n";

export function useQuickCreateDialogShell(props, authStore) {
  const resolvedLocale = computed(() => props.locale || authStore.locale || "en");
  const fallbackLabels = computed(() =>
    ({
      cancel: translateText("cancel", resolvedLocale.value),
      save: translateText("save", resolvedLocale.value),
      saveAndOpen: translateText("save_and_open", resolvedLocale.value),
    }),
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
