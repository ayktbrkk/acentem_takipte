import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

import ClaimsBoard from "./ClaimsBoard.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useClaimStore } from "../stores/claim";

const resourceQueue = [];

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

    const claimStore = useClaimStore();

    await wrapper.find(".action-button-stub").trigger("click");

    expect(claimStore.state.items).toHaveLength(2);
    expect(claimStore.filteredItems).toHaveLength(2);

    const inputs = wrapper.findAll(".input");
    await inputs[0].setValue("POL-001");

    expect(claimStore.state.filters.query).toBe("POL-001");
    expect(claimStore.activeFilterCount).toBe(1);
  });
});
