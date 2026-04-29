import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";

import Reports from "./Reports.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const routeState = reactive({
  query: {},
});

const routerReplace = vi.fn();
const routerPush = vi.fn();
const frappeRequestMock = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    replace: routerReplace,
    push: routerPush,
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

const genericStub = {
  props: ["error"],
  template:
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="header" /><slot name="advanced" /><slot name="actionsSuffix" /><div v-if="error">{{ error }}</div></div>`,
};

const actionButtonStub = {
  props: ["disabled"],
  emits: ["click"],
  template: `<button type="button" :disabled="disabled" @click="$emit('click', $event)"><slot /></button>`,
};

const scheduledManagerStub = {
  emits: ["run", "save", "remove"],
  template: `
    <div>
      <button type="button" data-testid="scheduled-run" @click="$emit('run')">Run Scheduled</button>
      <button type="button" data-testid="scheduled-save" @click="$emit('save', { index: '', config: { title: 'Weekly', report_key: 'policy_list' } })">Save Scheduled</button>
      <button type="button" data-testid="scheduled-remove" @click="$emit('remove', '0')">Remove Scheduled</button>
    </div>
  `,
};

const storageState = new Map();

const commonStubs = {
  ActionButton: actionButtonStub,
  PageToolbar: genericStub,
  WorkbenchFilterToolbar: genericStub,
};

async function settleReport({ advanceTimers = true } = {}) {
  await flushPromises();
  if (advanceTimers) {
    await vi.advanceTimersByTimeAsync(350);
    await flushPromises();
  }
  await nextTick();
}

describe("Reports page communication operations report", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    routeState.query = {};
    routerReplace.mockReset();
    routerPush.mockReset();
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

    storageState.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn((key) => (storageState.has(key) ? storageState.get(key) : null)),
        setItem: vi.fn((key, value) => {
          storageState.set(key, String(value));
        }),
        removeItem: vi.fn((key) => {
          storageState.delete(key);
        }),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads communication operations report and renders summary", async () => {
    frappeRequestMock.mockResolvedValue({
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
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const reportSelect = wrapper.find("select");
    await reportSelect.setValue("communication_operations");
    await settleReport();

    expect(frappeRequestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("get_communication_operations_report"),
      }),
    );
    expect(wrapper.text()).toContain("İletişim Operasyonları");
    expect(wrapper.text()).toContain("Eşleşen Müşteri");
    expect(wrapper.text()).toContain("March Renewal");
  });

  it("loads reconciliation operations report and renders summary", async () => {
    frappeRequestMock.mockResolvedValue({
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
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const reportSelect = wrapper.find("select");
    await reportSelect.setValue("reconciliation_operations");
    await settleReport();

    expect(frappeRequestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("get_reconciliation_operations_report"),
      }),
    );
    expect(wrapper.text()).toContain("Mutabakat Operasyonları");
    expect(wrapper.text()).toContain("Açık Mutabakat");
    expect(wrapper.text()).toContain("ACC-001");
  });

  it("loads claims operations report and renders summary", async () => {
    frappeRequestMock.mockResolvedValue({
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
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const reportSelect = wrapper.find("select");
    await reportSelect.setValue("claims_operations");
    await settleReport();

    expect(frappeRequestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("get_claims_operations_report"),
      }),
    );
    expect(wrapper.text()).toContain("Hasar Operasyonları");
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
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const reportSelect = wrapper.find("select");
    await reportSelect.setValue("communication_operations");
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0].setValue("2026-04-01");
    await dateInputs[1].setValue("2026-04-07");
    await settleReport();

    const communicationCalls = frappeRequestMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.url?.includes("get_communication_operations_report"));

    expect(communicationCalls).toHaveLength(2);
    expect(communicationCalls[1]).toEqual(
      expect.objectContaining({
        url: expect.stringContaining("get_communication_operations_report"),
        params: expect.objectContaining({
          filters: expect.stringContaining('"from_date":"2026-03-25"'),
        }),
      }),
    );
    expect(communicationCalls[1].params.filters).toContain('"to_date":"2026-03-31"');
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
          ...commonStubs,
          ScheduledReportsManager: genericStub,
        },
      },
    });

    await settleReport();

    const trigger = wrapper.findAll("button").find((node) => node.text().includes("Snapshot"));
    expect(trigger).toBeTruthy();
    await trigger.trigger("click");

    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_customer_segment_snapshot_job",
        method: "POST",
        params: expect.objectContaining({ limit: 250 }),
      }),
    );
  });

  it("syncs report view state from route query for visible columns", async () => {
    routeState.query = {
      report: "policy_list",
      report_cols: "customer_full_name,policy",
    };

    frappeRequestMock.mockResolvedValue({ message: { columns: ["customer_full_name", "policy", "office_branch"], rows: [] } });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const headerCells = wrapper.findAll("th").map((cell) => cell.text());
    expect(headerCells.some((text) => text.startsWith("Müşteri"))).toBe(true);
    expect(headerCells.some((text) => text.startsWith("Poliçe"))).toBe(true);
  });

  it("persists column visibility changes to the route", async () => {
    frappeRequestMock.mockResolvedValue({ message: { columns: ["customer", "policy", "office_branch"], rows: [] } });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const toggleButtons = wrapper
      .findAll("button")
      .filter((node) => node.attributes("class")?.includes("rounded-full"));
    const policyToggle = toggleButtons.find((node) => node.text().includes("Poliçe"));
    expect(policyToggle).toBeTruthy();
    await policyToggle.trigger("click");

    expect(routerReplace).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          report_cols: expect.not.stringContaining("policy"),
        }),
      }),
    );
  });

  it("applies date presets and loads report with date range", async () => {
    frappeRequestMock.mockResolvedValue({ message: { columns: ["period_label", "policy_count"], rows: [] } });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    // Policy list report should have date preset buttons and date input fields
    const dateInputs = wrapper.findAll("input[type=\"date\"]");
    expect(dateInputs.length).toBeGreaterThanOrEqual(2); // from_date and to_date

    // Set date range manually
    await dateInputs[0].setValue("2024-01-01");
    await dateInputs[1].setValue("2024-01-31");
    await settleReport();

    const reportCalls = frappeRequestMock.mock.calls
      .map(([request]) => request)
      .filter((request) => request.url?.includes("get_policy_list_report"));

    expect(reportCalls.length).toBeGreaterThan(0);
    const latestFilters = String(reportCalls[reportCalls.length - 1].params?.filters || "");
    // Verify that date range filters are being sent to the API
    expect(latestFilters).toContain('"from_date":"2024-01-01"');
    expect(latestFilters).toContain('"to_date":"2024-01-31"');
  });

  it("navigates to policy detail when a policy row is clicked", async () => {
    frappeRequestMock.mockResolvedValue({
      message: {
        columns: ["name", "policy_no", "customer"],
        rows: [{ name: "POL-0001", policy_no: "C-001", customer: "Acme" }],
      },
    });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const row = wrapper.find("tbody tr");
    expect(row.exists()).toBe(true);
    await row.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "policy-detail",
      params: { name: "POL-0001" },
    });
  });

  it("runs scheduled reports and updates configs via manager actions", async () => {
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
          ...commonStubs,
          ScheduledReportsManager: scheduledManagerStub,
        },
      },
    });

    await settleReport();

    await wrapper.find('[data-testid="scheduled-run"]').trigger("click");
    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.admin_jobs.run_scheduled_reports_job",
        method: "POST",
        params: expect.objectContaining({ frequency: "daily", limit: 10 }),
      }),
    );

    await wrapper.find('[data-testid="scheduled-save"]').trigger("click");
    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.reports.save_scheduled_report_config",
        method: "POST",
        params: expect.objectContaining({
          index: "",
          config: expect.objectContaining({ report_key: "policy_list" }),
        }),
      }),
    );

    await wrapper.find('[data-testid="scheduled-remove"]').trigger("click");
    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.reports.remove_scheduled_report_config",
        method: "POST",
        params: expect.objectContaining({ index: "0" }),
      }),
    );
  });

  it("shows error when scheduled reports run fails", async () => {
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

    frappeRequestMock
      .mockResolvedValueOnce({ message: { columns: [], rows: [] } })
      .mockResolvedValueOnce({ message: { items: [] } })
      .mockRejectedValueOnce(new Error("Run failed"));

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: scheduledManagerStub,
        },
      },
    });

    await settleReport();

    await wrapper.find('[data-testid="scheduled-run"]').trigger("click");
    await settleReport({ advanceTimers: false });

    expect(wrapper.text()).toContain("Run failed");
  });

  it("shows error when scheduled report save/remove fails", async () => {
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

    frappeRequestMock
      .mockResolvedValueOnce({ message: { columns: [], rows: [] } })
      .mockResolvedValueOnce({ message: { items: [] } })
      .mockRejectedValueOnce(new Error("Save failed"))
      .mockRejectedValueOnce(new Error("Remove failed"));

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: scheduledManagerStub,
        },
      },
    });

    await settleReport();

    await wrapper.find('[data-testid="scheduled-save"]').trigger("click");
    await settleReport({ advanceTimers: false });
    expect(wrapper.text()).toContain("Save failed");

    await wrapper.find('[data-testid="scheduled-remove"]').trigger("click");
    await settleReport({ advanceTimers: false });
    expect(wrapper.text()).toContain("Remove failed");
  });

  it("shows error when scheduled reports load fails", async () => {
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

    frappeRequestMock
      .mockResolvedValueOnce({ message: { columns: [], rows: [] } })
      .mockRejectedValueOnce(new Error("Load failed"));

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: scheduledManagerStub,
        },
      },
    });

    await settleReport();

    expect(wrapper.text()).toContain("Load failed");
  });

  it("shows load error when report fetch fails", async () => {
    frappeRequestMock.mockRejectedValueOnce(new Error("Fetch failed"));

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    expect(wrapper.text()).toContain("Fetch failed");
  });

  it("exports report in pdf format", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    frappeRequestMock.mockResolvedValue({ message: { columns: [], rows: [] } });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const pdfButton = wrapper.findAll("button").find((node) => node.text().trim() === "PDF");
    expect(pdfButton).toBeTruthy();
    await pdfButton.trigger("click");

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("export_policy_list_report"),
      "_blank",
      "noopener",
    );
    expect(openSpy.mock.calls[0][0]).toContain("export_format=pdf");
    expect(openSpy.mock.calls[0][0]).toContain("office_branch");

    openSpy.mockRestore();
  });

  it("exports report in xlsx format", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    frappeRequestMock.mockResolvedValue({ message: { columns: [], rows: [] } });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const xlsxButton = wrapper.findAll("button").find((node) => node.text().trim() === "Excel");
    expect(xlsxButton).toBeTruthy();
    await xlsxButton.trigger("click");

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("export_policy_list_report"),
      "_blank",
      "noopener",
    );
    expect(openSpy.mock.calls[0][0]).toContain("export_format=xlsx");

    openSpy.mockRestore();
  });

  it("shows export error when window.open fails", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => {
      throw new Error("Blocked");
    });
    frappeRequestMock.mockResolvedValue({ message: { columns: [], rows: [] } });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const pdfButton = wrapper.findAll("button").find((node) => node.text().trim() === "PDF");
    expect(pdfButton).toBeTruthy();
    await pdfButton.trigger("click");

    expect(wrapper.text()).toContain("Blocked");

    openSpy.mockRestore();
  });

  it("shows export error when popup is blocked", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    frappeRequestMock.mockResolvedValue({ message: { columns: [], rows: [] } });

    const wrapper = mount(Reports, {
      global: {
        stubs: {
          ...commonStubs,
          ScheduledReportsManager: true,
        },
      },
    });

    await settleReport();

    const pdfButton = wrapper.findAll("button").find((node) => node.text().trim() === "PDF");
    expect(pdfButton).toBeTruthy();
    await pdfButton.trigger("click");

    expect(wrapper.text()).toContain("Popup blocked");

    openSpy.mockRestore();
  });
});

