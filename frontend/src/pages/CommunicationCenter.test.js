import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { reactive, ref } from "vue";

import CommunicationCenter from "./CommunicationCenter.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useCommunicationStore } from "../stores/communication";

const routeState = reactive({
  query: {},
});

const routerPush = vi.fn();
const routerReplace = vi.fn();
const resourceQueue = [];

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

vi.mock("frappe-ui", () => ({
  createResource: () =>
    resourceQueue.shift() || {
      data: ref({}),
      loading: ref(false),
      error: ref(null),
      params: {},
      reload: vi.fn(async () => ({})),
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

vi.mock("../utils/sourcePanel", () => ({
  getSourcePanelConfig: vi.fn(() => null),
}));

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click')"><slot /></button>`,
};

const genericStub = {
  template:
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="advanced" /><slot name="header" /><slot name="actionsSuffix" /></div>`,
};

describe("CommunicationCenter page store integration", () => {
  beforeEach(() => {
    routeState.query = {};
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
        quickCreate: {
          communication_message: true,
        },
        actions: {
          communication: {
            runDispatchCycle: true,
            retryOutbox: true,
            sendDraftNow: true,
          },
        },
      },
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });

    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  it("writes snapshot payload and route context into communication store", async () => {
    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          outbox: [{ name: "OUT-001", status: "Queued", channel: "SMS", recipient: "5550000000" }],
          drafts: [{ name: "DRF-001", status: "Failed", channel: "Email", recipient: "a@example.com" }],
          status_breakdown: [
            { status: "Queued", total: 1 },
            { status: "Failed", total: 1 },
          ],
        })),
        submit: vi.fn(async () => ({})),
      },
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
        submit: vi.fn(async () => ({})),
      },
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
        submit: vi.fn(async () => ({})),
      },
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
        submit: vi.fn(async () => ({})),
      },
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
        submit: vi.fn(async () => ({})),
      },
    );

    routeState.query = {
      customer: "CUST-001",
      status: "Queued",
      channel: "SMS",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          DataTableShell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const communicationStore = useCommunicationStore();

    await wrapper.findAll(".action-button-stub")[0].trigger("click");

    expect(communicationStore.state.filters.customer).toBe("CUST-001");
    expect(communicationStore.state.filters.status).toBe("Queued");
    expect(communicationStore.state.filters.channel).toBe("SMS");
    expect(communicationStore.outboxItems).toHaveLength(1);
    expect(communicationStore.draftItems).toHaveLength(1);
    expect(communicationStore.statusCards.find((item) => item.status === "Queued")?.value).toBe(1);
  });
});
