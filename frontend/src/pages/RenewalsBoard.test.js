import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import RenewalsBoard from "./RenewalsBoard.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useRenewalStore } from "../stores/renewal";

const resourceQueue = [];
const routeState = reactive({ query: {} });

vi.mock("frappe-ui", () => ({
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
}));

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click')"><slot /></button>`,
};

const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="header" /><slot name="advanced" /></div>`,
};

describe("RenewalsBoard page store integration", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routeState.query = {};
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
          DataTableShell: genericStub,
          DocSummaryGrid: true,
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

    const inputs = wrapper.findAll(".input");
    await inputs[0].setValue("pol");

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
          DataTableShell: genericStub,
          DocSummaryGrid: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
          WorkbenchFilterToolbar: genericStub,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Takibe Al"));
    await button.trigger("click");

    expect(submitMock).toHaveBeenCalledWith({
      doctype: "AT Renewal Task",
      name: "REN-001",
      data: {
        status: "In Progress",
      },
    });
    expect(reloadMock).toHaveBeenCalledTimes(2);
  });
});
