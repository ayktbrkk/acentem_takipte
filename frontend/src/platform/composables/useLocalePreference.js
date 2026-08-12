import { createResource } from "frappe-ui";

import { useAuthStore } from "../state/authStore";

const LOCALE_ENDPOINT = "acentem_takipte.acentem_takipte.platform.api.session.set_session_locale";

export function useLocalePreference() {
  const authStore = useAuthStore();
  const setLocaleResource = createResource({ url: LOCALE_ENDPOINT });

  async function persistLocaleViaFetch(locale) {
    const response = await fetch(
      `/api/method/${LOCALE_ENDPOINT}?locale=${encodeURIComponent(locale)}`,
      {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );
    const payload = await response.json().catch(() => null);
    return payload?.message || null;
  }

  async function setLocale(locale) {
    authStore.setLocale(locale);
    let payload = null;

    try {
      const response = await setLocaleResource.submit({ locale });
      payload = response?.message && typeof response.message === "object" ? response.message : response;
    } catch (error) {
      // Keep the local locale when the resource request is unavailable.
    }

    if (!payload) {
      try {
        payload = await persistLocaleViaFetch(locale);
      } catch (error) {
        // Server persistence is non-critical for the local shell.
      }
    }

    if (payload?.locale) authStore.setLocale(payload.locale);
    if (payload && typeof payload === "object") authStore.applyContext(payload);
  }

  return { setLocale };
}
