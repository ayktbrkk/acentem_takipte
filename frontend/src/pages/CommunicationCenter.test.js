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
const routerBack = vi.fn();
const resourceQueue = [];

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
    back: routerBack,
  }),
}));

vi.mock("frappe-ui", () => ({
  Dialog: {
    name: "Dialog",
    props: ["modelValue", "options"],
    template: `<div class="frappe-ui-dialog-stub"><slot name="body-content" /></div>`,
  },
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

const DialogStub = {
  props: ["modelValue"],
  template: `<div class="dialog-stub"><slot name="body-content" /></div>`,
};

const QuickCreateManagedDialogStub = {
  props: ["modelValue", "configKey", "beforeOpen"],
  template: `<div class="quick-create-managed-dialog-stub" :data-config-key="configKey"></div>`,
};

describe("CommunicationCenter page store integration", () => {
  beforeEach(() => {
    routeState.query = {};
    routerPush.mockReset();
    routerReplace.mockReset();
    routerBack.mockReset();
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
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
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
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
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

  it("opens call note dialog with route-aware prefill", async () => {
    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          outbox: [],
          drafts: [],
          status_breakdown: [],
        })),
        submit: vi.fn(async () => ({})),
      },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
    );

    routeState.query = {
      customer: "CUST-001",
      reference_doctype: "AT Claim",
      reference_name: "CLM-001",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const dialog = wrapper
      .findAllComponents(QuickCreateManagedDialogStub)
      .find((item) => item.props("configKey") === "call_note");
    expect(dialog?.exists()).toBe(true);

    const beforeOpen = dialog.props("beforeOpen");
    const form = {};
    await beforeOpen({ form });

    expect(form.customer).toBe("CUST-001");
    expect(form.claim).toBe("CLM-001");
    expect(typeof form.note_at).toBe("string");
  });

  it("opens reminder dialog with route-aware prefill", async () => {
    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          outbox: [],
          drafts: [],
          status_breakdown: [],
        })),
        submit: vi.fn(async () => ({})),
      },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
    );

    routeState.query = {
      customer: "CUST-001",
      reference_doctype: "AT Policy",
      reference_name: "POL-001",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const dialog = wrapper
      .findAllComponents(QuickCreateManagedDialogStub)
      .find((item) => item.props("configKey") === "reminder");
    expect(dialog?.exists()).toBe(true);

    const beforeOpen = dialog.props("beforeOpen");
    const form = {};
    await beforeOpen({ form });

    expect(form.customer).toBe("CUST-001");
    expect(form.source_doctype).toBe("AT Policy");
    expect(form.source_name).toBe("POL-001");
    expect(form.policy).toBe("POL-001");
    expect(typeof form.remind_at).toBe("string");
  });

  it("renders segment and campaign quick dialogs", async () => {
    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          outbox: [],
          drafts: [],
          status_breakdown: [],
        })),
        submit: vi.fn(async () => ({})),
      },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
    );

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const dialogKeys = wrapper
      .findAllComponents(QuickCreateManagedDialogStub)
      .map((dialog) => dialog.props("configKey"));

    expect(dialogKeys).toContain("segment");
    expect(dialogKeys).toContain("campaign");
    expect(dialogKeys).toContain("call_note");
    expect(dialogKeys).toContain("reminder");
  });

  it("loads segment member preview", async () => {
    const previewSubmit = vi.fn(async () => ({
      summary: {
        matched_count: 2,
        preview_count: 2,
        has_more: false,
      },
      customers: [
        {
          name: "CUST-001",
          full_name: "Aykut K.",
          active_policy_count: 2,
          has_overdue_installment: true,
          in_renewal_window: true,
        },
      ],
    }));

    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          outbox: [],
          drafts: [],
          status_breakdown: [],
        })),
        submit: vi.fn(async () => ({})),
      },
      // runCycleResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // sendDraftResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // retryOutboxResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // auxMutationResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // communicationQuickTemplateResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // communicationQuickCustomerResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // communicationQuickPolicyResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // communicationQuickClaimResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // communicationQuickSegmentResource (used by segment preview select)
      {
        data: ref([{ name: "SEG-001", segment_name: "Renewal Risk", channel_focus: "WHATSAPP" }]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
        submit: vi.fn(async () => ({})),
      },
      // communicationQuickCampaignResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // segmentPreviewResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: previewSubmit },
      // campaignRunResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
    );

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="segment-preview-select"]').setValue("SEG-001");
    await wrapper.get('[data-testid="segment-preview-submit"]').trigger("click");

    expect(previewSubmit).toHaveBeenCalledWith({
      segment_name: "SEG-001",
      limit: 20,
    });
    expect(wrapper.text()).toContain("Eşleşen Müşteriler");
    expect(wrapper.text()).toContain("Aykut K.");
  });

  it("runs campaign execution and renders result summary", async () => {
    const snapshotReload = vi.fn(async () => ({
      outbox: [],
      drafts: [],
      status_breakdown: [],
    }));
    const campaignSubmit = vi.fn(async () => ({
      campaign: "CAMP-001",
      created: 3,
      skipped: 1,
      matched_customers: 4,
    }));

    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: snapshotReload,
        submit: vi.fn(async () => ({})),
      },
      // runCycleResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // sendDraftResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // retryOutboxResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // auxMutationResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // communicationQuickTemplateResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // communicationQuickCustomerResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // communicationQuickPolicyResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // communicationQuickClaimResource
      { data: ref([]), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => []), submit: vi.fn(async () => ({})) },
      // communicationQuickSegmentResource
      {
        data: ref([{ name: "SEG-001", segment_name: "Renewal Risk", channel_focus: "WHATSAPP" }]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
        submit: vi.fn(async () => ({})),
      },
      // communicationQuickCampaignResource (used by campaign run select)
      {
        data: ref([{ name: "CAMP-001", campaign_name: "March Renewal", channel: "WHATSAPP" }]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
        submit: vi.fn(async () => ({})),
      },
      // segmentPreviewResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      // campaignRunResource
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: campaignSubmit },
    );

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.get('[data-testid="campaign-run-select"]').setValue("CAMP-001");
    await wrapper.get('[data-testid="campaign-run-submit"]').trigger("click");

    expect(campaignSubmit).toHaveBeenCalledWith({
      campaign_name: "CAMP-001",
      limit: 200,
    });
    expect(snapshotReload).toHaveBeenCalled();
    expect(wrapper.text()).toContain("Üretilen Taslaklar");
    expect(wrapper.text()).toContain("3");
  });

  it("closes assignment context from context action", async () => {
    const snapshotReload = vi.fn(async () => ({
      outbox: [],
      drafts: [],
      status_breakdown: [],
    }));
    const auxSubmit = vi.fn(async () => ({}));

    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: snapshotReload, submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: auxSubmit },
    );

    routeState.query = {
      reference_doctype: "AT Ownership Assignment",
      reference_name: "ASN-001",
      reference_label: "Atama",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Atamayı Kapat"));
    await button.trigger("click");

    expect(auxSubmit).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: {
        status: "Done",
      },
    });
    expect(snapshotReload).toHaveBeenCalled();
  });

  it("starts assignment context from context action", async () => {
    const snapshotReload = vi.fn(async () => ({
      outbox: [],
      drafts: [],
      status_breakdown: [],
    }));
    const auxSubmit = vi.fn(async () => ({}));

    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: snapshotReload, submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: auxSubmit },
    );

    routeState.query = {
      reference_doctype: "AT Ownership Assignment",
      reference_name: "ASN-001",
      reference_label: "Atama",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Atamayı İşleme Al"));
    await button.trigger("click");

    expect(auxSubmit).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: {
        status: "In Progress",
      },
    });
    expect(snapshotReload).toHaveBeenCalled();
  });

  it("blocks assignment context from context action", async () => {
    const snapshotReload = vi.fn(async () => ({
      outbox: [],
      drafts: [],
      status_breakdown: [],
    }));
    const auxSubmit = vi.fn(async () => ({}));

    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: snapshotReload, submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: auxSubmit },
    );

    routeState.query = {
      reference_doctype: "AT Ownership Assignment",
      reference_name: "ASN-001",
      reference_label: "Atama",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Atamayı Bloke Et"));
    await button.trigger("click");

    expect(auxSubmit).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: {
        status: "Blocked",
      },
    });
    expect(snapshotReload).toHaveBeenCalled();
  });

  it("clears call note follow-up from context action", async () => {
    const snapshotReload = vi.fn(async () => ({
      outbox: [],
      drafts: [],
      status_breakdown: [],
    }));
    const auxSubmit = vi.fn(async () => ({}));

    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: snapshotReload, submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: auxSubmit },
    );

    routeState.query = {
      reference_doctype: "AT Call Note",
      reference_name: "CALL-001",
      reference_label: "Arama Notu",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Arama Takibini Temizle"));
    await button.trigger("click");

    expect(auxSubmit).toHaveBeenCalledWith({
      doctype: "AT Call Note",
      name: "CALL-001",
      data: {
        next_follow_up_on: null,
      },
    });
    expect(snapshotReload).toHaveBeenCalled();
  });

  it("completes reminder from context action", async () => {
    const snapshotReload = vi.fn(async () => ({
      outbox: [],
      drafts: [],
      status_breakdown: [],
    }));
    const auxSubmit = vi.fn(async () => ({}));

    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: snapshotReload, submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: auxSubmit },
    );

    routeState.query = {
      reference_doctype: "AT Reminder",
      reference_name: "REM-001",
      reference_label: "Hatırlatıcı",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Hatırlatıcıyı Tamamla"));
    await button.trigger("click");

    expect(auxSubmit).toHaveBeenCalledWith({
      doctype: "AT Reminder",
      name: "REM-001",
      data: {
        status: "Done",
      },
    });
    expect(snapshotReload).toHaveBeenCalled();
  });

  it("cancels reminder from context action", async () => {
    const snapshotReload = vi.fn(async () => ({
      outbox: [],
      drafts: [],
      status_breakdown: [],
    }));
    const auxSubmit = vi.fn(async () => ({}));

    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: snapshotReload, submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: auxSubmit },
    );

    routeState.query = {
      reference_doctype: "AT Reminder",
      reference_name: "REM-001",
      reference_label: "Hatırlatıcı",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("İptal"));
    await button.trigger("click");

    expect(auxSubmit).toHaveBeenCalledWith({
      doctype: "AT Reminder",
      name: "REM-001",
      data: {
        status: "Cancelled",
      },
    });
    expect(snapshotReload).toHaveBeenCalled();
  });

  it("returns to source context when return_to is provided", async () => {
    const snapshotReload = vi.fn(async () => ({
      outbox: [],
      drafts: [],
      status_breakdown: [],
    }));

    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: snapshotReload, submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
    );

    routeState.query = {
      reference_doctype: "AT Reminder",
      reference_name: "REM-001",
      reference_label: "Hatırlatıcı",
      return_to: "/at/aux-workbench?screen=reminders",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Kaynaga Don"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith("/at/aux-workbench?screen=reminders");
  });

  it("shows return button even without context filters", async () => {
    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
    );

    routeState.query = {
      return_to: "/at/customers/CUST-001",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Kaynaga Don"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith("/at/customers/CUST-001");
  });

  it("falls back to router back when return_to is missing but context filters exist", async () => {
    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
    );

    routeState.query = {
      customer: "CUST-001",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Geri"));
    await button.trigger("click");

    expect(routerBack).toHaveBeenCalled();
  });

  it("falls back to router back when return_to is not a safe path", async () => {
    resourceQueue.push(
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
      { data: ref({}), loading: ref(false), error: ref(null), params: {}, reload: vi.fn(async () => ({})), submit: vi.fn(async () => ({})) },
    );

    routeState.query = {
      customer: "CUST-001",
      return_to: "https://example.com",
    };

    const wrapper = mount(CommunicationCenter, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableCell: genericStub,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          Dialog: DialogStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const button = wrapper.findAll(".action-button-stub").find((item) => item.text().includes("Geri"));
    await button.trigger("click");

    expect(routerBack).toHaveBeenCalled();
  });
});
