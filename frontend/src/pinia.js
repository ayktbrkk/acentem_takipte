import { createPinia, getActivePinia, setActivePinia } from "pinia";

let appPinia = null;

export function setAppPinia(pinia) {
  appPinia = pinia;
  if (pinia) {
    setActivePinia(pinia);
  }
  return appPinia;
}

export function getAppPinia() {
  if (appPinia) {
    return appPinia;
  }

  const activePinia = getActivePinia();
  if (activePinia) {
    return activePinia;
  }

  const fallbackPinia = createPinia();
  setActivePinia(fallbackPinia);
  appPinia = fallbackPinia;
  return appPinia;
}
