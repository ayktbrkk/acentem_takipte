import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { reactive, ref } from "vue";

import ReconciliationWorkbench from "./ReconciliationWorkbench.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useAccountingStore } from "../stores/accounting";

const resourceQueue = [];
const confirmMock = vi.fn(() => true);
const routeState = reactive({
  query: {},
});

vi.stubGlobal("confirm", confirmMock);

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  Dialog: {
    template: `<div class="dialog-stub"><slot name="body-content" /></div>`,
  },
  createResource: () => {
    const fallback = {
      data: ref({}),
      loading: ref(false),
      error: ref(null),
      params: {},
      reload: vi.fn(async () => ({})),
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

vi.mock("../utils/sourcePanel", () => ({
  getSourcePanelConfig: vi.fn(() => null),
}));

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click', $event)"><slot /></button>`,
};

const SectionPanelStub = {
  props: ["title", "count", "meta", "showCount"],
  template: `
    <section class="section-panel-stub">
      <div class="section-panel-header">
        <h3>{{ title }}</h3>
        <span v-if="meta">{{ meta }}</span>
        <span v-else-if="showCount !== false && count != null">{{ count }}</span>
        <slot name="trailing" />
      </div>
      <slot />
    </section>
  `,
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

async function settleAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

async function loadWorkbench(wrapper) {
  const refreshButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Yenile"));
  await refreshButton.trigger("click");
  await settleAsyncWork();
}

describe("ReconciliationWorkbench page store integration", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routeState.query = {};
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
              local_amount_try: 1000,
              external_amount_try: 1250,
              difference_try: 250,
              accounting: { external_ref: "EXT-001", insurance_company: "Anadolu", policy: "POL-001" },
            },
            {
              name: "REC-002",
              source_doctype: "AT Claim",
              source_name: "CLM-002",
              mismatch_type: "Status",
              status: "Resolved",
              local_amount_try: 900,
              external_amount_try: 600,
              difference_try: -300,
              accounting: { external_ref: "EXT-002", insurance_company: "Allianz" },
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
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          SectionPanel: SectionPanelStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    const accountingStore = useAccountingStore();

    await loadWorkbench(wrapper);

    expect(accountingStore.metrics.open).toBe(2);
    expect(accountingStore.metrics.overdue_collections).toBe(1);
    expect(accountingStore.metrics.overdue_amount_try).toBe(4200);
    expect(accountingStore.metrics.commission_accrual_count).toBe(1);
    expect(accountingStore.metrics.commission_accrual_amount_try).toBe(1500);
    expect(accountingStore.rows).toHaveLength(2);
    expect(accountingStore.sourceDoctypeOptions).toHaveLength(2);
    expect(wrapper.text()).toContain("Toplam Kay");
    expect(wrapper.text()).toContain("Eşleşti");
    expect(wrapper.text()).toContain("Beklemede");
    expect(wrapper.text()).toContain("Uyumsuzluk");
    expect(wrapper.text()).toContain("Toplam Tutar Farkı");
    expect(wrapper.text()).toContain("MUTABAKAT NO");
    expect(wrapper.text()).toContain("ŞİRKET");
    expect(wrapper.text()).toContain("TOPLAM POLİÇE");
    expect(wrapper.text()).toContain("ŞİRKET BİLDİRİMİ");
    expect(wrapper.text()).toContain("REC-001");
    expect(wrapper.text()).toContain("REC-002");
    expect(wrapper.html()).toContain("text-green-600");
    expect(wrapper.html()).toContain("text-amber-700");

    const sourceQueryInput = wrapper.find(`input[placeholder="Kaynak kayıt / ref ara"]`);
    await sourceQueryInput.setValue("PAY-001");

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
        submit: vi.fn(async () => ({ imported: 0 })),
      },
    );

    const wrapper = mount(ReconciliationWorkbench, {
      global: {
        stubs: {
          Dialog: genericStub,
          ActionButton: ActionButtonStub,
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          SectionPanel: SectionPanelStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    const importButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Ekstre İçe Aktar"));
    await importButton.trigger("click");
    await wrapper.find("textarea").setValue("external_ref,policy_no,payment_no,customer,amount_try\nEXT-001,P-100,PAY-100,Aykut,1500");
    await wrapper.find(".dialog-save-stub").trigger("click");
    await settleAsyncWork();

    expect(previewSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        csv_text: "external_ref,policy_no,payment_no,customer,amount_try\nEXT-001,P-100,PAY-100,Aykut,1500",
        delimiter: ",",
      })
    );
    expect(wrapper.text()).toContain("Toplam Satır");
    expect(wrapper.text()).toContain("Eşleşen");
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
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          SectionPanel: SectionPanelStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    const importButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Ekstre İçe Aktar"));
    await importButton.trigger("click");
    await wrapper.find("textarea").setValue("external_ref,policy_no,payment_no,customer,amount_try\nEXT-001,P-100,PAY-100,Aykut,1500");
    await wrapper.find(".dialog-save-stub").trigger("click");
    await settleAsyncWork();

    const importMatchedButton = wrapper
      .findAll(".action-button-stub")
      .find((node) => node.text().includes("İçe Aktar") && !node.text().includes("Ekstre"));
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
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          SectionPanel: SectionPanelStub,
          TableFactsCell: true,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
          TableEntityCell: genericStub,
        },
      },
    });

    await loadWorkbench(wrapper);

    const bulkResolveButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Açıkları Toplu Çöz"));
    await bulkResolveButton.trigger("click");
    await settleAsyncWork();

    expect(confirmMock).toHaveBeenCalled();
    expect(bulkResolveSubmit).toHaveBeenCalledWith({
      item_names: ["REC-001"],
      resolution_action: "Matched",
    });
  });
});
