import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";

import CustomerDetail from "./CustomerDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();
const customer360Reload = vi.fn();
const auxDeleteSubmitMock = vi.fn();
const confirmMock = vi.fn(() => true);

vi.stubGlobal("confirm", confirmMock);

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerPush,
    currentRoute: ref({ fullPath: "/customers/CUST-001" }),
  }),
}));

vi.mock("frappe-ui", () => ({
  createResource: (config = {}) => {
    const url = String(config?.url || "");

    if (url.includes("get_customer_360_payload")) {
      const data = ref({});
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => {
          customer360Reload();
          const payload = {
            customer: {
              name: "CUST-001",
              full_name: "Aykut Bekir",
              email: "aykut@example.com",
              masked_phone: "0555***0000",
              masked_tax_id: "123*****789",
            },
            summary: {
              active_policy_count: 1,
              open_offer_count: 1,
              total_premium: 12500,
            },
            portfolio: {
              policies: [{ name: "POL-001", policy_no: "P-100", status: "Aktif", insurance_company: "Anadolu" }],
              offers: [{ name: "OFF-001", status: "Open", insurance_company: "Anadolu" }],
              payments: [{ name: "PAY-001", payment_no: "PAY-1", amount_try: 2500 }],
              claims: [{ name: "CLM-001", reported_date: "2026-03-01", claim_amount: 1500 }],
              renewals: [{ name: "REN-001", due_date: "2026-04-01", status: "Open", lost_reason_code: "" }],
            },
            communication: {
              channel_summary: [{ channel: "WhatsApp", total: 2 }],
              timeline: [{ type: "comment", timestamp: "2026-03-01T10:00:00Z", payload: { name: "COM-1", comment_by: "Agent" } }],
            },
            insights: {
              score: 82,
              segment: "Gold",
              claim_risk: "Medium",
            },
            cross_sell: {
              related_customers: [
                {
                  name: "REL-001",
                  customer: "CUST-001",
                  related_customer: "CUST-002",
                  related_customer_name: "Ayse Bekir",
                  relation_type: "Spouse",
                  is_household: 1,
                },
              ],
              insured_assets: [
                {
                  name: "AST-001",
                  customer: "CUST-001",
                  policy: "POL-001",
                  asset_type: "Vehicle",
                  asset_label: "34 ABC 123",
                  asset_identifier: "VIN-001",
                },
              ],
              opportunity_branches: [{ branch: "Saglik", label: "Saglik" }],
            },
          };
          data.value = payload;
          return payload;
        }),
        submit: vi.fn(async () => ({})),
      };
    }

    if (url.includes("update_customer_profile")) {
      return {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        setData: vi.fn(),
        reload: vi.fn(async () => ({})),
        submit: vi.fn(async () => ({})),
      };
    }

    if (url.includes("delete_quick_aux_record")) {
      return {
        data: ref({}),
        loading: ref(false),
        error: ref(null),
        params: {},
        setData: vi.fn(),
        reload: vi.fn(async () => ({})),
        submit: auxDeleteSubmitMock,
      };
    }

    if (url.includes("frappe.client.get_list")) {
      const data = ref([]);
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async (params = {}) => {
          if (params?.doctype === "AT Customer") {
            const payload = [
              { name: "CUST-001", full_name: "Aykut Bekir" },
              { name: "CUST-002", full_name: "Ayse Bekir" },
            ];
            data.value = payload;
            return payload;
          }
          if (params?.doctype === "AT Policy") {
            const payload = [{ name: "POL-001", policy_no: "P-100", customer: "CUST-001" }];
            data.value = payload;
            return payload;
          }
          data.value = [];
          return [];
        }),
        submit: vi.fn(async () => ([])),
      };
    }

    return {
      data: ref({}),
      loading: ref(false),
      error: ref(null),
      params: {},
      setData: vi.fn(),
      reload: vi.fn(async () => ({})),
      submit: vi.fn(async () => ({})),
    };
  },
}));

