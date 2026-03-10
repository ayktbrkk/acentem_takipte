import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";

import PolicyDetail from "./PolicyDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();
const policy360Reload = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("frappe-ui", () => ({
  createResource: (config = {}) => {
    const data = ref({});
    const url = String(config?.url || "");

    if (url.includes("get_policy_360_payload")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => {
          policy360Reload();
          const payload = {
            policy: {
              name: "POL-001",
              policy_no: "P-100",
              insurance_company: "Anadolu",
              branch: "Kasko",
              status: "Active",
              customer: "CUST-001",
              start_date: "2026-01-01",
              end_date: "2026-12-31",
              issue_date: "2026-01-01",
              currency: "TRY",
              gross_premium: 12000,
              net_premium: 10000,
              tax_amount: 1000,
              commission_amount: 1500,
              commission_rate: 12.5,
              gwp_try: 12000,
            },
            customer: {
              name: "CUST-001",
              full_name: "Aykut Bekir",
              tax_id: "12345678901",
              phone: "05550000000",
              address: "Istanbul",
            },
            endorsements: [],
            comments: [],
            communications: [],
            snapshots: [],
            payments: [],
            files: [
              { name: "FILE-001", file_name: "police.pdf", file_url: "/files/police.pdf", creation: "2026-03-09T09:00:00Z" },
              { name: "FILE-002", file_name: "hasar-foto.jpg", file_url: "/files/hasar-foto.jpg", creation: "2026-03-08T09:00:00Z" },
            ],
            notifications: [],
            assignments: [
              {
                name: "ASN-001",
                source_doctype: "AT Policy",
                source_name: "POL-001",
                customer: "CUST-001",
                policy: "POL-001",
                assigned_to: "agent@example.com",
                assignment_role: "Owner",
                status: "Open",
                priority: "High",
                due_date: "2026-03-20",
              },
            ],
            activities: [
              {
                name: "ACT-001",
                activity_title: "Police yenileme gorusmesi",
                activity_type: "Renewal Update",
                source_doctype: "AT Policy",
                source_name: "POL-001",
                customer: "CUST-001",
                policy: "POL-001",
                assigned_to: "agent@example.com",
                activity_at: "2026-03-09T10:00:00Z",
                status: "Logged",
              },
            ],
            payment_installments: [
              {
                name: "PINST-001",
                payment: "PAY-001",
                installment_no: 1,
                installment_count: 3,
                status: "Overdue",
                due_date: "2026-04-01",
                currency: "TRY",
                amount_try: 4000,
              },
              {
                name: "PINST-002",
                payment: "PAY-001",
                installment_no: 2,
                installment_count: 3,
                status: "Scheduled",
                due_date: "2026-05-01",
                currency: "TRY",
                amount_try: 4000,
              },
            ],
            product_profile: {
              product_family: "Motor",
              insured_subject: "Vehicle",
              coverage_focus: "Motor",
              policy_status: "Active",
              readiness_score: 67,
              completed_field_count: 4,
              missing_field_count: 2,
              missing_fields: [
                { key: "vehicle_chassis_no", label: "Chassis No" },
                { key: "vehicle_engine_no", label: "Engine No" },
              ],
            },
            document_profile: {
              total_files: 2,
              pdf_count: 1,
              image_count: 1,
              spreadsheet_count: 0,
              other_count: 0,
              last_uploaded_on: "2026-03-09T09:00:00Z",
            },
          };
          data.value = payload;
          return payload;
        }),
        submit: vi.fn(async () => ({})),
      };
    }

    return {
      data,
      loading: ref(false),
      error: ref(null),
      params: {},
      setData(payload) {
        data.value = payload;
      },
      reload: vi.fn(async () => ({})),
      submit: vi.fn(async () => ({})),
    };
  },
}));

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click')"><slot /></button>`,
};

const DetailTabsBarStub = defineComponent({
  props: ["modelValue", "tabs"],
  emits: ["update:modelValue"],
  template: `
    <div>
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="detail-tab-stub"
        @click="$emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
  `,
});

const QuickCreateManagedDialogStub = {
  ...defineComponent({
    props: ["modelValue", "configKey", "beforeOpen", "optionsMap"],
    methods: {
      async triggerBeforeOpen(form = {}, resetForm = vi.fn()) {
        if (typeof this.beforeOpen === "function") {
          await this.beforeOpen({ form, resetForm });
        }
        return { form, resetForm };
      },
    },
    template: `<div class="quick-create-dialog-stub" :data-config-key="configKey" :data-open="String(modelValue)"></div>`,
  }),
};

