import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import NotificationDraftsList from "./NotificationDraftsList.vue";
import { useAuthStore } from "../stores/auth";

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => ({ path: "/notification-drafts", fullPath: "/notification-drafts", query: {}, params: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: { props: ["name"], template: `<i class="feather-icon-stub">{{ name }}</i>` },
  createResource: () => ({
    data: [],
    loading: false,
    error: null,
    params: {},
    setData: vi.fn(),
    reload: vi.fn(),
    submit: vi.fn(),
  }),
}));

describe("NotificationDraftsList", () => {
  it("renders AuxWorkbench with notification-drafts screen-key", () => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "agent@example.com",
      full_name: "Agent",
      roles: ["AT Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      capabilities: {},
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });

    const wrapper = mount(NotificationDraftsList, {
      global: {
        stubs: {
          AuxWorkbench: {
            props: ["screenKey"],
            template: '<div class="aux-workbench-stub" :data-screen-key="screenKey" />',
          },
        },
      },
    });

    const workbench = wrapper.find(".aux-workbench-stub");
    expect(workbench.exists()).toBe(true);
    expect(workbench.attributes("data-screen-key")).toBe("notification-drafts");
  });
});
