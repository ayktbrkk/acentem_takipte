import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import Sidebar from "./Sidebar.vue";
import { useAuthStore } from "../state/authStore";

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
  });

  it("renders Turkish chrome labels when the locale is tr", () => {
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
    expect(collapseToggles.length).toBeGreaterThan(0);
    expect(collapseToggles[0].attributes("title")).toBe("Menüyü daralt");
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
    expect(wrapper.findAll('button[aria-label="Collapse menu"]').length).toBeGreaterThan(0);
  });

  it("shares the same collapse state between top and footer toggles", async () => {
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

    expect(wrapper.findAll(`button[aria-label="${collapseLabel}"]`).length).toBe(2);
    expect(wrapper.findAll("nav a p").length).toBeGreaterThan(0);

    await wrapper.findAll(`button[aria-label="${collapseLabel}"]`)[1].trigger("click");
    expect(wrapper.findAll(`button[aria-label="${expandLabel}"]`).length).toBe(2);
    expect(wrapper.findAll(`button[aria-label="${collapseLabel}"]`).length).toBe(0);
    expect(wrapper.findAll("nav a p").length).toBe(0);

    await wrapper.findAll(`button[aria-label="${expandLabel}"]`)[0].trigger("click");
    expect(wrapper.findAll(`button[aria-label="${collapseLabel}"]`).length).toBe(2);
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
