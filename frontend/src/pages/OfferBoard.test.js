import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import OfferBoard from "./OfferBoard.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const routeState = reactive({
  path: "/app/offer-board",
  query: {},
  hash: "",
});

const routerPush = vi.fn(async (target) => target);
const routerReplace = vi.fn(async (target) => {
  routeState.path = target.path || routeState.path;
  routeState.query = { ...(target.query || {}) };
  routeState.hash = target.hash || "";
});

const resourceQueue = [];

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  Dialog: {
    name: "Dialog",
    props: ["modelValue", "options"],
    template: `<div class="dialog-stub"><slot name="body-content" /><slot name="actions" /></div>`,
  },
  createResource: () =>
    resourceQueue.shift() || {
      data: ref([]),
      loading: ref(false),
      error: ref(null),
      params: {},
      reload: vi.fn(async () => []),
      submit: vi.fn(async () => ({})),
      setData: vi.fn(),
    },
}));

vi.mock("../utils/listExport", () => ({
  openListExport: vi.fn(),
}));

const WorkbenchPageLayoutStub = {
  props: ["breadcrumb", "title", "subtitle", "recordCount", "recordCountLabel"],
  template: `
    <div class="workbench-layout-stub">
      <slot name="actions" />
      <slot name="metrics" />
      <slot />
    </div>
  `,
};

const QuickCreateOfferStub = {
  props: ["modelValue", "titleOverride", "subtitleOverride"],
  emits: ["update:modelValue", "cancel", "created"],
  template: `
    <div class="quick-create-offer-stub" :data-open="String(modelValue)" :data-title="titleOverride" :data-subtitle="subtitleOverride">
      <button type="button" @click="$emit('update:modelValue', false)">close</button>
    </div>
  `,
};

const OfferBoardFilterSectionStub = {
  props: ["search", "title", "count", "filters", "activeCount"],
  emits: ["update:search", "filter-change", "reset"],
  template: `<div class="offer-board-filter-stub"><slot name="actions" /></div>`,
};

const OfferBoardListSectionStub = {
  template: `<div class="offer-board-list-stub"></div>`,
};

const OfferBoardPipelineSectionStub = {
  template: `<div class="offer-board-pipeline-stub"></div>`,
};

const OfferBoardConvertDialogStub = {
  props: ["modelValue", "title", "error", "selectedOfferName", "loading", "hasSelectedOffer"],
  emits: ["update:modelValue", "confirm"],
  template: `<div class="offer-board-convert-stub" :data-open="String(modelValue)" :data-selected="selectedOfferName"></div>`,
};

function makeResource({ data = [], reloadResult = data, submitResult = {}, loading = false, error = null } = {}) {
  const dataRef = ref(data);
  return reactive({
    data: dataRef,
    loading: ref(loading),
    error: ref(error),
    params: {},
    reload: vi.fn(async () => reloadResult),
    submit: vi.fn(async () => submitResult),
    setData: vi.fn((value) => {
      dataRef.value = value;
    }),
  });
}

function pushDefaultResources({ offerLookup = null } = {}) {
  resourceQueue.push(
    makeResource({ data: [] }),
    makeResource({ submitResult: {} }),
    makeResource({ submitResult: {} }),
    makeResource({ data: [{ name: "IST", branch_name: "Istanbul" }] }),
    makeResource({ data: [{ name: "SIG-1", company_name: "Sigma" }] }),
    makeResource({ data: [{ name: "SALE-1", full_name: "Sales Agent" }] }),
    makeResource({ data: [], reloadResult: [] }),
    makeResource({ submitResult: { offer: "OFR-001" } }),
    makeResource({
      data: offerLookup || { name: "OFR-001", status: "Sent", converted_policy: null, net_premium: 1000 },
      reloadResult: offerLookup || { name: "OFR-001", status: "Sent", converted_policy: null, net_premium: 1000 },
    }),
    makeResource({ data: [], reloadResult: [] }),
    makeResource({ reloadResult: 0 }),
    makeResource({ submitResult: {} }),
    makeResource({ submitResult: {} }),
  );
}

