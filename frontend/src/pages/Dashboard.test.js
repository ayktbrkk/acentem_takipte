import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

vi.mock("vue", async () => {
  const actual = await vi.importActual("vue");
  return {
    ...actual,
    defineAsyncComponent: () => ({
      name: "DashboardAsyncStub",
      template: `<div class="dashboard-async-stub"></div>`,
    }),
  };
});

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
  createRouter: () => ({
    beforeEach: vi.fn(),
  }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    replace: routerReplace,
    push: routerPush,
  }),
}));

const resourceQueue = [];

vi.mock("frappe-ui", () => {
  return {
    FeatherIcon: {
      props: ["name"],
      template: `<i class="feather-icon-stub">{{ name }}</i>`,
    },
    Dialog: {
      template: `<div class="dialog-stub"><slot name="body-content" /><slot name="actions" /></div>`,
    },
    createResource: () => {
      const next = resourceQueue.shift() || {};
      return {
        data: ref(next.data ?? {}),
        loading: ref(next.loading ?? false),
        params: next.params ?? {},
        reload: next.reload ?? vi.fn(),
        submit: next.submit ?? vi.fn(async () => ({})),
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
  template: `<button class="action-button-stub" @click="$emit('click', $event)"><slot /></button>`,
};

const SectionPanelStub = {
  props: ["title", "count", "meta", "showCount"],
  template: `
    <section class="section-panel-stub">
      <div class="section-panel-header">
        <h3>{{ title }}</h3>
        <span v-if="meta">{{ meta }}</span>
        <span v-else-if="showCount !== false && count != null">{{ count }}</span>
        <slot name="trailing" />
      </div>
      <slot />
    </section>
  `,
};

const MetaListCardStub = {
  props: ["title", "description", "meta"],
  emits: ["click"],
  template: `
    <button class="meta-list-card-stub" type="button" @click="$emit('click', $event)">
      <div class="meta-title">{{ title }}</div>
      <div class="meta-desc">{{ description }}</div>
      <div class="meta-meta">{{ meta }}</div>
      <slot />
      <slot name="trailing" />
    </button>
  `,
};

const EntityPreviewCardStub = {
  props: ["title"],
  emits: ["click"],
  template: `
    <button class="entity-preview-card-stub" type="button" @click="$emit('click', $event)">
      <div class="entity-title">{{ title }}</div>
      <slot />
      <slot name="trailing" />
    </button>
  `,
};

const ActionPreviewCardStub = {
  props: ["title", "description"],
  emits: ["click"],
  template: `
    <button class="action-preview-card-stub" type="button" @click="$emit('click', $event)">
      <div class="action-title">{{ title }}</div>
      <div class="action-description">{{ description }}</div>
      <slot />
      <slot name="trailing" />
    </button>
  `,
};

const MetricQuickCardStub = {
  props: ["title", "value", "trendText"],
  template: `<div class="dashboard-stat-card-stub"><div>{{ title }}</div><div>{{ value }}</div><div>{{ trendText }}</div></div>`,
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
      // 1) kpiResource
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
      // 2) followUpResource
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
      // 3) myTasksResource
      {
        data: {
          summary: { total: 2, overdue: 1, due_today: 1, due_soon: 0 },
          items: [
            {
              name: "TASK-0001",
              task_title: "Call customer",
              task_type: "Call",
              source_doctype: "AT Lead",
              assigned_to: "manager@example.com",
              status: "Open",
              due_date: "2026-03-09",
            },
          ],
        },
      },
      // 4) myActivitiesResource
      {
        data: {
          summary: { total: 1, logged: 1, shared: 0, archived: 0 },
          items: [
            {
              name: "ACT-0001",
              activity_title: "Customer follow-up call",
              activity_type: "Call",
              assigned_to: "manager@example.com",
              status: "Logged",
              activity_at: "2026-03-09",
            },
          ],
        },
      },
      // 5) myRemindersResource
      {
        data: {
          summary: { total: 1, overdue: 0, due_today: 1, due_soon: 0 },
          items: [
            {
              name: "REM-0001",
              reminder_title: "Send quote reminder",
              customer: "CUST-001",
              source_doctype: "AT Offer",
              status: "Open",
              priority: "Normal",
              remind_at: "2026-03-09 10:00:00",
            },
          ],
        },
      },
      // 6) myTaskMutationResource
      { data: {} },
      // 7) leadListResource
      { data: {} },
      // 8) renewalTaskResource
      { data: {} },
      // 9) policyListResource
      { data: {} },
      // 10) offerListResource
      { data: {} },
      // 11) paymentPreviewResource
      { data: {} },
      // 12) reconciliationPreviewResource
      { data: {} },
      // 13) dashboardTabPayloadResource
      { data: {} },
      // 14) createLeadResource
      { data: {} },
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
          EntityPreviewCard: EntityPreviewCardStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: true,
          SectionPanel: SectionPanelStub,
          MetricQuickCard: MetricQuickCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    const dashboardStore = useDashboardStore();
    await flushPromises();
    await nextTick();

    expect(dashboardStore.state.range).toBe(30);
    expect(dashboardStore.state.activeTab).toBe("daily");

    wrapper.vm.applyRange(7);
    await nextTick();
    expect(dashboardStore.state.range).toBe(7);

    await wrapper.findAll(".at-tab-chip")[3].trigger("click");
    await nextTick();

    expect(routerReplace).toHaveBeenCalled();
    expect(routeState.query.tab).toBe("renewals");
    expect(dashboardStore.state.activeTab).toBe("renewals");
  });

  it("returns to daily tab when dashboard query tab is cleared", async () => {
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          Dialog: true,
          ActionToolbarGroup: genericStub,
          FilterChipButton: FilterChipButtonStub,
          ActionButton: ActionButtonStub,
          ProgressMetricRow: true,
          TrendMetricRow: true,
          EntityPreviewCard: EntityPreviewCardStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: true,
          SectionPanel: SectionPanelStub,
          MetricQuickCard: MetricQuickCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    const dashboardStore = useDashboardStore();
    await flushPromises();
    await nextTick();

    await wrapper.findAll(".at-tab-chip")[3].trigger("click");
    await nextTick();

    expect(routeState.query.tab).toBe("renewals");
    expect(dashboardStore.state.activeTab).toBe("renewals");

    await wrapper.findAll(".at-tab-chip")[0].trigger("click");
    await nextTick();

    expect(routeState.query.tab).toBeUndefined();
    expect(dashboardStore.state.activeTab).toBe("daily");
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
          EntityPreviewCard: EntityPreviewCardStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: true,
          SectionPanel: SectionPanelStub,
          MetricQuickCard: MetricQuickCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    wrapper.vm.openFollowUpItem({ source_type: "claim", source_name: "CLM-0001" });
    expect(routerPush).toHaveBeenCalledWith({ name: "claims-board", query: { claim: "CLM-0001" } });

    const text = wrapper.text();
    expect(text).toContain("Takip");
    expect(text).toContain("Merkezi");
  });

  it("renders localized dashboard copy for sales, collections, and renewals", async () => {
    routeState.query = { tab: "sales" };

    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          Dialog: true,
          ActionToolbarGroup: genericStub,
          FilterChipButton: FilterChipButtonStub,
          ActionButton: ActionButtonStub,
          ProgressMetricRow: true,
          TrendMetricRow: true,
          EntityPreviewCard: EntityPreviewCardStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: true,
          SectionPanel: SectionPanelStub,
          MetricQuickCard: MetricQuickCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    let text = wrapper.text();
    expect(text).toContain("Satış Panosu");
    expect(text).toContain("Fırsat, teklif ve poliçe üretimini satış odağında izleyin.");
    expect(text).toContain("Satışlar");

    await wrapper.findAll(".at-tab-chip")[2].trigger("click");
    await nextTick();
    await flushPromises();

    text = wrapper.text();
    expect(text).toContain("Tahsilat Panosu");
    expect(text).toContain("Tahsilat, ödeme ve mutabakat akışlarını tek ekranda yönetin.");
    expect(text).toContain("Tahsilatlar");

    await wrapper.findAll(".at-tab-chip")[3].trigger("click");
    await nextTick();
    await flushPromises();

    text = wrapper.text();
    expect(text).toContain("Yenileme Panosu");
    expect(text).toContain("Yaklaşan bitişler ve yenileme görevlerini önceliklendirin.");
    expect(text).toContain("Yenilemeler");
  });

  it("renders my task panel and opens task detail route", async () => {
    routeState.query = { tab: "sales" };
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          Dialog: true,
          ActionToolbarGroup: genericStub,
          FilterChipButton: FilterChipButtonStub,
          ActionButton: ActionButtonStub,
          ProgressMetricRow: true,
          TrendMetricRow: true,
          EntityPreviewCard: EntityPreviewCardStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: true,
          SectionPanel: SectionPanelStub,
          MetricQuickCard: MetricQuickCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("Satış Panosu");
    wrapper.vm.openSalesActionItem({ kind: "task", name: "TASK-0001" });
    expect(routerPush).toHaveBeenCalledWith({ name: "tasks-detail", params: { name: "TASK-0001" } });
  });

  it("renders my activity panel and opens activity detail route", async () => {
    routeState.query = { tab: "daily" };
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          Dialog: true,
          ActionToolbarGroup: genericStub,
          FilterChipButton: FilterChipButtonStub,
          ActionButton: ActionButtonStub,
          ProgressMetricRow: true,
          TrendMetricRow: true,
          EntityPreviewCard: EntityPreviewCardStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: true,
          SectionPanel: SectionPanelStub,
          MetricQuickCard: MetricQuickCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("Sigorta Kontrol Merkezi");
    wrapper.vm.openActivityItem({ name: "ACT-0001" });
    expect(routerPush).toHaveBeenCalledWith({ name: "activities-detail", params: { name: "ACT-0001" } });
  });

  it("renders my reminder panel and opens reminder detail route", async () => {
    routeState.query = { tab: "sales" };
    const wrapper = mount(Dashboard, {
      global: {
        stubs: {
          Dialog: true,
          ActionToolbarGroup: genericStub,
          FilterChipButton: FilterChipButtonStub,
          ActionButton: ActionButtonStub,
          ProgressMetricRow: true,
          TrendMetricRow: true,
          EntityPreviewCard: EntityPreviewCardStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: true,
          SectionPanel: SectionPanelStub,
          MetricQuickCard: MetricQuickCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("Satış Panosu");
    wrapper.vm.openSalesActionItem({ kind: "reminder", name: "REM-0001" });
    expect(routerPush).toHaveBeenCalledWith({ name: "reminders-detail", params: { name: "REM-0001" } });
  });

});
