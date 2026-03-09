import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";

import Reports from "./Reports.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const routeState = reactive({
  query: {},
});

const routerReplace = vi.fn();
const frappeRequestMock = vi.fn();

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    replace: routerReplace,
  }),
}));

vi.mock("frappe-ui", () => ({
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

const genericStub = {
  template:
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="header" /><slot name="advanced" /><slot name="actionsSuffix" /></div>`,
};

const actionButtonStub = {
  emits: ["click"],
  template: `<button type="button" @click="$emit('click')"><slot /></button>`,
};

describe("Reports page communication operations report", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    routeState.query = {};
    routerReplace.mockReset();
    frappeRequestMock.mockReset();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "Manager",
      roles: ["Manager"],
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

  it("loads communication operations report and renders summary", async () => {
    frappeRequestMock.mockResolvedValueOnce({
      message: {
        columns: ["campaign_name", "matched_customer_count", "sent_count", "sent_outbox_count"],
        rows: [
          {
            campaign_name: "March Renewal",
            matched_customer_count: 4,
            sent_count: 3,
            sent_outbox_count: 2,
          },
        ],
      },
    });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ActionButton: true,
          DataTableShell: genericStub,
          PageToolbar: genericStub,
          WorkbenchFilterToolbar: genericStub,
          ScheduledReportsManager: true,
        },
      },
    });

    await nextTick();

    const reportSelect = wrapper.find("select");
    await reportSelect.setValue("communication_operations");
    await vi.advanceTimersByTimeAsync(350);
    await nextTick();

    expect(frappeRequestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("get_communication_operations_report"),
      }),
    );
    expect(wrapper.text()).toContain("Iletisim Operasyonlari");
    expect(wrapper.text()).toContain("Eslesen Musteri");
    expect(wrapper.text()).toContain("March Renewal");
  });

  it("loads reconciliation operations report and renders summary", async () => {
    frappeRequestMock.mockResolvedValueOnce({
      message: {
        columns: ["accounting_entry", "status", "difference_try", "resolution_action"],
        rows: [
          {
            accounting_entry: "ACC-001",
            status: "Open",
            difference_try: 1250,
            resolution_action: "Match",
          },
        ],
      },
    });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ActionButton: true,
          DataTableShell: genericStub,
          PageToolbar: genericStub,
          WorkbenchFilterToolbar: genericStub,
          ScheduledReportsManager: true,
        },
      },
    });

    await nextTick();

    const reportSelect = wrapper.find("select");
    await reportSelect.setValue("reconciliation_operations");
    await vi.advanceTimersByTimeAsync(350);
    await nextTick();

    expect(frappeRequestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("get_reconciliation_operations_report"),
      }),
    );
    expect(wrapper.text()).toContain("Mutabakat Operasyonlari");
    expect(wrapper.text()).toContain("Acik Mutabakat");
    expect(wrapper.text()).toContain("ACC-001");
  });

  it("loads claims operations report and renders summary", async () => {
    frappeRequestMock.mockResolvedValueOnce({
      message: {
        columns: ["claim_no", "claim_status", "sent_outbox_count", "assigned_expert"],
        rows: [
          {
            claim_no: "CLM-001",
            claim_status: "Rejected",
            sent_outbox_count: 2,
            assigned_expert: "EXP-22",
          },
        ],
      },
    });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ActionButton: true,
          DataTableShell: genericStub,
          PageToolbar: genericStub,
          WorkbenchFilterToolbar: genericStub,
          ScheduledReportsManager: true,
        },
      },
    });

    await nextTick();

    const reportSelect = wrapper.find("select");
    await reportSelect.setValue("claims_operations");
    await vi.advanceTimersByTimeAsync(350);
    await nextTick();

    expect(frappeRequestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("get_claims_operations_report"),
      }),
    );
    expect(wrapper.text()).toContain("Hasar Operasyonlari");
    expect(wrapper.text()).toContain("Reddedilen Hasar");
    expect(wrapper.text()).toContain("CLM-001");
  });

  it("loads previous period comparison for operations reports when date range is set", async () => {
    frappeRequestMock
      .mockResolvedValueOnce({
        message: {
          columns: ["campaign_name", "matched_customer_count", "sent_count", "sent_outbox_count"],
          rows: [
            {
              campaign_name: "April Renewal",
              matched_customer_count: 8,
              sent_count: 6,
              sent_outbox_count: 5,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        message: {
          columns: ["campaign_name", "matched_customer_count", "sent_count", "sent_outbox_count"],
          rows: [
            {
              campaign_name: "March Renewal",
              matched_customer_count: 5,
              sent_count: 4,
              sent_outbox_count: 3,
            },
          ],
        },
      });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ActionButton: true,
          DataTableShell: genericStub,
          PageToolbar: genericStub,
          WorkbenchFilterToolbar: genericStub,
          ScheduledReportsManager: true,
        },
      },
    });

    await nextTick();

    const reportSelect = wrapper.find("select");
    await reportSelect.setValue("communication_operations");
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue("2026-04-01");
    await dateInputs[1].setValue("2026-04-07");
    await vi.advanceTimersByTimeAsync(350);
    await nextTick();

    expect(frappeRequestMock).toHaveBeenCalledTimes(2);
    expect(frappeRequestMock.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: expect.stringContaining("get_communication_operations_report"),
        params: expect.objectContaining({
          filters: expect.stringContaining('"from_date":"2026-03-25"'),
        }),
      }),
    );
    expect(wrapper.text()).toContain("Donem Kiyaslamasi");
    expect(wrapper.text()).toContain("+3 / 5");
  });

  it("triggers customer segment snapshot admin job for desk users", async () => {
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "admin@example.com",
      full_name: "Admin",
      roles: ["System Manager"],
      preferred_home: "/app",
      interface_mode: "desk",
      locale: "tr",
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: true,
      capabilities: {},
    });

    frappeRequestMock.mockResolvedValue({ message: { columns: [], rows: [] } });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ActionButton: actionButtonStub,
          DataTableShell: genericStub,
          PageToolbar: genericStub,
          WorkbenchFilterToolbar: genericStub,
          ScheduledReportsManager: genericStub,
        },
      },
    });

    await nextTick();

    const trigger = wrapper.findAll("button").find((node) => node.text().includes("Snapshotlari Calistir"));
    await trigger.trigger("click");

    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job",
        method: "POST",
        params: expect.objectContaining({ limit: 250 }),
      }),
    );
  });
});
