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
const routerPush = vi.fn(async (target) => target);

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    replace: routerReplace,
    push: routerPush,
  }),
}));

const resourceQueue = [];

vi.mock("frappe-ui", () => {
  return {
    Dialog: {
      template: `<div class="dialog-stub"><slot name="body-content" /><slot name="actions" /></div>`,
    },
    createResource: () => {
      const next = resourceQueue.shift() || {};
      return {
        data: ref(next.data ?? {}),
        loading: ref(next.loading ?? false),
        params: next.params ?? {},
        reload: vi.fn(),
        submit: vi.fn(async () => ({})),
      };
    },
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
    routerPush.mockClear();
    resourceQueue.length = 0;
    resourceQueue.push(
      {
        data: {
          cards: {
            total_policies: 1,
            total_gwp_try: 1000,
            total_commission: 100,
            pending_renewals: 1,
            collected_try: 0,
            payout_try: 0,
            open_claims: 1,
          },
          comparison: {},
          meta: {},
        },
      },
      { data: {} },
      { data: {} },
      { data: {} },
      { data: {} },
      { data: {} },
      {
        data: {
          summary: { total: 2, overdue: 1, due_today: 1, due_soon: 0 },
          items: [
            {
              source_type: "claim",
              source_name: "CLM-0001",
              customer: "CUST-001",
              status: "Open",
              follow_up_on: "2026-03-09",
              days_delta: 0,
            },
            {
              source_type: "renewal",
              source_name: "REN-0001",
              customer: "CUST-002",
              status: "Open",
              follow_up_on: "2026-03-08",
              days_delta: -1,
            },
          ],
        },
      },
      {
        data: {
          summary: { total: 2, overdue: 1, due_today: 1, due_soon: 0 },
          items: [
            {
              name: "TASK-0001",
              task_title: "Call customer",
              task_type: "Call",
              assigned_to: "manager@example.com",
              status: "Open",
              due_date: "2026-03-09",
            },
          ],
        },
      },
    );
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

  it("opens SLA drill-down actions and item routes", async () => {
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

    const openButtons = wrapper
      .findAll(".action-button-stub")
      .filter((node) => node.text().includes("Ac") || node.text().includes("Open"));
    expect(openButtons.length).toBeGreaterThan(0);
    await openButtons[0].trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "claims", query: { claim: "CLM-0001" } });

    const text = wrapper.text();
    expect(text).toContain("Takip SLA");
    expect(text).toContain("Hasar Masasi");
    expect(text).toContain("Yenileme Panosu");
    expect(text).toContain("Iletisim Merkezi");
  });

  it("renders my task panel and opens task detail route", async () => {
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

    expect(wrapper.text()).toContain("Benim Gorevlerim");
    expect(wrapper.text()).toContain("Call customer");
    const openButtons = wrapper
      .findAll(".action-button-stub")
      .filter((node) => node.text().includes("Ac") || node.text().includes("Open"));
    await openButtons[openButtons.length - 1].trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "tasks-detail", params: { name: "TASK-0001" } });
  });
});
