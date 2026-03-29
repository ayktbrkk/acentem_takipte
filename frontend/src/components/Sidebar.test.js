import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import Sidebar from "./Sidebar.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useUiStore } from "../stores/ui";

const RouterLinkStub = {
  props: ["to", "title"],
  template: `<a class="router-link-stub" :href="typeof to === 'string' ? to : '#'" :title="title"><slot /></a>`,
};

describe("Sidebar", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useAuthStore().applyContext({
      user: "Aykut Yılmaz",
      userId: "aykut",
      locale: "tr",
      roles: ["Administrator"],
      defaultOfficeBranch: "IST",
      officeBranches: [{ name: "IST", is_default: true }],
      canAccessAllOfficeBranches: false,
    });
    useBranchStore().hydrateFromSession();
  });

  it("renders the localized navigation and user footer", () => {
    const wrapper = mount(Sidebar, {
      props: { mobileOpen: false },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    expect(wrapper.text()).toContain("Menü");
    expect(wrapper.text()).toContain("Genel Görünüm");
    expect(wrapper.text()).toContain("Satış ve Portföy");
    expect(wrapper.text()).toContain("Aykut Yılmaz");
  });

  it("toggles the sidebar collapsed state from the shell buttons", async () => {
    const wrapper = mount(Sidebar, {
      props: { mobileOpen: false },
      global: {
        stubs: {
          RouterLink: RouterLinkStub,
        },
      },
    });

    const uiStore = useUiStore();
    expect(wrapper.text()).toContain("Aykut Yılmaz");

    const toggleButton = wrapper.find('button[title="Kenar menüsünü daralt"]');
    expect(toggleButton.exists()).toBe(true);
    await toggleButton.trigger("click");

    expect(uiStore.sidebarCollapsed).toBe(true);
    expect(wrapper.text()).toContain("CRM");
    expect(wrapper.text()).not.toContain("Aykut Yılmaz");
  });
});
