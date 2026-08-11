import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import Topbar from "./Topbar.vue";
import { useAuthStore } from "../state/authStore";

vi.mock("frappe-ui", () => ({
  createResource: () => ({ submit: vi.fn() }),
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
  template: `<div data-testid="branch-scope-trigger">Şube Kapsamı · AT Sigorta</div>`,
};

function mountTopbar() {
  return mount(Topbar, {
    global: {
      stubs: { OfficeBranchSelect: OfficeBranchSelectStub },
    },
  });
}

describe("Topbar shell contract", () => {
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
    expect(wrapper.text()).toContain("Şube Kapsamı");

    expect(wrapper.find('button[aria-haspopup="menu"]').exists()).toBe(false);
    expect(wrapper.findAll("button").some((button) => ["TR", "EN"].includes(button.text().trim()))).toBe(false);
  });
});
