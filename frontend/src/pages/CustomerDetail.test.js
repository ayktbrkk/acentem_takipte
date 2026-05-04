import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick, ref } from "vue";

import CustomerDetail from "./CustomerDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();

vi.mock("../utils/documentOpen", () => ({
  openDocumentInNewTab: vi.fn(async () => true),
}));

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRouter: () => ({
    push: routerPush,
    currentRoute: ref({ fullPath: "/customers/CUST-001" }),
  }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
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
          const payload = {
            customer: {
              name: "CUST-001",
              full_name: "Aykut Bekir",
              tax_id: "1234567890",
              phone: "05550000000",
              email: "aykut@example.com",
              birth_date: "1975-10-01",
              gender: "Male",
              marital_status: "Single",
              occupation: "Operator",
              office_branch: "IST",
              assigned_agent: "Unknown",
            },
            summary: {
              active_policy_count: 1,
              open_claim_count: 1,
              total_premium: 12500,
              overdue_payment_amount: 1200,
            },
            portfolio: {
              policies: [{ name: "POL-001", policy_no: "P-100", status: "Active", insurance_company: "Anadolu", branch: "Motor", start_date: "2026-03-01", gross_premium: 12500 }],
              offers: [{ name: "OFF-001", status: "Sent", insurance_company: "Anadolu", offer_date: "2026-03-02", gross_premium: 9500 }],
              claims: [{ name: "CLM-001", policy: "POL-001", claim_status: "Open", reported_date: "2026-03-03", claim_amount: 1500 }],
            },
            communication: {
              timeline: [{ timestamp: "2026-03-01T10:00:00Z", title: "Call note", meta: "Agent", payload: { content: "Customer called" } }],
            },
            documents: {
              items: [{ name: "FILE-001", file: "FILE-001", file_name: "kimlik.pdf", file_url: "/private/files/kimlik.pdf", file_size: 102400, is_private: 1, is_verified: 1, creation: "2026-03-09T08:00:00Z", document_kind: "Identity", status: "Active", reference_doctype: "AT Customer" }],
            },
            insights: {
              snapshot_date: "2026-03-09",
              active_policy_count: 1,
              policy_total_premium: 12500,
              open_claim_count: 1,
              upcoming_renewal_count: 0,
            },
            cross_sell: {
              has_cross_sell_opportunity: true,
              opportunity_branches: [{ branch: "Sağlık" }],
            },
            operations: {},
          };
          data.value = payload;
          return payload;
        }),
        submit: vi.fn(async () => ({})),
      };
    }

    if (url.includes("frappe.client.get_list") && config?.params?.doctype === "User") {
      const data = ref([
        { name: "agent@example.com", full_name: "Agent User", enabled: 1, user_type: "System User" },
        { name: "manager@example.com", full_name: "Manager User", enabled: 1, user_type: "System User" },
        { name: "viewer@example.com", full_name: "Viewer User", enabled: 1, user_type: "System User" },
      ]);
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: config?.params || {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => data.value),
        submit: vi.fn(async () => ({})),
      };
    }

    if (url.includes("frappe.client.get_list") && config?.params?.doctype === "Has Role") {
      const data = ref([
        { parent: "agent@example.com", role: "Agent", parenttype: "User" },
        { parent: "manager@example.com", role: "System Manager", parenttype: "User" },
      ]);
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: config?.params || {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => data.value),
        submit: vi.fn(async () => ({})),
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

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click', $event)"><slot /></button>`,
};

const MetaListCardStub = defineComponent({
  props: ["title", "subtitle", "description"],
  emits: ["click"],
  template: `
    <article class="meta-list-card-stub" @click="$emit('click')">
      <div class="title">{{ title }}</div>
      <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
      <div v-if="description" class="description">{{ description }}</div>
      <slot />
      <slot name="trailing" />
      <slot name="footer" />
    </article>
  `,
});

const MiniFactListStub = defineComponent({
  props: ["items"],
  template: `<ul><li v-for="item in items" :key="item.label">{{ item.label }} {{ item.value }}</li></ul>`,
});

const FieldGroupStub = defineComponent({
  props: ["fields"],
  template: `<div><div v-for="field in fields" :key="field.label">{{ field.label }} {{ field.value }}</div></div>`,
});

const HeroStripStub = defineComponent({
  props: ["cells"],
  template: `<div><div v-for="cell in cells" :key="cell.label">{{ cell.label }} {{ cell.value }}</div></div>`,
});

const WorkbenchFileUploadModalStub = defineComponent({
  props: ["open"],
  emits: ["close", "uploaded"],
  template: `
    <div class="upload-modal-stub" :data-open="String(open)">
      <button class="modal-stub-close" @click="$emit('close')">Close</button>
      <button class="modal-stub-uploaded" @click="$emit('uploaded')">Uploaded</button>
    </div>
  `,
});

