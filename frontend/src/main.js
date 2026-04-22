import { createApp } from "vue";
import { setActivePinia } from "pinia";
import { FrappeUI, frappeRequest, setConfig } from "frappe-ui";

import App from "./App.vue";
import router from "./router";
import { getAppPinia, setAppPinia } from "./pinia";
import { hydrateSessionState } from "./state/session";
import { useBranchStore } from "./stores/branch";
import "./style.css";
import "@/assets/design-system.css";
import "@/assets/frappe-overrides.css";
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

function getMethodName(url) {
  return String(url || "").replace(/^\/api\/method\//, "");
}

function readRealtimeConfig() {
  if (typeof window === "undefined") {
    return false;
  }

  const boot = window.AT_SESSION_BOOT || window.__AT_SESSION__ || {};
  const realtime = boot.realtime;
  if (!realtime || typeof realtime !== "object" || realtime.enabled !== true) {
    return false;
  }

  const port = Number.parseInt(realtime.port, 10);
  if (Number.isInteger(port) && port > 0) {
    return { port };
  }

  return false;
}

const DASHBOARD_READ_ONLY_METHODS = new Set([
  "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_kpis",
  "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_tab_payload",
  "acentem_takipte.acentem_takipte.api.dashboard.get_customer_list",
  "acentem_takipte.acentem_takipte.api.dashboard.get_customer_portfolio_summary_map",
  "acentem_takipte.acentem_takipte.api.dashboard.get_customer_workbench_rows",
  "acentem_takipte.acentem_takipte.api.dashboard.get_lead_workbench_rows",
  "acentem_takipte.acentem_takipte.api.dashboard.get_lead_detail_payload",
  "acentem_takipte.acentem_takipte.api.dashboard.get_offer_detail_payload",
]);

function isDashboardReadOnlyMethod(url) {
  return DASHBOARD_READ_ONLY_METHODS.has(getMethodName(url));
}

function isReadOnlyMethod(url) {
  const methodName = getMethodName(url);
  return (
    methodName === "frappe.client.get" ||
    methodName === "frappe.client.get_list" ||
    methodName === "frappe.client.get_value" ||
    methodName === "frappe.client.count" ||
    methodName === "frappe.client.get_count" ||
    methodName === "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state" ||
    isDashboardReadOnlyMethod(methodName) ||
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
  const methodName = getMethodName(requestOptions.url);

  if (isDashboardReadOnlyMethod(methodName)) {
    requestOptions.method = "GET";
    requestOptions.params = serializeGetParams(requestOptions.params);
  }

  // Website routes may not expose window.csrf_token; use GET for safe read methods.
  if (!csrf && !requestOptions.method && isReadOnlyMethod(methodName)) {
    requestOptions.method = requestOptions.method || "GET";
    requestOptions.params = serializeGetParams(requestOptions.params);
  }

  return frappeRequest(requestOptions);
}

async function ensureHighlightJsCompatibility() {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const highlightModule = await import("highlight.js/lib/core");
    const hljs = highlightModule?.default || highlightModule;

    if (!hljs || typeof hljs.highlightAll !== "function") {
      return;
    }

    if (typeof hljs.highlightAll === "function") {
      if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", () => hljs.highlightAll(), { once: true });
      } else {
        hljs.highlightAll();
      }
    }
  } catch {
    // No-op: highlight.js is optional in routes that do not render the editor.
  }
}

setConfig("resourceFetcher", appResourceFetcher);

function renderBootstrapError(target, error) {
  if (!target) {
    return;
  }

  console.error("Acentem Takipte bootstrap failed", error);
  target.innerHTML = `
    <div style="max-width:48rem;margin:2rem auto;padding:1rem 1.25rem;border:1px solid #f5c2c7;border-radius:.75rem;background:#fff5f5;color:#842029;">
      <h2 style="margin:0 0 .5rem;font-size:1.125rem;font-weight:700;">Acentem Takipte yuklenemedi</h2>
      <p style="margin:0 0 .5rem;">/at sayfasi baslatilirken bir istemci hatasi olustu.</p>
      <p style="margin:0;">Tarayici konsolunu kontrol edin. Gerekirse frontend build'ini yenileyip cache temizleyin.</p>
    </div>
  `;
}

const mountTarget = document.querySelector("#app");
if (mountTarget) {
  const mountApp = async () => {
    await ensureHighlightJsCompatibility();
    await hydrateSessionState();

    const app = createApp(App);
    const pinia = getAppPinia();
    const realtimeConfig = readRealtimeConfig();
    setAppPinia(pinia);
    setActivePinia(pinia);
    app.use(pinia);
    app.use(FrappeUI, { socketio: realtimeConfig });
    app.use(router);

    // audit(perf/P-03): v-prefetch directive — on hover, prefetches the lazy
    // route chunk so navigation feels instant. Usage: v-prefetch="/customers"
    app.directive("prefetch", {
      mounted(el, binding) {
        if (!binding.value) return;
        el.addEventListener(
          "mouseenter",
          () => {
            try {
              router.resolve(binding.value);
            } catch {
              // Ignore unresolvable routes
            }
          },
          { once: true, passive: true },
        );
      },
    });

    const branchStore = useBranchStore(pinia);
    branchStore.hydrateFromSession();
    branchStore.syncFromRoute(router.currentRoute.value);
    router.afterEach((to) => {
      branchStore.syncFromRoute(to);
    });
    setActivePinia(pinia);
    app.mount(mountTarget);
  };

  mountApp().catch((error) => {
    renderBootstrapError(mountTarget, error);
  });
}

