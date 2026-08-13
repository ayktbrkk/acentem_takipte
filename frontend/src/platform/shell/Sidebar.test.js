import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import Sidebar from "./Sidebar.vue";
import { useAuthStore } from "../state/authStore";
import { useUiStore } from "../state/uiStore";

vi.mock("frappe-ui", () => ({
  createResource: () => ({ submit: vi.fn() }),
}));

const routerRoute = {
  path: "/dashboard",
  meta: {
    title: "Dashboard",
    section: "Overview",
  },
};

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routerRoute,
}));

const RouterLinkStub = {
  props: ["to", "title"],
  template: `<a
    :href="typeof to === 'string' ? to : to?.path || '/'"
    :title="title"
    :class="{ 'router-link-active': isActive }"
    :aria-current="isActive ? 'page' : undefined"
  ><slot /></a>`,
  setup(props) {
    return {
      isActive: typeof props.to === "string" && props.to === routerRoute.path,
    };
  },
};

const OfficeBranchSelectStub = {
  template: `<div class="office-branch-select-stub">Office Branch Select</div>`,
};

let mountedWrappers = [];

function mountSidebar(options) {
  const wrapper = mount(Sidebar, options);
  mountedWrappers.push(wrapper);
  return wrapper;
}

function findLatestProfileMenu() {
  const menus = document.body.querySelectorAll('[data-testid="sidebar-profile-menu"]');
  return menus[menus.length - 1] || null;
}

function cleanupTeleportedMenus() {
  document.querySelectorAll('[data-testid="sidebar-profile-menu"]').forEach((menu) => menu.remove());
}

function addMobileSidebarTrigger() {
  const trigger = document.createElement("button");
  trigger.dataset.testid = "mobile-sidebar-trigger";
  document.body.appendChild(trigger);
  return trigger;
}

function addFocusTarget() {
  const target = document.createElement("button");
  document.body.appendChild(target);
  return target;
}