describe("CustomerDetail page", () => {
  beforeEach(() => {
    routerPush.mockReset();
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

  function mountDetail() {
    return mount(CustomerDetail, {
      props: { name: "CUST-001" },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          FieldGroup: FieldGroupStub,
          HeroStrip: HeroStripStub,
          MetaListCard: MetaListCardStub,
          MiniFactList: MiniFactListStub,
          EditableCard: MetaListCardStub,
          SectionPanel: { template: `<section><h2>{{ title }}</h2><slot /><slot name="trailing" /></section>`, props: ["title"] },
          SkeletonLoader: true,
          StatusBadge: true,
          WorkbenchFileUploadModal: WorkbenchFileUploadModalStub,
          QuickCreateManagedDialog: true,
        },
      },
    });
  }

  it("renders the current overview contract", async () => {
    const wrapper = mountDetail();
    await nextTick();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Aykut Bekir");
    expect(wrapper.text()).toContain("Toplam Prim");
    expect(wrapper.findAll(".nav-tab")).toHaveLength(4);
    expect(wrapper.vm.tabs.map((tab) => tab.key)).toEqual(["overview", "portfolio", "activity", "operations"]);
    expect(wrapper.vm.moreProfileFields.find((field) => field.key === "gender")?.displayValue).toBe("Erkek");
    expect(wrapper.vm.moreProfileFields.find((field) => field.key === "marital_status")?.displayValue).toBe("Bekar");
    expect(wrapper.vm.moreProfileFields.find((field) => field.key === "occupation")?.displayValue).toBe("Operator");
    expect(wrapper.vm.operationalFields.find((field) => field.key === "assigned_agent")?.displayValue).toBe("Belirtilmemiş");
    expect(wrapper.vm.operationalFields.find((field) => field.key === "assigned_agent")?.type).toBe("autocomplete");
    expect(wrapper.vm.operationalFields.find((field) => field.key === "assigned_agent")?.options).toEqual([
      { value: "agent@example.com", label: "Agent User (agent@example.com)" },
      { value: "manager@example.com", label: "Manager User (manager@example.com)" },
    ]);
    expect(wrapper.vm.operationalFields.find((field) => field.key === "office_branch")?.disabled).toBe(true);
  });

  it("switches tabs and renders portfolio, activity, and document content", async () => {
    const wrapper = mountDetail();
    await nextTick();
    await Promise.resolve();

    await wrapper.findAll(".nav-tab")[1].trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("P-100");
    expect(wrapper.text()).toContain("OFF-001");
    expect(wrapper.text()).toContain("CLM-001");

    await wrapper.findAll(".nav-tab")[2].trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("Call note");
    expect(wrapper.text()).toContain("Customer called");

    await wrapper.findAll(".nav-tab")[3].trigger("click");
    await nextTick();
    expect(wrapper.text()).toContain("kimlik.pdf");
    expect(wrapper.text()).toContain("100.0 KB");
    expect(wrapper.text()).toContain("Gizli");
    expect(wrapper.text()).toContain("Doğrulandı");
  });

  it("routes to related records from current actions", async () => {
    const wrapper = mountDetail();
    await nextTick();
    await Promise.resolve();

    await wrapper.findAll(".action-button-stub")[0].trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "customer-list" });

    await wrapper.findAll(".action-button-stub")[1].trigger("click");
    expect(routerPush).toHaveBeenCalledWith({
      name: "offer-board",
      query: {
        quick_create: "1",
        prefill_customer: "CUST-001",
        prefill_customer_label: "Aykut Bekir",
      },
    });

    await wrapper.findAll(".nav-tab")[1].trigger("click");
    await nextTick();
    const policyCard = wrapper.findAll(".meta-list-card-stub").find((card) => card.text().includes("P-100"));
    expect(policyCard).toBeTruthy();
    await policyCard.trigger("click");
    await nextTick();
    expect(routerPush).toHaveBeenLastCalledWith({ name: "policy-detail", params: { name: "POL-001" } });
  });

  it("routes operations documents action to document center", async () => {
    const wrapper = mountDetail();
    await nextTick();
    await Promise.resolve();

    await wrapper.findAll(".nav-tab")[3].trigger("click");
    await nextTick();

    const documentCenterButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Doküman Merkezine Git"));
    expect(documentCenterButton).toBeTruthy();
    await documentCenterButton.trigger("click");

    expect(routerPush).toHaveBeenLastCalledWith({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Customer",
        reference_name: "CUST-001",
      },
    });
  });

  it("shows upload action only when customer document write permission exists", async () => {
    const wrapperWithoutPermission = mountDetail();
    await nextTick();
    await Promise.resolve();
    await wrapperWithoutPermission.findAll(".nav-tab")[3].trigger("click");
    await nextTick();
    expect(wrapperWithoutPermission.findAll(".action-button-stub").some((node) => node.text().includes("Doküman Yükle"))).toBe(false);

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
      capabilities: { doctypes: { "AT Customer": { write: true } } },
    });

    const wrapperWithPermission = mountDetail();
    await nextTick();
    await Promise.resolve();
    await wrapperWithPermission.findAll(".nav-tab")[3].trigger("click");
    await nextTick();
    expect(wrapperWithPermission.findAll(".action-button-stub").some((node) => node.text().includes("Doküman Yükle"))).toBe(true);
  });
});