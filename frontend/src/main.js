import { createApp } from "vue";
import { createPinia } from "pinia";
import { FrappeUI, frappeRequest, setConfig } from "frappe-ui";

import App from "./App.vue";
import router from "./router";
import { hydrateSessionState } from "./state/session";
import { useBranchStore } from "./stores/branch";
import "./style.css";
import "vue3-select-component/styles";

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  const parts = String(document.cookie || "").split("; ");
  const found = parts.find((item) => item.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : "";
}

function ensureCsrfToken() {
  if (typeof window === "undefined") return "";
  if (window.csrf_token && window.csrf_token !== "{{ csrf_token }}") {
    return window.csrf_token;
  }

  const token =
    window.frappe?.csrf_token ||
    window.frappe?.boot?.csrf_token ||
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ||
    readCookie("csrf_token") ||
    "";

  if (token) {
    window.csrf_token = token;
  }
  return token;
}

function isReadOnlyMethod(url) {
  const methodName = String(url || "").replace(/^\/api\/method\//, "");
  return (
    methodName === "frappe.client.get" ||
    methodName === "frappe.client.get_list" ||
    methodName === "frappe.client.get_value" ||
    methodName === "frappe.client.count" ||
    methodName === "frappe.client.get_count" ||
    methodName === "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state" ||
    methodName === "acentem_takipte.acentem_takipte.api.dashboard.get_customer_portfolio_summary_map" ||
    methodName === "acentem_takipte.acentem_takipte.api.dashboard.get_customer_workbench_rows" ||
    methodName === "acentem_takipte.acentem_takipte.api.dashboard.get_lead_workbench_rows" ||
    methodName === "acentem_takipte.acentem_takipte.api.dashboard.get_lead_detail_payload" ||
    methodName === "acentem_takipte.acentem_takipte.api.dashboard.get_offer_detail_payload" ||
    methodName === "acentem_takipte.acentem_takipte.api.communication.get_queue_snapshot" ||
    methodName === "acentem_takipte.acentem_takipte.api.reports.get_policy_list_report" ||
    methodName === "acentem_takipte.acentem_takipte.api.reports.get_payment_status_report" ||
    methodName === "acentem_takipte.acentem_takipte.api.reports.get_renewal_performance_report" ||
    methodName === "acentem_takipte.acentem_takipte.api.reports.get_claim_loss_ratio_report" ||
    methodName === "acentem_takipte.acentem_takipte.api.reports.get_agent_performance_report" ||
    methodName === "acentem_takipte.acentem_takipte.api.reports.get_customer_segmentation_report"
  );
}

function serializeGetParams(params) {
  if (!params || typeof params !== "object") return params;
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (value == null) return [key, value];
      if (typeof value === "object") return [key, JSON.stringify(value)];
      return [key, value];
    })
  );
}

function appResourceFetcher(options = {}) {
  const csrf = ensureCsrfToken();
  const requestOptions = { ...options };

  // Website routes may not expose window.csrf_token; use GET for safe read methods.
  if (!csrf && isReadOnlyMethod(requestOptions.url)) {
    requestOptions.method = requestOptions.method || "GET";
    requestOptions.params = serializeGetParams(requestOptions.params);
  }

  return frappeRequest(requestOptions);
}

setConfig("resourceFetcher", appResourceFetcher);

const mountTarget = document.querySelector("#app");
if (mountTarget) {
  const mountApp = async () => {
    await hydrateSessionState();

    const app = createApp(App);
    const pinia = createPinia();
    app.use(pinia);
    app.use(FrappeUI);
    app.use(router);
    const branchStore = useBranchStore(pinia);
    branchStore.hydrateFromSession();
    branchStore.syncFromRoute(router.currentRoute.value);
    router.afterEach((to) => {
      branchStore.syncFromRoute(to);
    });
    app.mount(mountTarget);
  };

  mountApp();
}
