import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

import ReconciliationWorkbench from "./ReconciliationWorkbench.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useAccountingStore } from "../stores/accounting";

const resourceQueue = [];
const confirmMock = vi.fn(() => true);

vi.stubGlobal("confirm", confirmMock);

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

const QuickCreateDialogShellStub = {
  emits: ["save", "cancel"],
  template: `
    <div class="quick-create-dialog-shell-stub">
      <slot />
      <button class="dialog-save-stub" @click="$emit('save')">save</button>
      <button class="dialog-cancel-stub" @click="$emit('cancel')">cancel</button>
    </div>
  `,
};

const genericStub = {
  template:
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="advanced" /><slot name="body-content" /></div>`,
};

describe("ReconciliationWorkbench page store integration", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    confirmMock.mockReset();
    confirmMock.mockReturnValue(true);
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
            commission_accrual_count: 1,
            commission_accrual_amount_try: 1500,
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
          commission_preview: {
            rows: [
              {
                name: "POL-001",
                policy_no: "P-100",
                customer: "CUST-001",
                insurance_company: "Anadolu",
                status: "Active",
                office_branch: "IST",
                commission_amount: 1500,
                commission_amount_try: 1500,
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
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
        submit: vi.fn(async () => ({ rows: [], summary: {} })),
      },
    );

    const wrapper = mount(ReconciliationWorkbench, {
      global: {
        stubs: {
          Dialog: genericStub,
          ActionButton: ActionButtonStub,
          DataTableShell: genericStub,
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    const accountingStore = useAccountingStore();

    const refreshButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Yenile"));
    await refreshButton.trigger("click");

    expect(accountingStore.metrics.open).toBe(2);
    expect(accountingStore.metrics.overdue_collections).toBe(1);
    expect(accountingStore.metrics.overdue_amount_try).toBe(4200);
    expect(accountingStore.metrics.commission_accrual_count).toBe(1);
    expect(accountingStore.metrics.commission_accrual_amount_try).toBe(1500);
    expect(accountingStore.rows).toHaveLength(2);
    expect(accountingStore.sourceDoctypeOptions).toHaveLength(2);
    expect(wrapper.text()).toContain("Geciken Tahsilat");
    expect(wrapper.text()).toContain("PAY-9001");
    expect(wrapper.text()).toContain("Komisyon Tahakkuk");
    expect(wrapper.text()).toContain("P-100");

    const inputs = wrapper.findAll(".input");
    await inputs[2].setValue("PAY-001");

    expect(accountingStore.state.filters.sourceQuery).toBe("PAY-001");
    expect(accountingStore.rows).toHaveLength(1);
    expect(accountingStore.activeFilterCount).toBe(1);
  });

  it("opens statement import dialog and renders preview summary", async () => {
    const previewSubmit = vi.fn(async () => ({
      rows: [
        {
          external_ref: "EXT-001",
          policy_no: "P-100",
          payment_no: "PAY-100",
          amount_try: 1500,
          match_status: "Matched",
        },
      ],
      summary: {
        total_rows: 1,
        matched_rows: 1,
        unmatched_rows: 0,
        total_amount_try: 1500,
      },
    }));

    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          metrics: {},
          collection_preview: { overdue_rows: [] },
          commission_preview: { rows: [] },
          rows: [],
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
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
        submit: previewSubmit,
      },
    );

    const wrapper = mount(ReconciliationWorkbench, {
      global: {
        stubs: {
          Dialog: genericStub,
          ActionButton: ActionButtonStub,
          DataTableShell: genericStub,
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    const importButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Ekstre Ice Aktar"));
    await importButton.trigger("click");
    await wrapper.find("textarea").setValue("external_ref,policy_no,payment_no,customer,amount_try\nEXT-001,P-100,PAY-100,Aykut,1500");
    await wrapper.find(".dialog-save-stub").trigger("click");

    expect(previewSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        csv_text: "external_ref,policy_no,payment_no,customer,amount_try\nEXT-001,P-100,PAY-100,Aykut,1500",
        delimiter: ",",
      })
    );
    expect(wrapper.text()).toContain("Toplam Satir");
    expect(wrapper.text()).toContain("Eslesen");
    expect(wrapper.text()).toContain("EXT-001");
    expect(wrapper.text()).toContain("P-100");
  });

  it("imports matched statement rows after preview", async () => {
    const previewSubmit = vi.fn(async () => ({
      rows: [
        {
          external_ref: "EXT-001",
          policy_no: "P-100",
          payment_no: "PAY-100",
          amount_try: 1500,
          match_status: "Matched",
        },
      ],
      summary: {
        total_rows: 1,
        matched_rows: 1,
        unmatched_rows: 0,
        total_amount_try: 1500,
      },
    }));
    const importSubmit = vi.fn(async () => ({ imported: 1, skipped: 0, open_items: 1 }));

    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          metrics: {},
          collection_preview: { overdue_rows: [] },
          commission_preview: { rows: [] },
          rows: [],
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
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
        submit: previewSubmit,
      },
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
        submit: importSubmit,
      },
    );

    const wrapper = mount(ReconciliationWorkbench, {
      global: {
        stubs: {
          Dialog: genericStub,
          ActionButton: ActionButtonStub,
          DataTableShell: genericStub,
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    const importButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Ekstre Ice Aktar"));
    await importButton.trigger("click");
    await wrapper.find("textarea").setValue("external_ref,policy_no,payment_no,customer,amount_try\nEXT-001,P-100,PAY-100,Aykut,1500");
    await wrapper.find(".dialog-save-stub").trigger("click");

    const importMatchedButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Eslesenleri Ice Aktar"));
    await importMatchedButton.trigger("click");

    expect(importSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        csv_text: "external_ref,policy_no,payment_no,customer,amount_try\nEXT-001,P-100,PAY-100,Aykut,1500",
        delimiter: ",",
      })
    );
  });

  it("bulk resolves visible open rows", async () => {
    const bulkResolveSubmit = vi.fn(async () => ({ processed: 1, skipped: 0, resolution_action: "Matched" }));

    resourceQueue.push(
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({
          metrics: {},
          collection_preview: { overdue_rows: [] },
          commission_preview: { rows: [] },
          rows: [
            {
              name: "REC-001",
              source_doctype: "AT Payment",
              source_name: "PAY-001",
              mismatch_type: "Amount",
              status: "Open",
              accounting: { external_ref: "EXT-001" },
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
        submit: bulkResolveSubmit,
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
        submit: vi.fn(async () => ({ rows: [], summary: {} })),
      },
      {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
        submit: vi.fn(async () => ({ imported: 0 })),
      },
    );

    const wrapper = mount(ReconciliationWorkbench, {
      global: {
        stubs: {
          Dialog: genericStub,
          ActionButton: ActionButtonStub,
          DataTableShell: genericStub,
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    const bulkResolveButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Açıkları Toplu Çöz"));
    await bulkResolveButton.trigger("click");

    expect(confirmMock).toHaveBeenCalled();
    expect(bulkResolveSubmit).toHaveBeenCalledWith({
      item_names: ["REC-001"],
      resolution_action: "Matched",
    });
  });
});
