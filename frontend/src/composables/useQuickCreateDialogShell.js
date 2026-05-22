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

  return {
    resolvedLocale,
    fallbackLabels,
  };
}
