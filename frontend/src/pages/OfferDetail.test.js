import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";

import OfferDetail from "./OfferDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();
const offerReload = vi.fn();
const payloadReload = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerPush,
    currentRoute: ref({ fullPath: "/at/offers/OF-001" }),
  }),
}));

vi.mock("frappe-ui", () => ({
  createResource: (config = {}) => {
    const data = ref({});
    const url = String(config?.url || "");
    const makeResource = (extra = {}) => ({
      data,
      loading: ref(false),
      error: ref(null),
      params: {},
      setData(payload) {
        data.value = payload;
      },
      reload: vi.fn(async () => ({})),
      submit: vi.fn(async () => ({})),
      ...extra,
    });

    if (url.includes("get_offer_detail_payload")) {
      return makeResource({
        reload: vi.fn(async () => {
          payloadReload();
          const payload = {
            related_offers: [
              { name: "OF-002", status: "Sent", gross_premium: 1234, currency: "TRY" },
            ],
            related_policies: [
              { name: "POL-001", status: "Active", gross_premium: 5555, currency: "TRY" },
            ],
            notification_drafts: [{ name: "ND-001" }],
            notification_outbox: [{ name: "NO-001" }],
            payments: [{ name: "PAY-001" }],
            renewals: [{ name: "REN-001" }],
            activity: [],
            source_lead: { name: "LEAD-001", display_name: "Lead One" },
            linked_policy: { name: "POL-001", policy_no: "P-100" },
            coverages: [{ name: "COV-001", coverage_name: "Collision", limit: 25000, premium: 250 }],
            documents: [{ name: "FILE-001", file_name: "offer.pdf", file_url: "/files/offer.pdf" }],
          };
          data.value = payload;
          return payload;
        }),
      });
    }

    if (url.includes("frappe.client.get_list")) {
      return makeResource();
    }

    if (url.includes("frappe.client.get")) {
      return makeResource({
        reload: vi.fn(async () => {
          offerReload();
          const payload = {
            name: "OF-001",
            offer_no: "OFF-1001",
            customer: "CUST-001",
            customer_name: "Aykut Bekir",
            branch: "Kasko",
            insurance_company: "Anadolu",
            status: "Sent",
            offer_date: "2026-03-10",
            valid_until: "2026-03-25",
            currency: "TRY",
            gross_premium: 12500,
            net_premium: 10250,
            tax_amount: 1250,
            commission_amount: 1500,
            source_lead: "LEAD-001",
            creation: "2026-03-10T10:00:00Z",
            modified: "2026-03-11T10:00:00Z",
            modified_by: "agent@example.com",
          };
          data.value = payload;
          return payload;
        }),
      });
    }

    return makeResource();
  },
}));

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click', $event)"><slot /></button>`,
};

const GenericStub = {
  template: `<div><slot /><slot name="trailing" /></div>`,
};

const HeroStripStub = defineComponent({
  props: ["cells"],
  template: `<div class="hero-strip-stub">{{ cells?.length || 0 }}</div>`,
});

describe("OfferDetail", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    routerPush.mockReset();
    offerReload.mockReset();
    payloadReload.mockReset();
    const authStore = useAuthStore();
    authStore.setLocale("en");
  });

  it("renders offer detail data and sections", async () => {
    const wrapper = mount(OfferDetail, {
      props: { name: "OF-001" },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          HeroStrip: HeroStripStub,
          SectionPanel: GenericStub,
          FieldGroup: GenericStub,
          OfferDetailTopbar: { template: `<div class="offer-detail-topbar-stub">Offer Details</div>` },
          OfferDetailMainContent: { template: `<div class="offer-detail-main-stub">Main</div>` },
          OfferDetailSidebar: { template: `<div class="offer-detail-sidebar-stub">Sidebar</div>` },
        },
      },
    });

    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Offer Details");
    expect(wrapper.find(".offer-detail-main-stub").exists()).toBe(true);
    expect(wrapper.find(".offer-detail-sidebar-stub").exists()).toBe(true);
    expect(offerReload).toHaveBeenCalled();
    expect(payloadReload).toHaveBeenCalled();
  });
});