const QuickCreateManagedDialogStub = {
  ...defineComponent({
    props: ["modelValue", "configKey", "successHandlers", "beforeOpen", "optionsMap"],
    methods: {
      async triggerSuccess() {
        const handler = this.successHandlers?.["customer-relations-list"] || this.successHandlers?.["insured-assets-list"];
        if (typeof handler === "function") {
          await handler();
        }
      },
      async triggerBeforeOpen(form = {}, resetForm = vi.fn()) {
        if (typeof this.beforeOpen === "function") {
          await this.beforeOpen({ form, resetForm });
        }
        return { form, resetForm };
      },
    },
    template:
      `<div class="quick-create-dialog-stub" :data-config-key="configKey" :data-open="String(modelValue)"></div>`,
  }),
};

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click')"><slot /></button>`,
};

const genericStub = {
  template:
    `<div><slot /><slot name="actions" /><slot name="trailing" /><slot name="footer" /></div>`,
};

describe("CustomerDetail customer 360 integration", () => {
  beforeEach(() => {
    routerPush.mockReset();
    customer360Reload.mockReset();
    auxDeleteSubmitMock.mockReset();
    auxDeleteSubmitMock.mockResolvedValue({ deleted: true });
    confirmMock.mockReset();
    confirmMock.mockReturnValue(true);
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
  });

  it("renders relation and asset sections and opens inline create/edit dialogs", async () => {
    const wrapper = mount(CustomerDetail, {
      props: {
        name: "CUST-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: true,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          EntityPreviewCard: genericStub,
          MetaListCard: genericStub,
          MiniFactList: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
          TimelineActivityList: genericStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Iliskili Kisiler");
    expect(wrapper.text()).toContain("Sigortalanan Varliklar");
    expect(wrapper.text()).toContain("Ayse Bekir");
    expect(wrapper.text()).toContain("34 ABC 123");

    const dialogs = () => wrapper.findAll(".quick-create-dialog-stub");
    const buttonByText = (label) =>
      wrapper
        .findAll(".action-button-stub")
        .find((candidate) => candidate.text().includes(label));

    await buttonByText("Yeni Iliski").trigger("click");
    expect(dialogs().find((node) => node.attributes("data-config-key") === "customer_relation")?.attributes("data-open")).toBe("true");

    await buttonByText("Yeni Varlik").trigger("click");
    expect(dialogs().find((node) => node.attributes("data-config-key") === "insured_asset")?.attributes("data-open")).toBe("true");

    const editButtons = wrapper.findAll(".action-button-stub").filter((candidate) => candidate.text().includes("Duzenle"));
    await editButtons[0].trigger("click");
    expect(dialogs().find((node) => node.attributes("data-config-key") === "customer_relation_edit")?.attributes("data-open")).toBe("true");

    await editButtons[1].trigger("click");
    expect(dialogs().find((node) => node.attributes("data-config-key") === "insured_asset_edit")?.attributes("data-open")).toBe("true");
  });

  it("routes customer 360 operation buttons to the correct screens", async () => {
    const wrapper = mount(CustomerDetail, {
      props: {
        name: "CUST-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: true,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          EntityPreviewCard: genericStub,
          MetaListCard: genericStub,
          MiniFactList: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
          TimelineActivityList: genericStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const clickByText = async (label) => {
      const button = wrapper
        .findAll(".action-button-stub")
        .find((candidate) => candidate.text().includes(label));
      await button.trigger("click");
    };

    await clickByText("Iliskili Kisiler");
    expect(routerPush).toHaveBeenLastCalledWith({
      name: "customer-relations-list",
      query: { customer: "CUST-001" },
    });

    await clickByText("Sigortalanan Varliklar");
    expect(routerPush).toHaveBeenLastCalledWith({
      name: "insured-assets-list",
      query: { customer: "CUST-001" },
    });

    await clickByText("Iletisim");
    expect(routerPush).toHaveBeenLastCalledWith({
      name: "communication-center",
      query: {
        customer: "CUST-001",
        customer_label: "Aykut Bekir",
      },
    });
  });

  it("refreshes customer 360 payload after relation and asset success handlers run", async () => {
    const wrapper = mount(CustomerDetail, {
      props: {
        name: "CUST-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: true,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          EntityPreviewCard: genericStub,
          MetaListCard: genericStub,
          MiniFactList: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
          TimelineActivityList: genericStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(customer360Reload).toHaveBeenCalledTimes(1);

    const relationDialog = wrapper.findAllComponents(QuickCreateManagedDialogStub)[0];
    await relationDialog.vm.triggerSuccess();
    expect(customer360Reload).toHaveBeenCalledTimes(2);

    const assetDialog = wrapper.findAllComponents(QuickCreateManagedDialogStub)[1];
    await assetDialog.vm.triggerSuccess();
    expect(customer360Reload).toHaveBeenCalledTimes(3);
  });

  it("prefills create and edit dialogs with customer 360 context", async () => {
    const wrapper = mount(CustomerDetail, {
      props: {
        name: "CUST-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: true,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          EntityPreviewCard: genericStub,
          MetaListCard: genericStub,
          MiniFactList: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
          TimelineActivityList: genericStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const dialogs = wrapper.findAllComponents(QuickCreateManagedDialogStub);

    const relationCreateForm = {};
    await dialogs[0].vm.triggerBeforeOpen(relationCreateForm);
    expect(relationCreateForm.customer).toBe("CUST-001");
    expect(dialogs[0].props("optionsMap").customers).toHaveLength(2);

    const assetCreateForm = {};
    await dialogs[1].vm.triggerBeforeOpen(assetCreateForm);
    expect(assetCreateForm.customer).toBe("CUST-001");
    expect(assetCreateForm.policy).toBe("POL-001");
    expect(dialogs[1].props("optionsMap").policies).toHaveLength(1);

    const editButtons = wrapper.findAll(".action-button-stub").filter((candidate) => candidate.text().includes("Duzenle"));
    await editButtons[0].trigger("click");
    const relationResetForm = vi.fn();
    await dialogs[2].vm.triggerBeforeOpen({}, relationResetForm);
    expect(relationResetForm).toHaveBeenCalledWith(
      expect.objectContaining({
        doctype: "AT Customer Relation",
        name: "REL-001",
        customer: "CUST-001",
        related_customer: "CUST-002",
      })
    );

    await editButtons[1].trigger("click");
    const assetResetForm = vi.fn();
    await dialogs[3].vm.triggerBeforeOpen({}, assetResetForm);
    expect(assetResetForm).toHaveBeenCalledWith(
      expect.objectContaining({
        doctype: "AT Insured Asset",
        name: "AST-001",
        customer: "CUST-001",
        policy: "POL-001",
        asset_label: "34 ABC 123",
      })
    );
  });

  it("deletes relation and asset rows then refreshes customer 360 payload", async () => {
    const wrapper = mount(CustomerDetail, {
      props: {
        name: "CUST-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: true,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          EntityPreviewCard: genericStub,
          MetaListCard: genericStub,
          MiniFactList: true,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
          TimelineActivityList: genericStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const deleteButtons = wrapper.findAll(".action-button-stub").filter((candidate) => candidate.text().includes("Sil"));
    await deleteButtons[0].trigger("click");
    expect(confirmMock).toHaveBeenCalled();
    expect(auxDeleteSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Customer Relation",
      name: "REL-001",
    });
    expect(customer360Reload).toHaveBeenCalledTimes(2);

    await deleteButtons[1].trigger("click");
    expect(auxDeleteSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Insured Asset",
      name: "AST-001",
    });
    expect(customer360Reload).toHaveBeenCalledTimes(3);
  });
});
