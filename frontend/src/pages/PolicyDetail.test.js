import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";

import PolicyDetail from "./PolicyDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();
const policy360Reload = vi.fn();
const auxUpdateSubmitMock = vi.fn();
const auxDeleteSubmitMock = vi.fn();
const confirmMock = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
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
              { name: "FILE-001", file_name: "police.pdf", file_url: "/files/police.pdf", file_size: 102400, is_private: 1, creation: "2026-03-09T09:00:00Z" },
              { name: "FILE-002", file_name: "hasar-foto.jpg", file_url: "/files/hasar-foto.jpg", file_size: 0, is_private: 0, creation: "2026-03-08T09:00:00Z" },
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
                activity_title: "Poliçe yenileme görüşmesi",
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
            reminders: [
              {
                name: "REM-001",
                reminder_title: "Poliçe belge yükleme takibi",
                source_doctype: "AT Policy",
                source_name: "POL-001",
                customer: "CUST-001",
                policy: "POL-001",
                assigned_to: "agent@example.com",
                status: "Open",
                priority: "Normal",
                remind_at: "2026-03-10T11:00:00Z",
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

    if (url.includes("update_quick_aux_record")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: auxUpdateSubmitMock,
      };
    }

    if (url.includes("delete_quick_aux_record")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: auxDeleteSubmitMock,
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
  template: `<button class="action-button-stub" @click="$emit('click', $event)"><slot /></button>`,
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

const PolicyDocumentUploadModalStub = {
  props: ["open", "canUpload", "policyName"],
  emits: ["close", "uploaded"],
  template: `
    <div class="upload-modal-stub" :data-open="String(open)" :data-can-upload="String(canUpload)">
      <button class="modal-stub-close" @click="$emit('close')">Close</button>
      <button class="modal-stub-uploaded" @click="$emit('uploaded')">Uploaded</button>
    </div>
  `,
};
const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="trailing" /><slot name="footer" /></div>`,
};
const MetaListCardStub = {
  props: ["title", "subtitle", "description", "meta"],
  template: `
    <div class="meta-list-card-stub">
      <div>{{ title }}</div>
      <div v-if="subtitle">{{ subtitle }}</div>
      <div v-if="description">{{ description }}</div>
      <div v-if="meta">{{ meta }}</div>
      <slot />
      <slot name="trailing" />
      <slot name="footer" />
    </div>
  `,
};
const SectionPanelStub = {
  props: ["title", "count", "meta", "showCount"],
  template: `
    <section class="section-panel-stub">
      <div class="section-panel-header">
        <h2>{{ title }}</h2>
        <slot name="trailing" />
      </div>
      <slot />
    </section>
  `,
};
const commonStubs = {
  ActionButton: ActionButtonStub,
  DetailActionRow: genericStub,
  DetailTabsBar: DetailTabsBarStub,
  MetaListCard: MetaListCardStub,
  SectionPanel: SectionPanelStub,
  QuickCreateManagedDialog: QuickCreateManagedDialogStub,
  StatusBadge: true,
  PolicyDocumentUploadModal: PolicyDocumentUploadModalStub,
};

describe("PolicyDetail policy 360 integration", () => {
  beforeEach(() => {
    routerPush.mockReset();
    policy360Reload.mockReset();
    auxUpdateSubmitMock.mockReset();
    auxDeleteSubmitMock.mockReset();
    confirmMock.mockReset();
    auxUpdateSubmitMock.mockResolvedValue({ ok: true });
    auxDeleteSubmitMock.mockResolvedValue({ ok: true });
    confirmMock.mockReturnValue(true);
    vi.stubGlobal("confirm", confirmMock);
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
      capabilities: {},
    });
  });

  it("renders product profile and readiness data on coverages tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: commonStubs,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(policy360Reload).toHaveBeenCalledTimes(1);

    const coveragesTab = wrapper.findAll(".nav-tab").find((node) => node.text().includes("Teminatlar"));
    expect(coveragesTab).toBeTruthy();
    await coveragesTab.trigger("click");

    expect(wrapper.text()).toContain("Ürün Profili");
    expect(wrapper.text()).toContain("Ürün Hazırlık Durumu");
    expect(wrapper.text()).toContain("Motor");
    expect(wrapper.text()).toContain("Araç");
    expect(wrapper.text()).toContain("67%");
    expect(wrapper.text()).toContain("Şasi No");
    expect(wrapper.text()).toContain("Motor No");
  });

  it("renders summary sections on default tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: commonStubs,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Poliçe Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Prim Bilgileri");
    expect(wrapper.text()).toContain("Müşteri Detayı");
    expect(wrapper.text()).toContain("Vade Tarihleri");
    expect(wrapper.text()).toContain("Atamalar");
  });

  it("routes back to policy list and customer 360", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: commonStubs,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const clickByText = async (label) => {
      const button = wrapper.findAll("button").find((candidate) => candidate.text().includes(label));
      expect(button).toBeTruthy();
      await button.trigger("click");
    };

    await clickByText("Listeye Dön");
    expect(routerPush).toHaveBeenLastCalledWith({ name: "policy-list" });

    await clickByText("Müşteri Detaylarını Aç");
    expect(routerPush).toHaveBeenLastCalledWith({ name: "customer-detail", params: { name: "CUST-001" } });
  });

  it("renders installment preview on premiums tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: commonStubs,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const premiumsTab = wrapper.findAll(".nav-tab").find((node) => node.text().includes("Prim"));
    expect(premiumsTab).toBeTruthy();
    await premiumsTab.trigger("click");

    expect(wrapper.text()).toContain("Prim Bilgileri");
    expect(wrapper.text()).toContain("Ödemeler");
    expect(wrapper.text()).toContain("Ödeme kaydı yok.");
  });

  it("renders document profile on documents tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: commonStubs,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".nav-tab").find((node) => node.text().includes("Doküman"));
    expect(documentsTab).toBeTruthy();
    await documentsTab.trigger("click");

    expect(wrapper.text()).toContain("Toplam Doküman");
    expect(wrapper.text()).toContain("PDF");
    expect(wrapper.text()).toContain("Görsel");
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
        stubs: commonStubs,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".nav-tab").find((node) => node.text().includes("Doküman"));
    expect(documentsTab).toBeTruthy();
    await documentsTab.trigger("click");

    const openButton = wrapper.findAll("button").find((node) => node.text().includes("Aç"));
    expect(openButton).toBeTruthy();
    await openButton.trigger("click");

    expect(routerPush).toHaveBeenLastCalledWith({
      name: "files-list",
      query: {
        attached_to_doctype: "AT Policy",
        attached_to_name: "POL-001",
      },
    });
  });

  it("renders assignments preview on summary tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: commonStubs,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Atamalar");
    expect(wrapper.text()).toContain("agent@example.com");
  });

  it("shows empty timeline message on summary tab when no timeline data exists", async () => {
    const wrapper = mount(PolicyDetail, {
      props: {
        name: "POL-001",
      },
      global: {
        stubs: commonStubs,
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Bu poliçede zaman tüneli kaydı yok.");
  });

  it("shows upload button when user has write permission on AT Policy", async () => {
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
      capabilities: { doctypes: { "AT Policy": { write: true } } },
    });

    const wrapper = mount(PolicyDetail, {
      props: { name: "POL-001" },
      global: { stubs: commonStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".nav-tab").find((n) => n.text().includes("Doküman"));
    expect(documentsTab).toBeTruthy();
    await documentsTab.trigger("click");

    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Doküman Yükle"));
    expect(uploadBtn).toBeTruthy();
  });

  it("hides upload button when user lacks write permission", async () => {
    const wrapper = mount(PolicyDetail, {
      props: { name: "POL-001" },
      global: { stubs: commonStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".nav-tab").find((n) => n.text().includes("Doküman"));
    expect(documentsTab).toBeTruthy();
    await documentsTab.trigger("click");

    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Doküman Yükle"));
    expect(uploadBtn).toBeFalsy();
  });

  it("opens upload modal when upload button is clicked", async () => {
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
      capabilities: { doctypes: { "AT Policy": { write: true } } },
    });

    const wrapper = mount(PolicyDetail, {
      props: { name: "POL-001" },
      global: { stubs: commonStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".nav-tab").find((n) => n.text().includes("Doküman"));
    await documentsTab.trigger("click");

    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Doküman Yükle"));
    expect(uploadBtn).toBeTruthy();
    await uploadBtn.trigger("click");

    const modalStub = wrapper.find(".upload-modal-stub");
    expect(modalStub.exists()).toBe(true);
    expect(modalStub.attributes("data-open")).toBe("true");
  });

  it("closes upload modal on close event from modal", async () => {
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
      capabilities: { doctypes: { "AT Policy": { write: true } } },
    });

    const wrapper = mount(PolicyDetail, {
      props: { name: "POL-001" },
      global: { stubs: commonStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".nav-tab").find((n) => n.text().includes("Doküman"));
    await documentsTab.trigger("click");

    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Doküman Yükle"));
    await uploadBtn.trigger("click");
    await Promise.resolve();

    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("true");

    const closeBtn = wrapper.find(".modal-stub-close");
    await closeBtn.trigger("click");
    await Promise.resolve();

    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("false");
  });

  it("reloads policy360 resource after successful upload", async () => {
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
      capabilities: { doctypes: { "AT Policy": { write: true } } },
    });

    const wrapper = mount(PolicyDetail, {
      props: { name: "POL-001" },
      global: { stubs: commonStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    const callsBefore = policy360Reload.mock.calls.length;

    const documentsTab = wrapper.findAll(".nav-tab").find((n) => n.text().includes("Doküman"));
    await documentsTab.trigger("click");

    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Doküman Yükle"));
    await uploadBtn.trigger("click");
    await Promise.resolve();

    const uploadedBtn = wrapper.find(".modal-stub-uploaded");
    await uploadedBtn.trigger("click");
    await Promise.resolve();
    await Promise.resolve();

    expect(policy360Reload.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("displays file_size in human-readable format on documents tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: { name: "POL-001" },
      global: { stubs: commonStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".nav-tab").find((n) => n.text().includes("Doküman"));
    expect(documentsTab).toBeTruthy();
    await documentsTab.trigger("click");

    expect(wrapper.text()).toContain("100.0 KB");
  });

  it("shows private badge for is_private files on documents tab", async () => {
    const wrapper = mount(PolicyDetail, {
      props: { name: "POL-001" },
      global: { stubs: commonStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    const documentsTab = wrapper.findAll(".nav-tab").find((n) => n.text().includes("Doküman"));
    expect(documentsTab).toBeTruthy();
    await documentsTab.trigger("click");

    expect(wrapper.text()).toContain("Gizli");
  });
});
