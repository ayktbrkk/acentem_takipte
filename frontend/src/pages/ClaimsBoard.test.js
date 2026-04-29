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
const routerPush = vi.fn();

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  createResource: () => {
    const fallback = {
      data: ref([]),
      loading: ref(false),
      error: ref(null),
      params: {},
      reload: vi.fn(async () => []),
      submit: vi.fn(async () => ({})),
    };

    const resource = resourceQueue.shift() || fallback;

    if (resource?.reload && !resource.reload.__wrapped) {
      const originalReload = resource.reload;
      const wrappedReload = vi.fn(async (...args) => {
        const result = await originalReload(...args);
        if (resource?.data && typeof resource.data === "object" && "value" in resource.data) {
          resource.data.value = result;
        } else {
          resource.data = result;
        }
        return result;
      });
      wrappedReload.__wrapped = true;
      resource.reload = wrappedReload;
    }

    if (resource?.submit && !resource.submit.__wrapped) {
      const originalSubmit = resource.submit;
      const wrappedSubmit = vi.fn(async (...args) => originalSubmit(...args));
      wrappedSubmit.__wrapped = true;
      resource.submit = wrappedSubmit;
    }

    return resource;
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
  template:
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="advanced" /></div>`,
};

async function settleAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

function findButtonByText(wrapper, text) {
  return wrapper.findAll("button").find((button) => button.text().includes(text));
}

async function loadClaimRows(wrapper) {
  const refreshButton = findButtonByText(wrapper, "Yenile");

  await refreshButton.trigger("click");
  await settleAsyncWork();
}

describe("ClaimsBoard page store integration", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routeState.query = {};
    routerPush.mockReset();
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
        reload: vi.fn(async () => [
          { name: "ASN-001", source_name: "CLM-001", status: "Open", assigned_to: "agent@example.com" },
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

    await loadClaimRows(wrapper);

    expect(claimStore.state.items).toHaveLength(2);
    expect(claimStore.filteredItems).toHaveLength(2);
    expect(wrapper.text()).toContain("Toplam Hasar");
    expect(wrapper.text()).toContain("Dosya Görüntüle");
    expect(wrapper.text()).toContain("Ödeme Yap");

    const searchInput = wrapper.find('input[type="text"]');
    await searchInput.setValue("POL-001");
    await settleAsyncWork();

    expect(wrapper.text()).toContain("POL-001");
    expect(wrapper.text()).not.toContain("POL-002");
  });

  it("opens claim detail from row action", async () => {
    const reloadMock = vi.fn(async () => [
      { name: "CLM-001", claim_no: "H-001", policy: "POL-001", claim_status: "Open", approved_amount: 1000, paid_amount: 0 },
    ]);
    const submitMock = vi.fn(async () => ({ name: "CLM-001" }));
    const originalLocation = window.location;
    delete window.location;
    window.location = { assign: vi.fn(), href: "" };

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
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
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

    await loadClaimRows(wrapper);
    const fileButton = findButtonByText(wrapper, "Dosya Görüntüle");
    await fileButton.trigger("click");

    expect(window.location.assign).toHaveBeenCalledWith("/at/claims/CLM-001");
    expect(submitMock).not.toHaveBeenCalled();
    window.location = originalLocation;
  });

  it("opens payment page for approved unpaid claim", async () => {
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
      {
        name: "CLM-002",
        claim_no: "H-002",
        policy: "POL-002",
        claim_status: "Approved",
        approved_amount: 1200,
        paid_amount: 200,
      },
    ]);
    const submitMock = vi.fn(async () => ({ name: "CLM-001" }));
    const originalLocation = window.location;
    delete window.location;
    window.location = { assign: vi.fn(), href: "" };

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
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
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

    await loadClaimRows(wrapper);
    const paymentButtons = wrapper.findAll("button").filter((button) => button.text().includes("Ödeme Yap"));
    expect(paymentButtons).toHaveLength(2);
    expect(paymentButtons[0].attributes("disabled")).toBeDefined();
    expect(paymentButtons[1].attributes("disabled")).toBeUndefined();

    await paymentButtons[1].trigger("click");

    expect(window.location.assign).toHaveBeenCalledWith("/at/payments?policy=POL-002&query=H-002");
    expect(submitMock).not.toHaveBeenCalled();
    window.location = originalLocation;
  });

  it("does not navigate to payment page for ineligible claim", async () => {
    const reloadMock = vi.fn(async () => [
      { name: "CLM-001", claim_no: "H-001", policy: "POL-001", claim_status: "Open", approved_amount: 1000, paid_amount: 0 },
    ]);
    const submitMock = vi.fn(async () => ({ name: "CLM-001" }));
    const originalLocation = window.location;
    delete window.location;
    window.location = { assign: vi.fn(), href: "" };

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
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
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

    await loadClaimRows(wrapper);

    const paymentButton = findButtonByText(wrapper, "Ödeme Yap");
    expect(paymentButton.attributes("disabled")).toBeDefined();
    await paymentButton.trigger("click");

    expect(window.location.assign).not.toHaveBeenCalled();
    expect(submitMock).not.toHaveBeenCalled();
    window.location = originalLocation;
  });

  it("does not render a row-level documents action", async () => {
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
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
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

    await loadClaimRows(wrapper);

    const documentsButton = findButtonByText(wrapper, "Dokümanlar");
    expect(documentsButton).toBeUndefined();
    expect(window.location.assign).not.toHaveBeenCalled();

    window.location = originalLocation;
  });

  it("keeps file and payment actions available", async () => {
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
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []) },
    );

    const wrapper = mount(ClaimsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          AmountPairSummary: true,
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

    await loadClaimRows(wrapper);

    const fileButton = findButtonByText(wrapper, "Dosya Görüntüle");
    const paymentButton = findButtonByText(wrapper, "Ödeme Yap");
    expect(fileButton).toBeTruthy();
    expect(paymentButton).toBeTruthy();

    window.location = originalLocation;
  });
});
