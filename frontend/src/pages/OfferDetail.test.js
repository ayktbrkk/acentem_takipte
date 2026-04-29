import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick, ref } from "vue";

import OfferDetail from "./OfferDetail.vue";
import { useAuthStore } from "../stores/auth";
import { openDocumentInNewTab } from "../utils/documentOpen";

const routerPush = vi.fn();
const payloadReload = vi.fn();

vi.mock("../utils/documentOpen", () => ({
  openDocumentInNewTab: vi.fn(async () => true),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerPush,
    currentRoute: ref({ fullPath: "/at/offers/OF-001" }),
  }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
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
            offer: {
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
            },
            customer: {
              name: "CUST-001",
              full_name: "Aykut Bekir",
              phone: "05550000000",
              email: "aykut@example.com",
            },
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

describe("OfferDetail", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    routerPush.mockReset();
    payloadReload.mockReset();
    vi.mocked(openDocumentInNewTab).mockClear();
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "agent@example.com",
      full_name: "Agent",
      roles: ["Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "en",
      capabilities: {
        doctypes: {
          "AT Offer": { write: true },
          "AT Document": { create: true },
        },
      },
    });
  });

  function mountDetail() {
    return mount(OfferDetail, {
      props: { name: "OF-001" },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          HeroStrip: HeroStripStub,
          SectionPanel: GenericStub,
          FieldGroup: GenericStub,
          StatusBadge: true,
          StandardCustomerCard: GenericStub,
          EditableCard: GenericStub,
          MetaListCard: GenericStub,
          SkeletonLoader: true,
          WorkbenchFileUploadModal: WorkbenchFileUploadModalStub,
        },
      },
    });
  }

  it("renders offer detail data and document actions", async () => {
    const wrapper = mountDetail();

    await nextTick();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Offer Detail");
    expect(wrapper.text()).toContain("offer.pdf");
    expect(wrapper.text()).toContain("Upload");
    expect(wrapper.text()).toContain("View All Documents");
    expect(wrapper.text()).toContain("external-link");
    expect(payloadReload).toHaveBeenCalled();
  });

  it("routes offer documents action and opens document records", async () => {
    const wrapper = mountDetail();

    await nextTick();
    await Promise.resolve();

    const buttons = wrapper.findAll(".action-button-stub");
    const documentCenterButton = buttons.find((button) => button.text().includes("View All Documents"));
    const openDocumentButton = wrapper.find("button.text-slate-400");

    await documentCenterButton.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Offer",
        reference_name: "OF-001",
      },
    });

    await openDocumentButton.trigger("click");
    expect(openDocumentInNewTab).toHaveBeenCalledWith(
      expect.objectContaining({ name: "FILE-001", file_name: "offer.pdf" }),
      expect.objectContaining({ referenceDoctype: "AT Offer", referenceName: "OF-001" })
    );
  });

  it("opens and closes the upload modal", async () => {
    const wrapper = mountDetail();

    await nextTick();
    await Promise.resolve();

    const uploadButton = wrapper.findAll(".action-button-stub").find((button) => button.text().includes("Upload"));
    await uploadButton.trigger("click");
    await nextTick();

    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("true");

    await wrapper.find(".modal-stub-close").trigger("click");
    await nextTick();
    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("false");
  });
});
