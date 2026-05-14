import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import NotificationDraftDetail from "./NotificationDraftDetail.vue";
import { useAuthStore } from "../stores/auth";

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => ({ path: "/notification-drafts/DRF-001", fullPath: "/notification-drafts/DRF-001", query: {}, params: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: { props: ["name"], template: `<i class="feather-icon-stub">{{ name }}</i>` },
  createResource: () => ({
    data: {},
    loading: false,
    error: null,
    params: {},
    setData: vi.fn(),
    reload: vi.fn(),
    submit: vi.fn(),
  }),
}));

describe("NotificationDraftDetail", () => {
  it("renders AuxRecordDetail with notification-drafts screen-key and name prop", () => {
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

    const wrapper = mount(NotificationDraftDetail, {
      props: { name: "DRF-001" },
      global: {
        stubs: {
          AuxRecordDetail: {
            props: ["screenKey", "name"],
            template: '<div class="aux-record-detail-stub" :data-screen-key="screenKey" :data-name="name" />',
          },
        },
      },
    });

    const detail = wrapper.find(".aux-record-detail-stub");
    expect(detail.exists()).toBe(true);
    expect(detail.attributes("data-screen-key")).toBe("notification-drafts");
    expect(detail.attributes("data-name")).toBe("DRF-001");
  });
});
