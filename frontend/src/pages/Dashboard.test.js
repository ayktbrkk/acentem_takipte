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

const ActionPreviewCardStub = {
  props: ["title", "description"],
  emits: ["click"],
  template: `
    <button class="action-preview-card-stub" type="button" @click="$emit('click', $event)">
      <div class="action-title">{{ title }}</div>
      <div class="action-desc">{{ description }}</div>
      <slot />
    </button>
  `,
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

const DashboardStatCardStub = {
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
              assigned_to: "manager@example.com",
              status: "Open",
              due_date: "2026-03-09",
              source_doctype: "AT Lead",
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
              status: "Open",
              priority: "Normal",
              remind_at: "2026-03-09 10:00:00",
              source_doctype: "AT Offer",
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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    const dashboardStore = useDashboardStore();

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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    const followUpCard = wrapper
      .findAll(".meta-list-card-stub")
      .find((node) => node.text().includes("CLM-0001"));
    await followUpCard.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "claims-board", query: { claim: "CLM-0001" } });

    const text = wrapper.text();
    expect(text).toContain("Takip");
    expect(text).toContain("Hasar Panosu");
    expect(text).toContain("Yenileme Panosu");
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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    let text = wrapper.text();
    expect(text).toContain("Fırsat Süreci");
    expect(text).toContain("Toplam Brüt Prim");
    expect(text).not.toContain("Hazır Teklifler:");

    await routerReplace({ path: "/", query: { tab: "collections" } });
    await nextTick();

    text = wrapper.text();
    expect(text).toContain("Bugün Vadesi Gelen Tahsilat");
    expect(text).toContain("Bugün Tahsilat Tutarı");
    expect(text).toContain("Gecikmiş Tahsilat");
    expect(text).toContain("Gecikmiş Tutar");
    expect(text).not.toContain("(TRY)");

    await routerReplace({ path: "/", query: { tab: "renewals" } });
    await nextTick();

    text = wrapper.text();
    expect(text).toContain("Bekleyen Yenileme");
    expect(text).toContain("Teklif Bekleyen Yenileme");
    expect(text).toContain("Yenileme Durum Özeti");
    expect(text).toContain("Geciken Yenilemeler");
    expect(text).toContain("7 Gün İçinde Yenilenecekler");
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
          EntityPreviewCard: EntityPreviewCardStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: true,
          SectionPanel: SectionPanelStub,
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    expect(wrapper.text()).toContain("Bugün Yapılacaklar");
    expect(wrapper.text()).toContain("Call customer");
    const taskCard = wrapper.findAll(".meta-list-card-stub").find((node) => node.text().includes("Call customer"));
    await taskCard.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "tasks-detail", params: { name: "TASK-0001" } });
  });

  it("renders my activity panel and opens activity detail route", async () => {
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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    expect(wrapper.text()).toContain("Son Aktiviteler");
    expect(wrapper.text()).toContain("Customer follow-up call");
    const activityCard = wrapper
      .findAll(".meta-list-card-stub")
      .find((node) => node.text().includes("Customer follow-up call"));
    await activityCard.trigger("click");
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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    expect(wrapper.text()).toContain("Müşteri Aday Aksiyonu");
    expect(wrapper.text()).toContain("Send quote reminder");
    const reminderCard = wrapper.findAll(".meta-list-card-stub").find((node) => node.text().includes("Send quote reminder"));
    await reminderCard.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "reminders-detail", params: { name: "REM-0001" } });
  });

  it("opens claims quick action route", async () => {
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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    const claimQuickAction = wrapper.findAll(".action-preview-card-stub").find((node) => node.text().includes("Hasar Panosu"));
    await claimQuickAction.trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/claims");
  });

  it("opens communication quick action route", async () => {
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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    const communicationQuickAction = wrapper.findAll(".action-preview-card-stub").find((node) => node.text().includes("İletişim Merkezi"));
    await communicationQuickAction.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ path: "/communication", query: { return_to: "/" } });
  });

  it("opens renewal quick action route", async () => {
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
          DashboardStatCard: DashboardStatCardStub,
          StatusBadge: true,
          ActionPreviewCard: ActionPreviewCardStub,
        },
      },
    });

    const renewalQuickAction = wrapper.findAll(".action-preview-card-stub").find((node) => node.text().includes("Yenileme Panosu"));
    await renewalQuickAction.trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/renewals");
  });
});
