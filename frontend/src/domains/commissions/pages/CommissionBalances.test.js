import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import CommissionBalances from "./CommissionBalances.vue";
import { useAuthStore } from "../../../stores/auth";
import { useBranchStore } from "../../../stores/branch";

const resourceQueue = [];
const routeState = reactive({ query: {} });
const routerPush = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  createResource: () =>
    resourceQueue.shift() || {
      data: ref(null),
      loading: ref(false),
      error: ref(null),
      params: {},
      reload: vi.fn(async () => null),
      submit: vi.fn(async () => ({})),
    },
}));

const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="advanced" /><slot name="header" /><slot name="metrics" /><slot name="primary-filters" /></div>`,
};

const WorkbenchLayoutStub = {
  template: `<div class="workbench-stub"><slot /><slot name="actions" /><slot name="metrics" /><slot name="filters" /><slot name="default" /></div>`,
};

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click')"><slot /></button>`,
};

describe("CommissionBalances page", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routeState.query = {};
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "agent@example.com",
      full_name: "AT Agent",
      roles: ["AT Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });

    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  it("renders metric cards with summary data", async () => {
    const balancesData = ref(null);

    resourceQueue.push(
      {
        data: balancesData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => {
          balancesData.value = {
            summary: {
              total_accrued_try: 5000,
              total_paid_try: 2000,
              total_remaining_try: 3000,
            },
            total_count: 2,
            returned_count: 2,
            entities: [
              {
                entity_name: "Istanbul Merkez Acente",
                entity_type: "Agency",
                office_branch: "Istanbul",
                accrued_try: 3000,
                paid_try: 1500,
                remaining_try: 1500,
                aging: { current: 1000, "1_30": 500, "31_60": 500, "61_90": 500, "90_plus": 500 },
                policy_count: 2,
                insurance_companies: [],
              },
              {
                entity_name: "Ankara Acentesi",
                entity_type: "Agency",
                office_branch: "Ankara",
                accrued_try: 2000,
                paid_try: 500,
                remaining_try: 1500,
                aging: { current: 500, "1_30": 500, "31_60": 500, "61_90": 500, "90_plus": 0 },
                policy_count: 1,
                insurance_companies: [],
              },
            ],
            reconciliation: { open_items: 0, total_items: 0 },
          };
          return balancesData.value;
        }),
      },
      {
        data: ref(null),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => null),
      },
      {
        data: ref(null),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => null),
      },
      {
        data: ref(null),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => null),
      },
    );

    const wrapper = mount(CommissionBalances, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          WorkbenchPageLayout: WorkbenchLayoutStub,
          SaaSMetricCard: {
            props: ["label", "value", "valueClass"],
            template: `<div class="saas-metric-card-stub"><span class="label">{{ label }}</span><span class="value">{{ value }}</span></div>`,
          },
          SmartFilterBar: genericStub,
          SectionPanel: genericStub,
          ListTable: {
            props: ["columns", "rows", "loading", "emptyMessage", "locale", "clickable"],
            template: `<div class="list-table-stub"><div v-for="(row, i) in rows" :key="i" class="row">{{ row.entity_name || row.entity_display }}</div></div>`,
          },
          SkeletonLoader: true,
          SidePanel: {
            props: ["show", "title", "subtitle"],
            template: `<div v-if="show" class="side-panel-stub"><slot /></div>`,
          },
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain("Toplam Tahakkuk");
    expect(wrapper.text()).toContain("Toplam Tahsilat");
    expect(wrapper.text()).toContain("Kalan Bakiye");
  });

  it("shows empty state when no entities exist", async () => {
    const balancesData = ref(null);

    resourceQueue.push(
      {
        data: balancesData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => {
          balancesData.value = {
            summary: { total_accrued_try: 0, total_paid_try: 0, total_remaining_try: 0 },
            total_count: 0,
            returned_count: 0,
            entities: [],
            reconciliation: { open_items: 0, total_items: 0 },
          };
          return balancesData.value;
        }),
      },
      { data: ref(null), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => null) },
      { data: ref(null), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => null) },
      { data: ref(null), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => null) },
    );

    const wrapper = mount(CommissionBalances, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          WorkbenchPageLayout: WorkbenchLayoutStub,
          SaaSMetricCard: { template: `<div class="saas-metric-card-stub" />` },
          SmartFilterBar: genericStub,
          SectionPanel: genericStub,
          ListTable: true,
          SkeletonLoader: true,
          SidePanel: { template: `<div><slot /></div>` },
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain("Henüz komisyon kaydı bulunamadı");
  });

  it("shows error state when loading fails", async () => {
    const balancesData = ref(null);

    resourceQueue.push(
      {
        data: balancesData,
        loading: ref(false),
        error: ref("Failed to load"),
        params: {},
        reload: vi.fn(async () => {
          throw new Error("API error");
        }),
      },
      { data: ref(null), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => null) },
      { data: ref(null), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => null) },
      { data: ref(null), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => null) },
    );

    const wrapper = mount(CommissionBalances, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          WorkbenchPageLayout: WorkbenchLayoutStub,
          SaaSMetricCard: { template: `<div class="saas-metric-card-stub" />` },
          SmartFilterBar: genericStub,
          SectionPanel: genericStub,
          ListTable: true,
          SkeletonLoader: true,
          SidePanel: { template: `<div><slot /></div>` },
        },
      },
    });

    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain("Komisyon verileri yüklenemedi");
    expect(wrapper.text()).toContain("Tekrar Dene");
  });
});
