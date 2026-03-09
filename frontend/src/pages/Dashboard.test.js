import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import Dashboard from "./Dashboard.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useDashboardStore } from "../stores/dashboard";

const routeState = reactive({
  path: "/",
  query: {},
  hash: "",
});

const routerReplace = vi.fn(async (target) => {
  routeState.path = target.path || routeState.path;
  routeState.query = { ...(target.query || {}) };
  routeState.hash = target.hash || "";
});

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    replace: routerReplace,
    push: vi.fn(),
  }),
}));

vi.mock("frappe-ui", () => {
  return {
    Dialog: {
      template: `<div class="dialog-stub"><slot name="body-content" /><slot name="actions" /></div>`,
    },
    createResource: () => ({
      data: ref({}),
      loading: ref(false),
      params: {},
      reload: vi.fn(),
      submit: vi.fn(async () => ({})),
    }),
  };
});

const FilterChipButtonStub = {
  props: ["active"],
  emits: ["click"],
  template: `<button class="filter-chip-stub" :data-active="String(active)" @click="$emit('click')"><slot /></button>`,
};

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click')"><slot /></button>`,
};

const genericStub = {
  template: `<div><slot /><slot name="trailing" /></div>`,
};

describe("Dashboard page store integration", () => {
  beforeEach(() => {
    routeState.path = "/";
    routeState.query = {};
    routeState.hash = "";
    routerReplace.mockClear();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "Manager",
      roles: ["Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      capabilities: {},
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });

    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  it("syncs selected range and active tab into dashboard store", async () => {
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          Dialog: true,
          ActionToolbarGroup: genericStub,
          FilterChipButton: FilterChipButtonStub,
          ActionButton: ActionButtonStub,
          ProgressMetricRow: true,
          TrendMetricRow: true,
          EntityPreviewCard: genericStub,
          MetaListCard: genericStub,
          MiniFactList: true,
          SectionCardHeader: genericStub,
          DashboardStatCard: true,
          StatusBadge: true,
          ActionPreviewCard: genericStub,
        },
      },
    });

    const dashboardStore = useDashboardStore();

    expect(dashboardStore.state.range).toBe(30);
    expect(dashboardStore.state.activeTab).toBe("daily");

    await wrapper.findAll(".filter-chip-stub")[1].trigger("click");
    expect(dashboardStore.state.range).toBe(7);

    await wrapper.findAll(".at-tab-chip")[3].trigger("click");
    await nextTick();

    expect(routerReplace).toHaveBeenCalled();
    expect(routeState.query.tab).toBe("renewals");
    expect(dashboardStore.state.activeTab).toBe("renewals");
  });
});
