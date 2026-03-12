import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { reactive, ref } from "vue";

import ClaimsBoard from "./ClaimsBoard.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useClaimStore } from "../stores/claim";

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
  useRoute: () => routeState,
}));

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click')"><slot /></button>`,
};

const genericStub = {
  template:
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="advanced" /></div>`,
};

describe("ClaimsBoard page store integration", () => {
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

  it("reloads rows into claim store and keeps filter state reactive", async () => {
    resourceQueue.push(
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => [
          { name: "CLM-001", claim_no: "H-001", policy: "POL-001", claim_status: "Open", approved_amount: 1000, paid_amount: 0 },
          { name: "CLM-002", claim_no: "H-002", policy: "POL-002", claim_status: "Paid", approved_amount: 1200, paid_amount: 1200 },
        ]),
      },
      {
        data: ref(null),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => null),
        submit: vi.fn(async () => ({ name: "CLM-001" })),
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
        reload: vi.fn(async () => [
          { name: "ASN-001", source_name: "CLM-001", status: "Open", assigned_to: "agent@example.com" },
        ]),
      },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
          DataTableShell: genericStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: true,
        },
      },
    });

    const claimStore = useClaimStore();

    await wrapper.find(".action-button-stub").trigger("click");
    await Promise.resolve();
    await Promise.resolve();

    expect(claimStore.state.items).toHaveLength(2);
    expect(claimStore.filteredItems).toHaveLength(2);
    expect(wrapper.text()).toContain("Atama: 1 / 1 acik / agent@example.com");

    const inputs = wrapper.findAll(".input");
    await inputs[0].setValue("POL-001");

    expect(claimStore.state.filters.query).toBe("POL-001");
    expect(claimStore.activeFilterCount).toBe(1);
  });

  it("submits claim status mutation and reloads rows", async () => {
    const reloadMock = vi.fn(async () => [
      { name: "CLM-001", claim_no: "H-001", policy: "POL-001", claim_status: "Open", approved_amount: 1000, paid_amount: 0 },
    ]);
    const submitMock = vi.fn(async () => ({ name: "CLM-001" }));

    resourceQueue.push(
      {
        data: ref([]),
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
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
          DataTableShell: genericStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: true,
        },
      },
    });

    const buttons = wrapper.findAll(".action-button-stub");
    await buttons[1].trigger("click");

    expect(submitMock).toHaveBeenCalledWith({
      doctype: "AT Claim",
      name: "CLM-001",
      data: {
        claim_status: "Under Review",
      },
    });
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("clears claim follow-up date and reloads rows", async () => {
    const reloadMock = vi.fn(async () => [
      {
        name: "CLM-001",
        claim_no: "H-001",
        policy: "POL-001",
        claim_status: "Open",
        approved_amount: 1000,
        paid_amount: 0,
        next_follow_up_on: "2026-03-10",
      },
    ]);
    const submitMock = vi.fn(async () => ({ name: "CLM-001" }));

    resourceQueue.push(
      {
        data: ref([]),
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
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
          DataTableShell: genericStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: true,
        },
      },
    });

    const clearButton = wrapper.findAll(".action-button-stub").find((button) => button.text().includes("Takibi Temizle"));
    await clearButton.trigger("click");

    expect(submitMock).toHaveBeenCalledWith({
      doctype: "AT Claim",
      name: "CLM-001",
      data: {
        next_follow_up_on: null,
      },
    });
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("submits rejected status with rejection reason", async () => {
    const reloadMock = vi.fn(async () => [
      { name: "CLM-001", claim_no: "H-001", policy: "POL-001", claim_status: "Open", approved_amount: 1000, paid_amount: 0 },
    ]);
    const submitMock = vi.fn(async () => ({ name: "CLM-001" }));
    const promptMock = vi.spyOn(window, "prompt").mockReturnValue("Eksik evrak");

    resourceQueue.push(
      {
        data: ref([]),
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
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
          DataTableShell: genericStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: true,
        },
      },
    });

    const buttons = wrapper.findAll(".action-button-stub");
    await buttons[4].trigger("click");

    expect(promptMock).toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledWith({
      doctype: "AT Claim",
      name: "CLM-001",
      data: {
        claim_status: "Rejected",
        rejection_reason: "Eksik evrak",
        appeal_status: "",
      },
    });

    promptMock.mockRestore();
  });

  it("opens communication center with return_to for claim notifications", async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { assign: vi.fn(), href: "" };
    routeState.fullPath = "/at/claims?claim=CLM-001";

    resourceQueue.push(
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => [
          { name: "CLM-001", claim_no: "H-001", policy: "POL-001", claim_status: "Open", approved_amount: 1000, paid_amount: 0 },
        ]),
      },
      {
        data: ref(null),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => null),
        submit: vi.fn(async () => ({})),
      },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
          DataTableShell: genericStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: true,
        },
      },
    });

    const notificationsButton = wrapper.findAll(".action-button-stub").find((button) => button.text().includes("Bildirimler"));
    await notificationsButton.trigger("click");

    expect(window.location.assign).toHaveBeenCalledWith(
      "/at/communication?reference_doctype=AT+Claim&reference_name=CLM-001&return_to=%2Fat%2Fclaims%3Fclaim%3DCLM-001"
    );

    window.location = originalLocation;
  });

  it("opens filtered files panel for claim documents", async () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { assign: vi.fn(), href: "" };

    resourceQueue.push(
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => [
          { name: "CLM-001", claim_no: "H-001", policy: "POL-001", claim_status: "Open", approved_amount: 1000, paid_amount: 0 },
        ]),
      },
      {
        data: ref(null),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => null),
        submit: vi.fn(async () => ({})),
      },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
          DataTableShell: genericStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: true,
        },
      },
    });

    const documentsButton = wrapper.findAll(".action-button-stub").find((button) => button.text().includes("Dokumanlar"));
    await documentsButton.trigger("click");

    expect(window.location.assign).toHaveBeenCalledWith("/at/files?attached_to_doctype=AT+Claim&attached_to_name=CLM-001");

    window.location = originalLocation;
  });
});