const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="trailing" /><slot name="footer" /></div>`,
};

describe("PolicyDetail policy 360 integration", () => {
  beforeEach(() => {
    routerPush.mockReset();
    policy360Reload.mockReset();
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

  it("renders product profile and readiness data on coverages tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(policy360Reload).toHaveBeenCalledTimes(1);

    const coveragesTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Teminatlar"));
    await coveragesTab.trigger("click");

    expect(wrapper.text()).toContain("Urun Profili");
    expect(wrapper.text()).toContain("Urun Hazirlik Durumu");
    expect(wrapper.text()).toContain("Motor");
    expect(wrapper.text()).toContain("Vehicle");
    expect(wrapper.text()).toContain("67%");
    expect(wrapper.text()).toContain("Chassis No");
    expect(wrapper.text()).toContain("Engine No");
  });

  it("routes back to policy list and customer 360", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const clickByText = async (label) => {
      const button = wrapper.findAll(".action-button-stub").find((candidate) => candidate.text().includes(label));
      await button.trigger("click");
    };

    await clickByText("Listeye Don");
    expect(routerPush).toHaveBeenLastCalledWith({ name: "policy-list" });

    await clickByText("Musteri 360");
    expect(routerPush).toHaveBeenLastCalledWith({ name: "customer-detail", params: { name: "CUST-001" } });
  });

  it("renders installment preview on premiums tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const premiumsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Prim"));
    await premiumsTab.trigger("click");

    expect(wrapper.text()).toContain("Taksit Plani");
    expect(wrapper.text()).toContain("Taksit 1/3");
    expect(wrapper.text()).toContain("PAY-001");
    expect(wrapper.text()).toContain("Gecikti");
    expect(wrapper.text()).toContain("2026-04-01");
  });

  it("renders document profile on documents tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Dokuman"));
    await documentsTab.trigger("click");

    expect(wrapper.text()).toContain("Toplam Dokuman");
    expect(wrapper.text()).toContain("PDF");
    expect(wrapper.text()).toContain("Gorsel");
    expect(wrapper.text()).toContain("2");
    expect(wrapper.text()).toContain("1");
    expect(wrapper.text()).toContain("police.pdf");
    expect(wrapper.text()).toContain("hasar-foto.jpg");
  });

  it("routes policy documents action to filtered files list", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Dokuman"));
    await documentsTab.trigger("click");

    const openButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Ac"));
    await openButton.trigger("click");

    expect(routerPush).toHaveBeenLastCalledWith({
      name: "files-list",
      query: {
        attached_to_doctype: "AT Policy",
        attached_to_name: "POL-001",
      },
    });
  });

  it("renders assignments and prefills assignment dialogs on summary tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Atamalar");
    expect(wrapper.text()).toContain("agent@example.com");

    const dialogs = wrapper.findAllComponents(QuickCreateManagedDialogStub);
    const buttons = wrapper.findAll(".action-button-stub");

    await buttons.find((candidate) => candidate.text().includes("Yeni Atama")).trigger("click");
    const createForm = {};
    await dialogs[0].vm.triggerBeforeOpen(createForm);
    expect(createForm).toEqual(
      expect.objectContaining({
        source_doctype: "AT Policy",
        source_name: "POL-001",
        policy: "POL-001",
        customer: "CUST-001",
      })
    );

    await buttons.find((candidate) => candidate.text().includes("Duzenle")).trigger("click");
    const resetForm = vi.fn();
    await dialogs[1].vm.triggerBeforeOpen({}, resetForm);
    expect(resetForm).toHaveBeenCalledWith(
      expect.objectContaining({
        doctype: "AT Ownership Assignment",
        name: "ASN-001",
        source_doctype: "AT Policy",
        source_name: "POL-001",
        policy: "POL-001",
        customer: "CUST-001",
        assigned_to: "agent@example.com",
      })
    );
  });

  it("renders recent activities on summary tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: true,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: QuickCreateManagedDialogStub,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Aktiviteler");
    expect(wrapper.text()).toContain("Police yenileme gorusmesi");
    expect(wrapper.text()).toContain("Renewal Update");
    expect(wrapper.text()).toContain("agent@example.com");
  });
});
