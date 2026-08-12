import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import Sidebar from "./Sidebar.vue";
import { useAuthStore } from "../state/authStore";
import { useUiStore } from "../state/uiStore";

vi.mock("frappe-ui", () => ({
  createResource: () => ({ submit: vi.fn() }),
}));

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => ({
    meta: {
      title: "Dashboard",
      section: "Overview",
    },
  }),
}));

const RouterLinkStub = {
  props: ["to", "title"],
  template: `<a :href="typeof to === 'string' ? to : to?.path || '/'" :title="title"><slot /></a>`,
};

const OfficeBranchSelectStub = {
  template: `<div class="office-branch-select-stub">Office Branch Select</div>`,
};

describe("Sidebar localization", () => {
  beforeEach(() => {
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
    vi.unstubAllGlobals();
  });

  it("renders Turkish chrome labels when the locale is tr", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut",
      userId: "aykut",
      roles: ["AT Agent"],
    });

    const wrapper = mount(Sidebar, {
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
    expect(collapseToggles[0].attributes("title")).toBe("Menüyü daralt");
    expect(wrapper.find('footer [data-testid="sidebar-profile-trigger"]').exists()).toBe(true);
    await wrapper.find('footer [data-testid="sidebar-profile-trigger"]').trigger("click");
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

    const wrapper = mount(Sidebar, {
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
    expect(wrapper.findAll("nav a p").length).toBeGreaterThan(0);
    expect(wrapper.find('footer [data-testid="sidebar-profile-trigger"]').exists()).toBe(true);
    await wrapper.find('footer [data-testid="sidebar-profile-trigger"]').trigger("click");
    expect(wrapper.find('footer [data-testid="profile-mobile-language"]').exists()).toBe(true);
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

    const wrapper = mount(Sidebar, {
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

    const wrapper = mount(Sidebar, {
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

    const wrapper = mount(Sidebar, {
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

    const wrapper = mount(Sidebar, {
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

    const wrapper = mount(Sidebar, {
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
    expect(wrapper.findAll(`button[aria-label="${expandLabel}"]`)).toHaveLength(0);
    expect(wrapper.find("footer").findAll(`button[aria-label="${collapseLabel}"]`)).toHaveLength(0);
    expect(wrapper.findAll("nav a p").length).toBeGreaterThan(0);

    await wrapper.find(`button[aria-label="${collapseLabel}"]`).trigger("click");
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

  it("renders nav icons when roles are present", () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
      user: "Aykut",
      userId: "aykut",
      roles: ["AT Manager"],
    });

    const wrapper = mount(Sidebar, {
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
