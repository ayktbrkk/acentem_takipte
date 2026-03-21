import { createPinia, getActivePinia, setActivePinia } from "pinia";

// Keep a single Pinia instance available even before app.mount(),
// so early useStore() calls cannot hit an undefined active pinia.
let appPinia = createPinia();
setActivePinia(appPinia);

export function setAppPinia(pinia) {
  if (pinia && pinia !== appPinia) {
    appPinia = pinia;
  }
  setActivePinia(appPinia);
  return appPinia;
}

export function getAppPinia() {
  if (appPinia) {
    return appPinia;
  }

  const activePinia = getActivePinia();
  if (activePinia) {
    appPinia = activePinia;
    return appPinia;
  }

  appPinia = createPinia();
  setActivePinia(appPinia);
  return appPinia;
}