describe("OfferBoard page integration", () => {
  beforeEach(() => {
    routeState.path = "/app/offer-board";
    routeState.query = {};
    routeState.hash = "";
    routerPush.mockReset();
    routerReplace.mockReset();
    resourceQueue.length = 0;
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "Manager",
      roles: ["Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      capabilities: {
        quickCreate: { offer: true },
      },
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });

    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  it("toggles list and board sections from the toolbar", async () => {
    pushDefaultResources();
    const wrapper = mount(OfferBoard, {
      global: {
        stubs: {
          WorkbenchPageLayout: WorkbenchPageLayoutStub,
          OfferBoardFilterSection: OfferBoardFilterSectionStub,
          OfferBoardListSection: OfferBoardListSectionStub,
          OfferBoardPipelineSection: OfferBoardPipelineSectionStub,
          OfferBoardConvertDialog: OfferBoardConvertDialogStub,
          QuickCreateOffer: QuickCreateOfferStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    expect(wrapper.find(".offer-board-list-stub").exists()).toBe(true);
    expect(wrapper.find(".offer-board-pipeline-stub").exists()).toBe(false);

  const boardButton = wrapper.findAll("button").find((button) => button.text().includes("Pano"));
    expect(boardButton).toBeTruthy();
    await boardButton.trigger("click");
    await nextTick();

    expect(wrapper.find(".offer-board-list-stub").exists()).toBe(false);
    expect(wrapper.find(".offer-board-pipeline-stub").exists()).toBe(true);
  });

  it("opens the quick offer dialog from the route intent and strips the query", async () => {
    routeState.query = {
      quick_create: "1",
      prefill_customer: "ACME",
      return_to: "/app/customer/ACME",
    };
    pushDefaultResources();
    const wrapper = mount(OfferBoard, {
      global: {
        stubs: {
          WorkbenchPageLayout: WorkbenchPageLayoutStub,
          OfferBoardFilterSection: OfferBoardFilterSectionStub,
          OfferBoardListSection: OfferBoardListSectionStub,
          OfferBoardPipelineSection: OfferBoardPipelineSectionStub,
          OfferBoardConvertDialog: OfferBoardConvertDialogStub,
          QuickCreateOffer: QuickCreateOfferStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    const dialog = wrapper.find(".quick-create-offer-stub");
    expect(dialog.attributes("data-open")).toBe("true");
    expect(routerReplace).toHaveBeenCalled();
    expect(routeState.query.quick_create).toBeUndefined();
    expect(routeState.query.prefill_customer).toBeUndefined();
  });

  it("opens the convert dialog from the route intent and strips the query", async () => {
    routeState.query = { convert_offer: "OFR-001" };
    pushDefaultResources({
      offerLookup: { name: "OFR-001", status: "Sent", converted_policy: null, net_premium: 1400 },
    });
    const wrapper = mount(OfferBoard, {
      global: {
        stubs: {
          WorkbenchPageLayout: WorkbenchPageLayoutStub,
          OfferBoardFilterSection: OfferBoardFilterSectionStub,
          OfferBoardListSection: OfferBoardListSectionStub,
          OfferBoardPipelineSection: OfferBoardPipelineSectionStub,
          OfferBoardConvertDialog: OfferBoardConvertDialogStub,
          QuickCreateOffer: QuickCreateOfferStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    const dialog = wrapper.find(".offer-board-convert-stub");
    expect(dialog.attributes("data-open")).toBe("true");
    expect(dialog.attributes("data-selected")).toBe("OFR-001");
    expect(routerReplace).toHaveBeenCalled();
    expect(routeState.query.convert_offer).toBeUndefined();
  });

  it("triggers list export from the toolbar", async () => {
    pushDefaultResources();
    const { openListExport } = await import("../utils/listExport");
    const wrapper = mount(OfferBoard, {
      global: {
        stubs: {
          WorkbenchPageLayout: WorkbenchPageLayoutStub,
          OfferBoardFilterSection: OfferBoardFilterSectionStub,
          OfferBoardListSection: OfferBoardListSectionStub,
          OfferBoardPipelineSection: OfferBoardPipelineSectionStub,
          OfferBoardConvertDialog: OfferBoardConvertDialogStub,
          QuickCreateOffer: QuickCreateOfferStub,
        },
      },
    });

    await flushPromises();
    await nextTick();

    await wrapper.vm.downloadOfferExport("xlsx");

    expect(openListExport).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "offer_list",
        format: "xlsx",
      })
    );
  });
});
