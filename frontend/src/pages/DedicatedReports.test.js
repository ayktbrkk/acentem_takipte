import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";

import PremiumReport from "./PremiumReport.vue";
import ClaimRatioReport from "./ClaimRatioReport.vue";
import AgentPerformanceReport from "./AgentPerformanceReport.vue";
import CustomerSegmentationReport from "./CustomerSegmentationReport.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const routeState = reactive({
  name: "premium-report",
  meta: {
    title: { tr: "Prim Raporu", en: "Premium Report" },
    section: { tr: "Kontrol Merkezi", en: "Control Center" },
  },
  query: {},
});

const frappeRequestMock = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  frappeRequest: (...args) => frappeRequestMock(...args),
}));

vi.mock("../composables/useCustomFilterPresets", () => ({
  useCustomFilterPresets: () => ({
    presetKey: { value: "default" },
    presetOptions: { value: [] },
    canDeletePreset: { value: false },
    applyPreset: vi.fn(),
    onPresetChange: vi.fn(),
    savePreset: vi.fn(),
    deletePreset: vi.fn(),
  }),
}));

const workbenchStub = {
  props: ["breadcrumb", "title", "subtitle"],
  template: `<div><span class="breadcrumb">{{ breadcrumb }}</span><h1>{{ title }}</h1><slot /></div>`,
};

const actionButtonStub = {
  props: ["disabled"],
  emits: ["click"],
  template: `<button type="button" :disabled="disabled" @click="$emit('click', $event)"><slot /></button>`,
};

const pageCases = [
  {
    name: "PremiumReport",
    component: PremiumReport,
    routeName: "premium-report",
    trTitle: "Prim Raporu",
    enTitle: "Premium Report",
    trBreadcrumb: "Kontrol Merkezi → Prim Raporu",
    reportMethod: "get_policy_list_report",
  },
  {
    name: "ClaimRatioReport",
    component: ClaimRatioReport,
    routeName: "claim-ratio-report",
    trTitle: "Hasar Oranı Raporu",
    enTitle: "Claim Ratio Report",
    trBreadcrumb: "Kontrol Merkezi → Hasar Oranı Raporu",
    reportMethod: "get_claim_loss_ratio_report",
  },
  {
    name: "AgentPerformanceReport",
    component: AgentPerformanceReport,
    routeName: "agent-performance-report",
    trTitle: "Temsilci Performans Raporu",
    enTitle: "Agent Performance Report",
    trBreadcrumb: "Kontrol Merkezi → Temsilci Performans Raporu",
    reportMethod: "get_agent_performance_report",
  },
  {
    name: "CustomerSegmentationReport",
    component: CustomerSegmentationReport,
    routeName: "customer-segmentation-report",
    trTitle: "Müşteri Segmentasyon Raporu",
    enTitle: "Customer Segmentation Report",
    trBreadcrumb: "Kontrol Merkezi → Müşteri Segmentasyon Raporu",
    reportMethod: "get_customer_segmentation_report",
  },
];

async function settleReport() {
  await flushPromises();
  await vi.advanceTimersByTimeAsync(350);
  await flushPromises();
  await nextTick();
}

describe.each(pageCases)("$name dedicated report page", (pageCase) => {
  beforeEach(() => {
    vi.useFakeTimers();
    routeState.name = pageCase.routeName;
    routeState.meta = {
      title: { tr: pageCase.trTitle, en: pageCase.enTitle },
      section: { tr: "Kontrol Merkezi", en: "Control Center" },
    };
    routeState.query = {};
    frappeRequestMock.mockReset();
    frappeRequestMock.mockResolvedValue({ message: { columns: [], rows: [] } });
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "AT Manager",
      roles: ["AT Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
      capabilities: {},
    });

    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders route-specific Turkish header copy", async () => {
    const wrapper = mount(pageCase.component, {
      global: {
        stubs: {
          ActionButton: actionButtonStub,
          WorkbenchPageLayout: workbenchStub,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    expect(wrapper.text()).toContain(pageCase.trTitle);
    expect(wrapper.text()).toContain(pageCase.trBreadcrumb);
    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining(pageCase.reportMethod),
      }),
    );
  });

  it("renders route-specific English header copy", async () => {
    const authStore = useAuthStore();
    authStore.setLocale("en");

    const wrapper = mount(pageCase.component, {
      global: {
        stubs: {
          ActionButton: actionButtonStub,
          WorkbenchPageLayout: workbenchStub,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    expect(wrapper.text()).toContain(pageCase.enTitle);
    expect(wrapper.text()).toContain(`Control Center → ${pageCase.enTitle}`);
  });
});
