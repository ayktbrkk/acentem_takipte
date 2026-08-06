import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
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

const pageStubs = {
  ActionButton: ActionButtonStub,
  WorkbenchPageLayout: WorkbenchLayoutStub,
  SaaSMetricCard: { template: `<div class="saas-metric-card-stub" />` },
  SmartFilterBar: genericStub,
  SectionPanel: genericStub,
  ListTable: true,
  SkeletonLoader: true,
  SidePanel: {
    props: ["show", "title", "subtitle"],
    template: `<div v-if="show" class="side-panel-stub"><slot /></div>`,
  },
};

function defaultResource() {
  return {
    data: ref(null),
    loading: ref(false),
    error: ref(null),
    params: {},
    reload: vi.fn(async () => null),
  };
}

function importResultResource(result) {
  const data = ref(null);
  return {
    data,
    loading: ref(false),
    error: ref(null),
    params: {},
    reload: vi.fn(async () => {
      data.value = result;
      return result;
    }),
  };
}

function importResources(importResult) {
  return [
    defaultResource(),
    importResultResource({
      summary: { total_rows: 1, matched_rows: 1, mismatched_rows: 0, unmatched_rows: 0 },
      rows: [{ policy_no: "34567890", external_ref: "DEC-001", amount_try: 1000 }],
    }),
    importResultResource(importResult),
    defaultResource(),
    defaultResource(),
    defaultResource(),
  ];
}

function clickActionButton(wrapper, text) {
  const button = wrapper
    .findAll("button.action-button-stub")
    .find((b) => b.text().includes(text));
  return button.trigger("click");
}

async function mountCommissionPage(resources) {
  resourceQueue.push(...resources);
  const wrapper = mount(CommissionBalances, {
    global: { stubs: pageStubs },
  });
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
  return wrapper;
}

async function openImportDialog(wrapper) {
  await clickActionButton(wrapper, "Ekstre Yükle");
  await nextTick();
}

async function runImport(wrapper, csvText) {
  await wrapper.find("textarea").setValue(csvText);
  await nextTick();
  // The import action is disabled until a preview succeeds, mirroring the
  // product flow: preview first, then import.
  await clickActionButton(wrapper, "Önizle");
  await flushPromises();
  await clickActionButton(wrapper, "İçe Aktar");
  await flushPromises();
}

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

  it("shows locked-period warning when import skipped locked rows", async () => {
    const wrapper = await mountCommissionPage(
      importResources({
        imported: 2,
        skipped: 1,
        skipped_locked: 3,
        open_items: 0,
        missing_external: { generated: 0 },
      }),
    );
    await openImportDialog(wrapper);
    await runImport(wrapper, "policy_no,amount_try,external_ref\n34567890,1000.00,DEC-001");

    expect(wrapper.text()).toContain("Kilitli komisyon dönemi nedeniyle bazı satırlar atlandı.");
    expect(wrapper.text()).toContain("Ekstre başarıyla içe aktarıldı.");
  });

  it("hides locked-period warning when no locked rows were skipped", async () => {
    const wrapper = await mountCommissionPage(
      importResources({
        imported: 2,
        skipped: 1,
        skipped_locked: 0,
        open_items: 0,
        missing_external: { generated: 0 },
      }),
    );
    await openImportDialog(wrapper);
    await runImport(wrapper, "policy_no,amount_try,external_ref\n34567890,1000.00,DEC-001");

    expect(wrapper.text()).not.toContain("Kilitli komisyon dönemi nedeniyle bazı satırlar atlandı.");
    expect(wrapper.text()).toContain("Ekstre başarıyla içe aktarıldı.");
  });

  it("clears locked-period warning when the dialog is reopened", async () => {
    const wrapper = await mountCommissionPage(
      importResources({
        imported: 2,
        skipped: 0,
        skipped_locked: 3,
        open_items: 0,
        missing_external: { generated: 0 },
      }),
    );
    await openImportDialog(wrapper);
    await runImport(wrapper, "policy_no,amount_try,external_ref\n34567890,1000.00,DEC-001");
    expect(wrapper.text()).toContain("Kilitli komisyon dönemi nedeniyle bazı satırlar atlandı.");

    await clickActionButton(wrapper, "Kapat");
    await nextTick();
    await openImportDialog(wrapper);

    expect(wrapper.text()).not.toContain("Kilitli komisyon dönemi nedeniyle bazı satırlar atlandı.");
  });
});
