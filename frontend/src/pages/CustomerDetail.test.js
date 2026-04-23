import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick, ref } from "vue";

import CustomerDetail from "./CustomerDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
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
          const payload = {
            customer: {
              name: "CUST-001",
              full_name: "Aykut Bekir",
              tax_id: "1234567890",
              phone: "05550000000",
              email: "aykut@example.com",
              office_branch: "IST",
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
              items: [{ name: "FILE-001", file_name: "kimlik.pdf", creation: "2026-03-09T08:00:00Z", document_kind: "Identity" }],
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
  props: ["title", "subtitle"],
  emits: ["click"],
  template: `
    <article class="meta-list-card-stub" @click="$emit('click')">
      <div class="title">{{ title }}</div>
      <div v-if="subtitle" class="subtitle">{{ subtitle }}</div>
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
          SectionPanel: { template: `<section><h2>{{ title }}</h2><slot /><slot name="trailing" /></section>`, props: ["title"] },
          SkeletonLoader: true,
          StatusBadge: true,
          WorkbenchFileUploadModal: true,
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
  });

  it("routes to related records from current actions", async () => {
    const wrapper = mountDetail();
    await nextTick();
    await Promise.resolve();

    await wrapper.findAll(".action-button-stub")[0].trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "customers-board" });

    await wrapper.findAll(".nav-tab")[1].trigger("click");
    await nextTick();
    await wrapper.findAll(".meta-list-card-stub")[0].trigger("click");
    expect(routerPush).toHaveBeenLastCalledWith({ name: "policy-detail", params: { name: "POL-001" } });
  });
});