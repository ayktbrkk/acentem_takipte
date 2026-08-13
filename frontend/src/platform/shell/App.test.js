import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import App from "./App.vue";
import { getAppPinia } from "../../pinia";
import { useAuthStore } from "../state/authStore";
import { useUiStore } from "../state/uiStore";

const routerRoute = { fullPath: "/dashboard" };

vi.mock("frappe-ui", () => ({
  FeatherIcon: { template: "<span />" },
}));

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routerRoute,
}));

const SidebarStub = {
  props: ["mobileOpen"],
  template: '<aside data-testid="sidebar-stub" :data-open="mobileOpen" />',
};

const TopbarStub = { template: '<header data-testid="topbar-stub" />' };
const RouterViewStub = { template: '<div data-testid="router-view-stub" />' };

let wrapper;
let authStore;

function mountApp() {
  wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [getAppPinia()],
      stubs: { Sidebar: SidebarStub, Topbar: TopbarStub, RouterView: RouterViewStub },
    },
  });
  return wrapper;
}

describe("App shell runtime", () => {
  let realtime;

  beforeEach(() => {
    realtime = { on: vi.fn(), off: vi.fn() };
    window.frappe = { realtime };
    authStore = useAuthStore(getAppPinia());
    authStore.applyContext({ user: "aykut", userId: "aykut", roles: ["AT Agent"], locale: "en" });
    useUiStore(getAppPinia()).closeSidebar();
  });

  afterEach(() => {
    wrapper?.unmount();
    delete window.frappe;
  });

  it("filters realtime notices, renders exact notices, binds inert, and removes exact handlers", async () => {
    const mounted = mountApp();
    const handlers = Object.fromEntries(realtime.on.mock.calls.map(([event, handler]) => [event, handler]));

    handlers.at_scope_changed({ user: "another-user" });
    await mounted.vm.$nextTick();
    expect(mounted.find('[role="alert"]').exists()).toBe(false);

    handlers.at_scope_changed({ user: "aykut" });
    await mounted.vm.$nextTick();
    expect(mounted.find('[role="alert"] span').text()).toBe(
      "Your access permissions have been updated. Refresh to continue with the latest permissions.",
    );

    handlers.at_emergency_access_granted({ beneficiary: "Aykut", scope: "Claims" });
    await mounted.vm.$nextTick();
    expect(mounted.find('[role="alert"] span').text()).toBe(
      "Your access permissions have been updated. Refresh to continue with the latest permissions.",
    );

    const uiStore = useUiStore(getAppPinia());
    uiStore.openSidebar();
    await mounted.vm.$nextTick();
    expect(mounted.find(".at-shell-content").attributes("inert")).toBeDefined();

    authStore.applyContext({ roles: ["System Manager"] });
    handlers.at_emergency_access_granted({ beneficiary: "Aykut", scope: "Claims" });
    await mounted.vm.$nextTick();
    expect(mounted.find('[role="alert"] span').text()).toBe(
      "NOTICE: Emergency access granted to Aykut for Claims.",
    );

    const scopeHandler = handlers.at_scope_changed;
    const emergencyHandler = handlers.at_emergency_access_granted;
    mounted.unmount();

    expect(realtime.off).toHaveBeenCalledWith("at_scope_changed", scopeHandler);
    expect(realtime.off).toHaveBeenCalledWith("at_emergency_access_granted", emergencyHandler);
    expect(realtime.off).toHaveBeenCalledTimes(2);
  });
});
