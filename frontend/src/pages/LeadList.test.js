import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { reactive } from "vue";

import LeadList from "./LeadList.vue";
import { useAuthStore } from "../stores/auth";

const resourceQueue = [];
const routeState = reactive({ query: {} });
const routerPush = vi.fn();
const routerReplace = vi.fn();
const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="body-content" /></div>`,
};

function makeResource(data, reloadResult = data) {
  const resource = reactive({
    data,
    loading: false,
    error: null,
    params: {},
    reload: vi.fn(async () => reloadResult),
    submit: vi.fn(async () => ({})),
    setData: vi.fn((value) => {
      resource.data = value;
    }),
  });
  return resource;
}

vi.mock("frappe-ui", () => ({
  createResource: () => resourceQueue.shift() || makeResource([]),
  Dialog: { template: `<div><slot /><slot name="actions" /><slot name="body-content" /></div>` },
}));

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn(), push: vi.fn(), replace: vi.fn(), resolve: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
    resolve: (location) => ({ fullPath: `/at/${location?.name || "lead-list"}` }),
  }),
}));

describe("LeadList page", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routeState.query = {};
    routerPush.mockReset();
    routerReplace.mockReset();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "agent@example.com",
      full_name: "Agent",
      roles: ["Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });
  });

  it("loads rows from the validated lead schema and routes to detail", async () => {
    const leadRows = {
      rows: [
        {
          name: "LEAD-001",
          first_name: "Ayşe",
          last_name: "Yılmaz",
          status: "Open",
          phone: "05550000000",
          email: "ayse@example.com",
          creation: "2026-03-25T10:00:00Z",
        },
      ],
      total: 1,
    };

    resourceQueue.push(makeResource(leadRows, leadRows));

    const wrapper = mount(LeadList, {
      global: {
        stubs: {
          ActionButton: true,
          FilterBar: true,
          ListTable: true,
          SectionPanel: genericStub,
          SkeletonLoader: true,
          StatusBadge: true,
          WorkbenchPageLayout: genericStub,
          Dialog: genericStub,
        },
      },
    });

    expect(wrapper.vm.summary.total).toBe(1);
    expect(wrapper.vm.summary.active).toBe(1);
    expect(wrapper.vm.rows).toHaveLength(1);
    expect(wrapper.vm.rows[0].full_name).toBe("Ayşe Yılmaz");
    expect(wrapper.vm.rows[0].status_label).toBe("Açık");

    wrapper.vm.openLead("LEAD-001");
    expect(routerPush).toHaveBeenCalledWith({ name: "lead-detail", params: { name: "LEAD-001" } });
  });
});