import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

import ReconciliationWorkbench from "./ReconciliationWorkbench.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useAccountingStore } from "../stores/accounting";

const resourceQueue = [];

vi.mock("frappe-ui", () => ({
  Dialog: {
    template: `<div class="dialog-stub"><slot name="body-content" /></div>`,
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
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="advanced" /><slot name="body-content" /></div>`,
};

describe("ReconciliationWorkbench page store integration", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "accountant@example.com",
      full_name: "Accountant",
      roles: ["Accountant"],
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

  it("reloads workbench payload into accounting store and filters rows by source query", async () => {
    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          metrics: {
            open: 2,
            resolved: 1,
            ignored: 0,
            failed_entries: 1,
            overdue_collections: 1,
            overdue_amount_try: 4200,
          },
          collection_preview: {
            overdue_rows: [
              {
                name: "PAY-9001",
                payment_no: "PAY-9001",
                customer: "CUST-001",
                policy: "POL-001",
                status: "Draft",
                due_date: "2026-03-01",
                amount_try: 4200,
              },
            ],
          },
          rows: [
            {
              name: "REC-001",
              source_doctype: "AT Payment",
              source_name: "PAY-001",
              mismatch_type: "Amount",
              status: "Open",
              accounting: { external_ref: "EXT-001" },
            },
            {
              name: "REC-002",
              source_doctype: "AT Claim",
              source_name: "CLM-002",
              mismatch_type: "Status",
              status: "Resolved",
              accounting: { external_ref: "EXT-002" },
            },
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
    );

    const wrapper = mount(ReconciliationWorkbench, {
      global: {
        stubs: {
          Dialog: true,
          ActionButton: ActionButtonStub,
          DataTableShell: genericStub,
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: genericStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    const accountingStore = useAccountingStore();

    await wrapper.findAll(".action-button-stub")[2].trigger("click");

    expect(accountingStore.metrics.open).toBe(2);
    expect(accountingStore.metrics.overdue_collections).toBe(1);
    expect(accountingStore.metrics.overdue_amount_try).toBe(4200);
    expect(accountingStore.rows).toHaveLength(2);
    expect(accountingStore.sourceDoctypeOptions).toHaveLength(2);
    expect(wrapper.text()).toContain("Geciken Tahsilat");
    expect(wrapper.text()).toContain("PAY-9001");

    const inputs = wrapper.findAll(".input");
    await inputs[2].setValue("PAY-001");

    expect(accountingStore.state.filters.sourceQuery).toBe("PAY-001");
    expect(accountingStore.rows).toHaveLength(1);
    expect(accountingStore.activeFilterCount).toBe(1);
  });
});
