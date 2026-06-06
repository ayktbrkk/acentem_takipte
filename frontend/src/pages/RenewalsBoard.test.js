import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import RenewalsBoard from "./RenewalsBoard.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useRenewalStore } from "../stores/renewal";

const resourceQueue = [];
const routeState = reactive({ query: {} });
const routerPush = vi.fn();

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  createResource: () => resourceQueue.shift() || {
    data: ref([]),
    loading: ref(false),
    error: ref(null),
    params: {},
    reload: vi.fn(async () => []),
    submit: vi.fn(async () => ({})),
  },
}));

vi.mock("../composables/useCustomFilterPresets", () => ({
  useCustomFilterPresets: () => ({
    presetKey: ref("default"),
    presetOptions: ref([]),
    canDeletePreset: ref(false),
    applyPreset: vi.fn(),
    onPresetChange: vi.fn(),
    savePreset: vi.fn(),
    deletePreset: vi.fn(),
    persistPresetStateToServer: vi.fn(async () => {}),
    hydratePresetStateFromServer: vi.fn(async () => {}),
  }),
}));

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({ push: routerPush }),
}));

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click', $event)"><slot /></button>`,
};

const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="header" /><slot name="advanced" /></div>`,
};

describe("RenewalsBoard page store integration", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routeState.query = {};
    routerPush.mockReset();
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

  it("writes resource rows and derived summary into renewal store", async () => {
    resourceQueue.push(
      {
        data: ref([
          { name: "REN-001", policy: "POL-001", status: "Open" },
          { name: "REN-002", policy: "POL-002", status: "Done" },
          { name: "REN-003", policy: "POL-003", status: "Cancelled", lost_reason_code: "Competitor" },
        ]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
    );

    const wrapper = mount(RenewalsBoard, {
      global: {
        stubs: {
          ActionButton: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
          WorkbenchFilterToolbar: genericStub,
        },
      },
    });

    const renewalStore = useRenewalStore();
    await nextTick();

    expect(renewalStore.state.items).toHaveLength(3);
    expect(renewalStore.state.summary.total).toBe(3);
    expect(renewalStore.state.summary.open).toBe(1);
    expect(renewalStore.state.summary.done).toBe(1);
    expect(renewalStore.state.summary.cancelled).toBe(1);

    wrapper.vm.filters.query = "pol";
    await nextTick();

    expect(renewalStore.state.filters.query).toBe("pol");
  });

  it("submits renewal status mutation and reloads rows", async () => {
    const reloadMock = vi.fn(async () => [
      { name: "REN-001", policy: "POL-001", status: "Open" },
    ]);
    const submitMock = vi.fn(async () => ({ name: "REN-001" }));

    resourceQueue.push(
      {
        data: ref([{ name: "REN-001", policy: "POL-001", status: "Open" }]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: reloadMock,
      },
      {
        data: ref(null),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => null),
        submit: submitMock,
      },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(RenewalsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
          WorkbenchFilterToolbar: genericStub,
        },
      },
    });

    await wrapper.vm.updateRenewalStatus({ name: "REN-001", status: "Open" }, "In Progress");

    expect(submitMock).toHaveBeenCalledWith({
      doctype: "AT Renewal Task",
      name: "REN-001",
      data: {
        status: "In Progress",
      },
    });
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes tr-TR locale and renders localized renewal actions and filters", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      ...authStore.sessionContext,
      locale: "tr-TR",
    });

    resourceQueue.push(
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
    );

    const wrapper = mount(RenewalsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("Yeni Yenileme Görevi");
    expect(wrapper.text()).toContain("Filtreler");

    const toolbarButtons = wrapper.findAll("button");
    const filtersButton = toolbarButtons.find((button) => button.text().includes("Filtreler"));
    expect(filtersButton).toBeTruthy();
    await filtersButton.trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("Poliçe No");

    const listButton = toolbarButtons.find((button) => button.text().includes("Liste"));
    expect(listButton).toBeTruthy();
    await listButton.trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("Henüz yenileme kaydı yok.");
  });

  it("paginates renewal list at twenty rows per page", async () => {
    const rows = Array.from({ length: 21 }, (_, index) => ({
      name: `REN-${String(index + 1).padStart(3, "0")}`,
      policy: `POL-${String(index + 1).padStart(3, "0")}`,
      policy_policy_no: `POLICE-${String(index + 1).padStart(3, "0")}`,
      customer: `Customer ${index + 1}`,
      customer_full_name: `Müşteri ${index + 1}`,
      status: "Open",
    }));

    resourceQueue.push(
      {
        data: ref(rows),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => rows),
      },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(RenewalsBoard, {
      global: {
        stubs: {
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await flushPromises();
    await nextTick();

    const listButton = wrapper.findAll("button").find((button) => button.text().includes("Liste"));
    expect(listButton).toBeTruthy();
    await listButton.trigger("click");
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("20 / 21 Gösterilen kayıt");
    expect(wrapper.text()).toContain("POLICE-020");
    expect(wrapper.text()).toContain("Müşteri 20");
    expect(wrapper.text()).not.toContain("POL-021");

    const pagerButtons = wrapper.findAll("button");
    const nextButton = pagerButtons[pagerButtons.length - 1];
    await nextButton.trigger("click");
    await flushPromises();
    await nextTick();

    expect(wrapper.text()).toContain("1 / 21 Gösterilen kayıt");
    expect(wrapper.text()).toContain("POLICE-021");
    expect(wrapper.text()).toContain("Müşteri 21");
  });
});
