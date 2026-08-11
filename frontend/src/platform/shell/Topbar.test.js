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
    ["tr", "TR", "Hesabım", "Çıkış Yap", "Desk'i Aç"],
    ["en", "EN", "My Account", "Logout", "Open Desk"],
  ])("keeps branch scope and current account controls in %s", async (locale, localeLabel, account, logout, desk) => {
    const authStore = useAuthStore();
    authStore.applyContext({
      locale,
      user: "Aykut Yılmaz",
      userId: "aykut",
      roles: ["AT Manager"],
      office_branches: [{ name: "HQ", office_branch_name: "AT Sigorta", is_default: 1 }],
    });

    const wrapper = mountTopbar();
    expect(wrapper.find('[data-testid="branch-scope-trigger"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("Şube Kapsamı");

    const localeButton = wrapper.findAll("button").find((button) => button.text() === localeLabel);
    expect(localeButton).toBeTruthy();

    const accountButton = wrapper.find('button[aria-haspopup="menu"]');
    expect(accountButton.exists()).toBe(true);
    await accountButton.trigger("click");
    expect(wrapper.text()).toContain(account);
    expect(wrapper.text()).toContain(logout);
    expect(wrapper.text()).toContain(desk);
  });
});
