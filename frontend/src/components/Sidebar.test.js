import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import Sidebar from "./Sidebar.vue";
import { useAuthStore } from "../stores/auth";

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
      roles: ["Agent"],
    });

    const wrapper = mount(Sidebar, {
      props: {
        mobileOpen: false,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain("MENÜ");
    expect(wrapper.text()).toContain("GENEL GÖRÜNÜM");
    expect(wrapper.text()).toContain("Pano");
    expect(wrapper.text()).toContain("Fırsatlar");
    expect(wrapper.text()).toContain("Acil Erişim Talebi");
    expect(wrapper.text()).toContain("Kenar Menüsünü Daralt");
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
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain("Yönetim Ayarları");
    expect(wrapper.text()).toContain("Genel Ayarlar");
    expect(wrapper.text()).toContain("Uyarı Kanal Ayarları");
  });

  it("renders English chrome labels when the locale is en", () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "en",
      user: "Aykut",
      userId: "aykut",
      roles: ["Agent"],
    });

    const wrapper = mount(Sidebar, {
      props: {
        mobileOpen: false,
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
          OfficeBranchSelect: OfficeBranchSelectStub,
        },
      },
    });

    expect(wrapper.text()).toContain("MENU");
    expect(wrapper.text()).toContain("OVERVIEW");
    expect(wrapper.text()).toContain("Dashboard");
    expect(wrapper.text()).toContain("Leads");
    expect(wrapper.text()).toContain("Break-Glass Request");
    expect(wrapper.text()).toContain("Collapse Sidebar");
  });
});