function stubMobileViewport() {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("Sidebar localization", () => {
  beforeEach(() => {
    cleanupTeleportedMenus();
    setActivePinia(createPinia());
    useUiStore().setCollapsed(false);
    vi.stubGlobal("matchMedia", (query) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    mountedWrappers.forEach((wrapper) => wrapper.unmount());
    mountedWrappers = [];
    cleanupTeleportedMenus();
    vi.unstubAllGlobals();
  });

  it("moves focus to the close control when the mobile drawer opens", async () => {
    stubMobileViewport();
    const trigger = addMobileSidebarTrigger();
    useAuthStore().applyContext({ roles: ["AT Agent"] });
    const wrapper = mountSidebar({
      attachTo: document.body,
      props: { mobileOpen: false },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });

    await wrapper.setProps({ mobileOpen: true });
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(wrapper.find('[data-testid="mobile-sidebar-close"]').element);
    expect(document.activeElement).not.toBe(trigger);
    trigger.remove();
  });

  it.each([
    ["the close control", (wrapper) => wrapper.find('[data-testid="mobile-sidebar-close"]')],
    ["the overlay", (wrapper) => wrapper.find("button.fixed.inset-0")],
    ["navigation", (wrapper) => wrapper.find("nav a")],
  ])("restores focus to the trigger after closing via %s", async (_source, findSource) => {
    stubMobileViewport();
    const trigger = addMobileSidebarTrigger();
    useAuthStore().applyContext({ roles: ["AT Agent"] });
    const wrapper = mountSidebar({
      attachTo: document.body,
      props: { mobileOpen: false },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });
    await wrapper.setProps({ mobileOpen: true });
    await wrapper.vm.$nextTick();

    await findSource(wrapper).trigger("click");
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("close") || wrapper.emitted("navigate")).toBeTruthy();

    await wrapper.setProps({ mobileOpen: false });
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("does not steal focus for desktop open or close transitions", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const focusTarget = addFocusTarget();
    const wrapper = mountSidebar({
      attachTo: document.body,
      props: { mobileOpen: false },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });

    focusTarget.focus();
    await wrapper.setProps({ mobileOpen: true });
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(focusTarget);

    await wrapper.setProps({ mobileOpen: false });
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(focusTarget);
    focusTarget.remove();
  });

  it("preserves focus when an open mobile drawer crosses to desktop", async () => {
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", () => mediaQuery);
    const trigger = addMobileSidebarTrigger();
    const wrapper = mountSidebar({
      attachTo: document.body,
      props: { mobileOpen: false },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });

    await wrapper.setProps({ mobileOpen: true });
    await wrapper.vm.$nextTick();
    const currentFocus = addFocusTarget();
    currentFocus.focus();

    mediaQuery.matches = true;
    mediaQuery.addEventListener.mock.calls[0][1]({ matches: true });
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(currentFocus);

    await wrapper.setProps({ mobileOpen: false });
    await wrapper.vm.$nextTick();
    expect(document.activeElement).toBe(currentFocus);
    trigger.remove();
    currentFocus.remove();
  });

  it("renders Turkish chrome labels when the locale is tr", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut",
      userId: "aykut",
      roles: ["AT Agent"],
    });

    const wrapper = mountSidebar({
      props: {
        mobileOpen: false,
      },
      global: {
        directives: {
          prefetch: {},
        },
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain("MENÜ");
    expect(wrapper.text()).toContain("SATIŞ & PORTFÖY");
    expect(wrapper.text()).toContain("Fırsatlar");
    expect(wrapper.text()).toContain("Doküman Kayıtları");
    const collapseToggles = wrapper.findAll('button[aria-label="Menüyü daralt"]');
    expect(collapseToggles).toHaveLength(1);
    expect(wrapper.find('[data-testid="sidebar-desktop-collapse-toggle"]').element).toBe(collapseToggles[0].element);
    expect(collapseToggles[0].attributes("title")).toBe("Menüyü daralt");
    expect(wrapper.find('footer [data-testid="sidebar-profile-trigger"]').exists()).toBe(true);
    await wrapper.find('footer [data-testid="sidebar-profile-trigger"]').trigger("click");
    const profileMenu = findLatestProfileMenu();
    expect(profileMenu).not.toBe(null);
    expect(profileMenu.querySelector('[data-testid="profile-mobile-language"]')).toBe(null);
    expect(wrapper.find('footer [data-testid="profile-mobile-language"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Acentem Takipte");
    expect(wrapper.find('p[title="Acentem Takipte"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Fırsat, poliçe, hasar ve tahsilat operasyonları");
    expect(wrapper.findAll("p").filter((node) => node.classes().includes("mt-0.5"))).toHaveLength(0);
    expect(wrapper.find("footer").findAll('button[aria-label="Menüyü daralt"]')).toHaveLength(0);
  });

  it("keeps the mobile drawer expanded when desktop collapse is persisted", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut",
      userId: "aykut",
      roles: ["AT Agent"],
    });
    useUiStore().setCollapsed(true);
    vi.stubGlobal("matchMedia", (query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const wrapper = mountSidebar({
      props: {
        mobileOpen: true,
      },
      global: {
        directives: {
          prefetch: {},
        },
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    expect(wrapper.find('[data-testid="sidebar-brand-monogram"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Acentem Takipte");
    expect(wrapper.find('[data-testid="mobile-sidebar-close"]').exists()).toBe(true);
    expect(wrapper.findAll("nav a p").length).toBeGreaterThan(0);
    expect(wrapper.find('footer [data-testid="sidebar-profile-trigger"]').exists()).toBe(true);
    await wrapper.find('footer [data-testid="sidebar-profile-trigger"]').trigger("click");
    expect(findLatestProfileMenu()).not.toBe(null);
    expect(wrapper.find('footer [data-testid="profile-mobile-language"]').exists()).toBe(false);
  });

  it("removes the modern media query listener with the matching API", () => {
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

    const wrapper = mountSidebar({
      props: { mobileOpen: false },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });
    const listener = mediaQuery.addEventListener.mock.calls[0][1];

    wrapper.unmount();

    expect(mediaQuery.addEventListener).toHaveBeenCalledWith("change", listener);
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith("change", listener);
    expect(mediaQuery.addListener).not.toHaveBeenCalled();
    expect(mediaQuery.removeListener).not.toHaveBeenCalled();
  });

  it("removes the legacy media query listener with the matching API", () => {
    const mediaQuery = {
      matches: true,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

    const wrapper = mountSidebar({
      props: { mobileOpen: false },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });
    const listener = mediaQuery.addListener.mock.calls[0][0];

    wrapper.unmount();

    expect(mediaQuery.addListener).toHaveBeenCalledWith(listener);
    expect(mediaQuery.removeListener).toHaveBeenCalledWith(listener);
    expect(mediaQuery.removeEventListener).not.toHaveBeenCalled();
  });

  it("shows alert channel settings for system managers", () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut",
      userId: "aykut",
      roles: ["System Manager"],
    });

    const wrapper = mountSidebar({
      props: {
        mobileOpen: false,
      },
      global: {
        directives: {
          prefetch: {},
        },
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain("YÖNETİM AYARLARI");
    expect(wrapper.text()).toContain("Genel Ayarlar");
    expect(wrapper.text()).toContain("Uyarı Kanal Ayarları");
  });

  it("renders English chrome labels when the locale is en", () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "en",
      user: "Aykut",
      userId: "aykut",
      roles: ["AT Agent"],
    });

    const wrapper = mountSidebar({
      props: {
        mobileOpen: false,
      },
      global: {
        directives: {
          prefetch: {},
        },
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain("MENU");
    expect(wrapper.text()).toContain("SALES & PORTFOLIO");
    expect(wrapper.text()).toContain("Leads");
    expect(wrapper.text()).toContain("Document Registry");
    expect(wrapper.findAll('button[aria-label="Collapse menu"]')).toHaveLength(1);
    expect(wrapper.find('footer [data-testid="sidebar-profile-trigger"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Acentem Takipte");
    expect(wrapper.text()).not.toContain("Lead, policy, claim, and collections operations");
    expect(wrapper.find("footer").findAll('button[aria-label="Collapse menu"]')).toHaveLength(0);
  });

  it("keeps one header toggle and no footer toggle across collapse states", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut",
      userId: "aykut",
      roles: ["AT Manager"],
    });

    const wrapper = mountSidebar({
      props: {
        mobileOpen: false,
      },
      global: {
        directives: {
          prefetch: {},
        },
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    const collapseLabel = "Menüyü daralt";
    const expandLabel = "Menüyü genişlet";

    expect(wrapper.findAll(`button[aria-label="${collapseLabel}"]`)).toHaveLength(1);
    expect(wrapper.find('[data-testid="sidebar-desktop-collapse-toggle"]').exists()).toBe(true);
    expect(wrapper.findAll(`button[aria-label="${expandLabel}"]`)).toHaveLength(0);
    expect(wrapper.find("footer").findAll(`button[aria-label="${collapseLabel}"]`)).toHaveLength(0);
    expect(wrapper.findAll("nav a p").length).toBeGreaterThan(0);

    await wrapper.find(`button[aria-label="${collapseLabel}"]`).trigger("click");
    expect(wrapper.find('[data-testid="sidebar-desktop-collapse-toggle"]').exists()).toBe(true);
    expect(wrapper.findAll(`button[aria-label="${expandLabel}"]`)).toHaveLength(1);
    expect(wrapper.find("footer").findAll(`button[aria-label="${expandLabel}"]`)).toHaveLength(0);
    expect(wrapper.findAll(`button[aria-label="${collapseLabel}"]`).length).toBe(0);
    const collapsedBrand = wrapper.find('[data-testid="sidebar-brand-monogram"]');
    expect(collapsedBrand.text()).toBe("AT");
    expect(collapsedBrand.attributes("title")).toBe("Acentem Takipte");
    expect(collapsedBrand.attributes("aria-label")).toBe("Acentem Takipte");
    expect(wrapper.findAll("nav a p").length).toBe(0);

    await wrapper.find(`button[aria-label="${expandLabel}"]`).trigger("click");
    expect(wrapper.findAll(`button[aria-label="${collapseLabel}"]`)).toHaveLength(1);
    expect(wrapper.find("footer").findAll(`button[aria-label="${collapseLabel}"]`)).toHaveLength(0);
    expect(wrapper.findAll("nav a p").length).toBeGreaterThan(0);
  });

  it("keeps the desktop toggle, navigation scroll region, and profile footer outside that region", () => {
    const wrapper = mountSidebar({
      props: { mobileOpen: false },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });

    expect(wrapper.findAll('[data-testid="sidebar-desktop-collapse-toggle"]')).toHaveLength(1);
    expect(wrapper.findAll("nav.overflow-y-auto")).toHaveLength(1);
    expect(wrapper.find("aside").classes()).not.toContain("overflow-y-auto");
    expect(wrapper.find("nav").element.contains(wrapper.find("footer").element)).toBe(false);
    expect(wrapper.find('footer [data-testid="sidebar-profile-trigger"]').exists()).toBe(true);
  });

  it("keeps the mobile profile reachable after nav scrolling and teleports its menu outside the drawer", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      media: "(min-width: 1024px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const wrapper = mountSidebar({
      props: { mobileOpen: true },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });
    const nav = wrapper.find("nav");
    const footer = wrapper.find("footer");
    const profileTrigger = footer.find('[data-testid="sidebar-profile-trigger"]');
    nav.element.scrollTop = 320;

    expect(nav.element.scrollTop).toBe(320);
    expect(nav.element.contains(profileTrigger.element)).toBe(false);
    expect(footer.element.contains(profileTrigger.element)).toBe(true);
    expect(profileTrigger.isVisible()).toBe(true);
    expect(profileTrigger.element.disabled).toBe(false);

    await profileTrigger.trigger("click");
    const profileMenu = document.body.querySelector('[data-testid="sidebar-profile-menu"]');
    expect(profileMenu).not.toBe(null);
    expect(profileMenu.parentElement).toBe(document.body);
    expect(profileMenu.closest("aside")).toBe(null);
    expect(profileMenu.classList.contains("fixed")).toBe(true);
    expect(profileMenu.parentElement.classList.contains("overflow-y-auto")).toBe(false);

    wrapper.unmount();
  });

  it("uses the 240px expanded and 76px collapsed rail contracts while preserving navigation", async () => {
    useAuthStore().applyContext({
      locale: "en",
      user: "Aykut",
      userId: "aykut",
      roles: ["System Manager"],
    });

    const wrapper = mountSidebar({
      props: { mobileOpen: false },
      global: {
        directives: { prefetch: {} },
        stubs: { RouterLink: RouterLinkStub, OfficeBranchSelect: OfficeBranchSelectStub },
      },
    });

    const aside = wrapper.find("aside");
    expect(aside.classes()).toContain("lg:w-[240px]");
    expect(wrapper.findAll("nav a").length).toBeGreaterThan(0);
    const activeLink = wrapper.get('nav a[aria-current="page"]');
    expect(activeLink.classes()).toContain("router-link-active");
    const activeHref = activeLink.attributes("href");

    await wrapper.find('[data-testid="sidebar-desktop-collapse-toggle"]').trigger("click");
    expect(aside.classes()).toContain("lg:w-[76px]");
    expect(wrapper.find('[data-testid="sidebar-brand-monogram"]').text()).toBe("AT");
    expect(wrapper.findAll("nav a").length).toBeGreaterThan(0);
    const collapsedActiveLink = wrapper.get('nav a[aria-current="page"]');
    expect(collapsedActiveLink.classes()).toContain("router-link-active");
    expect(collapsedActiveLink.attributes("href")).toBe(activeHref);
  });

  it("renders nav icons when roles are present", () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut",
      userId: "aykut",
      roles: ["AT Manager"],
    });

    const wrapper = mountSidebar({
      props: {
        mobileOpen: false,
      },
      global: {
        directives: {
          prefetch: {},
        },
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    const anchors = wrapper.findAll("nav a");
    const svgs = wrapper.findAll("nav svg");
    const shortLabels = wrapper.findAll("nav a span");
    expect(anchors.length).toBeGreaterThan(0);
    expect(svgs.length + shortLabels.length).toBeGreaterThan(0);
  });
});
