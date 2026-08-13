import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import Topbar from "./Topbar.vue";
import { useAuthStore } from "../state/authStore";

vi.mock("frappe-ui", () => ({
  createResource: () => ({ submit: vi.fn(async ({ locale }) => ({ message: { locale } })) }),
}));

const routerRoute = {
  meta: { title: "Dashboard", section: "Overview" },
};

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: () => {} }),
  createWebHistory: () => ({}),
  useRoute: () => routerRoute,
}));

const OfficeBranchSelectStub = {
  template: `<div data-testid="branch-scope-trigger">Branch scope control</div>`,
};

function mountTopbar(options = {}) {
  return mount(Topbar, {
    ...options,
    global: {
      ...options.global,
      stubs: { OfficeBranchSelect: OfficeBranchSelectStub },
    },
  });
}

describe("Topbar shell contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it.each([
    ["tr", "Pano", "GENEL GÖRÜNÜM"],
    ["en", "Dashboard", "OVERVIEW"],
  ])("keeps page context and branch scope while controls move to the profile menu in %s", (locale, pageTitle, sectionLabel) => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale,
      user: "Aykut Yılmaz",
      userId: "aykut",
      roles: ["AT Manager"],
      office_branches: [{ name: "HQ", office_branch_name: "AT Sigorta", is_default: 1 }],
    });

    const wrapper = mountTopbar();
    expect(wrapper.text()).toContain(pageTitle);
    expect(wrapper.text()).toContain(sectionLabel);
    expect(wrapper.find('[data-testid="branch-scope-trigger"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-sidebar-trigger"]').exists()).toBe(true);

    expect(wrapper.find('button[aria-haspopup="menu"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="topbar-language-menu"]').exists()).toBe(false);
    expect(wrapper.findAll("button").some((button) => ["TR", "EN"].includes(button.text().trim()))).toBe(false);
    expect(wrapper.find('[data-testid="branch-scope-trigger"]').element.contains(wrapper.find('[data-testid="topbar-language-trigger"]').element)).toBe(false);
    expect(wrapper.find('[data-testid="topbar-language-trigger"]').element.contains(wrapper.find('[data-testid="branch-scope-trigger"]').element)).toBe(false);
    expect(wrapper.find('[data-testid="sidebar-profile-menu"]').exists()).toBe(false);
  });

  it("owns the desktop language chip with the full current-language label", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles: ["AT Agent"] });

    const wrapper = mountTopbar();
    const trigger = wrapper.find('[data-testid="topbar-language-trigger"]');

    expect(trigger.exists()).toBe(true);
    expect(trigger.text()).toContain("Türkçe");
    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    expect(trigger.attributes("aria-controls")).toBe("topbar-language-menu");
    expect(wrapper.find('[data-testid="topbar-language-menu"]').exists()).toBe(false);

    await trigger.trigger("click");
    const menu = wrapper.find('[data-testid="topbar-language-menu"]');
    expect(menu.attributes("role")).toBe("menu");
    expect(menu.attributes("id")).toBe("topbar-language-menu");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(menu.text()).toContain("English");
    expect(menu.find('[role="menuitemradio"][aria-checked="true"]').exists()).toBe(true);
  });

  it("keeps language-menu keyboard focus and close behavior consistent", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles: ["AT Agent"] });

    const wrapper = mountTopbar({ attachTo: document.body });
    const trigger = wrapper.find('[data-testid="topbar-language-trigger"]');
    trigger.element.focus();
    await trigger.trigger("click");
    await wrapper.vm.$nextTick();

    const items = wrapper.findAll('[data-testid="topbar-language-menu"] [role="menuitemradio"]');
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(items[0].element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(document.activeElement).toBe(items[1].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
    expect(document.activeElement).toBe(items[0].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
    expect(document.activeElement).toBe(items[1].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    expect(document.activeElement).toBe(items[0].element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="topbar-language-menu"]').exists()).toBe(false);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger.element);

    await trigger.trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.findAll('[data-testid="topbar-language-menu"] [role="menuitemradio"]')[1].trigger("click");
    expect(authStore.locale).toBe("en");
    expect(wrapper.find('[data-testid="topbar-language-menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);

    await trigger.trigger("click");
    const externalButton = document.createElement("button");
    document.body.appendChild(externalButton);
    externalButton.focus();
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="topbar-language-menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(externalButton);
    externalButton.remove();
    wrapper.unmount();
  });

  it("keeps the mobile language surface independent from branch scope and profile content", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles: ["AT Agent"], office_branches: [{ name: "HQ" }] });

    const wrapper = mountTopbar({ attachTo: document.body });
    const trigger = wrapper.find('[data-testid="mobile-language-trigger"]');

    expect(trigger.exists()).toBe(true);
    expect(trigger.text()).toContain("Türkçe");
    expect(trigger.attributes("aria-controls")).toBe("mobile-language-menu");
    expect(trigger.element.contains(wrapper.find('[data-testid="branch-scope-trigger"]').element)).toBe(false);
    expect(wrapper.find('[data-testid="sidebar-profile-menu"]').exists()).toBe(false);

    await trigger.trigger("click");
    const menu = wrapper.find('[data-testid="mobile-language-menu"]');
    expect(menu.attributes("role")).toBe("menu");
    expect(menu.attributes("id")).toBe("mobile-language-menu");
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(menu.find('[role="menuitemradio"][aria-checked="true"]').text()).toContain("Türkçe");

    await menu.find('[role="menuitemradio"][aria-checked="false"]').trigger("click");
    expect(authStore.locale).toBe("en");
    expect(wrapper.text()).toContain("Dashboard");
    expect(wrapper.text()).toContain("OVERVIEW");
    expect(trigger.text()).toContain("English");
    expect(document.activeElement).toBe(trigger.element);
    wrapper.unmount();
  });

  it("restores focus to the mobile language trigger after an outside click", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles: ["AT Agent"] });

    const wrapper = mountTopbar({ attachTo: document.body });
    const trigger = wrapper.find('[data-testid="mobile-language-trigger"]');
    await trigger.trigger("click");
    const externalButton = document.createElement("button");
    document.body.appendChild(externalButton);
    externalButton.focus();
    document.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="mobile-language-menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(externalButton);
    externalButton.remove();
    wrapper.unmount();
  });

  it("supports complete keyboard navigation on the separate mobile language surface", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles: ["AT Agent"] });

    const wrapper = mountTopbar({ attachTo: document.body });
    const trigger = wrapper.find('[data-testid="mobile-language-trigger"]');
    await trigger.trigger("click");
    await wrapper.vm.$nextTick();

    const menu = wrapper.find('[data-testid="mobile-language-menu"]');
    const items = menu.findAll('[role="menuitemradio"]');
    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(items[0].element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(document.activeElement).toBe(items[1].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    expect(document.activeElement).toBe(items[0].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
    expect(document.activeElement).toBe(items[1].element);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
    expect(document.activeElement).toBe(items[0].element);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="mobile-language-menu"]').exists()).toBe(false);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger.element);
    wrapper.unmount();
  });

  it("closes the desktop language menu when the viewport crosses to mobile", async () => {
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles: ["AT Agent"] });

    const wrapper = mountTopbar({ attachTo: document.body });
    const trigger = wrapper.find('[data-testid="topbar-language-trigger"]');
    await trigger.trigger("click");
    const listener = mediaQuery.addEventListener.mock.calls[0][1];

    listener({ matches: false });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="topbar-language-menu"]').exists()).toBe(false);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    await wrapper.find('[data-testid="mobile-language-trigger"]').trigger("click");
    expect(wrapper.find('[data-testid="mobile-language-menu"]').exists()).toBe(true);
    wrapper.unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", listener);
  });

  it("closes the mobile language menu when the viewport crosses to desktop", async () => {
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));
    const authStore = useAuthStore();
    authStore.applyContext({ locale: "tr", user: "Aykut", roles: ["AT Agent"] });

    const wrapper = mountTopbar({ attachTo: document.body });
    const trigger = wrapper.find('[data-testid="mobile-language-trigger"]');
    await trigger.trigger("click");
    const listener = mediaQuery.addEventListener.mock.calls[0][1];

    listener({ matches: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="mobile-language-menu"]').exists()).toBe(false);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    await wrapper.find('[data-testid="topbar-language-trigger"]').trigger("click");
    expect(wrapper.find('[data-testid="topbar-language-menu"]').exists()).toBe(true);
    wrapper.unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", listener);
  });
});
