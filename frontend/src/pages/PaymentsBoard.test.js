import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

import PaymentsBoard from "./PaymentsBoard.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePaymentStore } from "../stores/payment";

const resourceQueue = [];

vi.mock("frappe-ui", () => ({
  createResource: () =>
    resourceQueue.shift() || {
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
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="advanced" /><slot name="header" /></div>`,
};
const TableFactsCellStub = {
  props: ["items"],
  template: `
    <div class="table-facts-cell-stub">
      <div v-for="item in items" :key="item.key">{{ item.label }}: {{ item.value }}</div>
    </div>
  `,
};

describe("PaymentsBoard page store integration", () => {
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

  it("reloads rows into payment store and derives totals from filtered items", async () => {
    resourceQueue.push(
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => [
          {
            name: "PAY-001",
            payment_no: "T-001",
            payment_direction: "Inbound",
            amount_try: 1000,
            customer: "CUST-001",
            policy: "POL-001",
            payment_purpose: "Prim",
          },
          {
            name: "PAY-002",
            payment_no: "T-002",
            payment_direction: "Outbound",
            amount_try: 400,
            customer: "CUST-002",
            policy: "POL-002",
            payment_purpose: "Iade",
          },
        ]),
      },
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => [
          {
            payment: "PAY-001",
            installment_no: 1,
            installment_count: 3,
            status: "Paid",
            due_date: "2026-03-01",
            amount_try: 334,
          },
          {
            payment: "PAY-001",
            installment_no: 2,
            installment_count: 3,
            status: "Overdue",
            due_date: "2026-04-01",
            amount_try: 333,
          },
          {
            payment: "PAY-001",
            installment_no: 3,
            installment_count: 3,
            status: "Scheduled",
            due_date: "2026-05-01",
            amount_try: 333,
          },
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
      {
        data: ref([]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => []),
      },
    );

    const wrapper = mount(PaymentsBoard, {
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DataTableShell: genericStub,
          DataTableCell: genericStub,
          DocSummaryGrid: true,
          FormattedCurrencyValue: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateLauncher: true,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
          TableEntityCell: true,
          TableFactsCell: TableFactsCellStub,
          WorkbenchFilterToolbar: genericStub,
        },
      },
    });

    const paymentStore = usePaymentStore();

    await wrapper.find(".action-button-stub").trigger("click");

    expect(paymentStore.state.items).toHaveLength(2);
    expect(paymentStore.filteredItems).toHaveLength(2);
    expect(paymentStore.inboundTotal).toBe(1000);
    expect(paymentStore.outboundTotal).toBe(400);
    expect(wrapper.text()).toContain("Taksit: 3");
    expect(wrapper.text()).toContain("Ödenen Taksit: 1/3");
    expect(wrapper.text()).toContain("Geciken Taksit: 1");
    expect(wrapper.text()).toContain("Sonraki Vade: 2026-04-01");

    const inputs = wrapper.findAll(".input");
    await inputs[0].setValue("POL-001");

    expect(paymentStore.state.filters.query).toBe("POL-001");
    expect(paymentStore.activeFilterCount).toBe(1);
  });
});
