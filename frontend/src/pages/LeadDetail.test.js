import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick, ref } from "vue";

import LeadDetail from "./LeadDetail.vue";
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
    currentRoute: ref({ fullPath: "/at/leads/LEAD-001" }),
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

    if (url.includes("get_lead_detail_payload")) {
      return makeResource({
        reload: vi.fn(async () => {
          payloadReload();
          const payload = {
            lead: {
              name: "LEAD-001",
              first_name: "Aykut",
              last_name: "Bekir",
              customer: "CUST-001",
              phone: "05550000000",
              email: "aykut@example.com",
              industry: "Finance",
              status: "Open",
              creation: "2026-01-01",
            },
            customer: {
              name: "CUST-001",
              full_name: "Aykut Bekir",
              phone: "05550000000",
              email: "aykut@example.com",
            },
            offers: [],
            policies: [],
            activity: [],
            documents: [{ name: "FILE-001", file_name: "lead.pdf", file_url: "/files/lead.pdf" }],
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
  template: `<div><slot /><slot name="actions" /><slot name="trailing" /></div>`,
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

describe("LeadDetail", () => {
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
          "AT Lead": { write: true },
          "AT Document": { create: true },
        },
      },
    });
  });

  function mountDetail() {
    return mount(LeadDetail, {
      props: { name: "LEAD-001" },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          HeroStrip: HeroStripStub,
          SectionPanel: GenericStub,
          FieldGroup: GenericStub,
          SkeletonLoader: true,
          WorkbenchFileUploadModal: WorkbenchFileUploadModalStub,
        },
      },
    });
  }

  it("renders lead detail data and document actions", async () => {
    const wrapper = mountDetail();

    await nextTick();
    await Promise.resolve();

    expect(wrapper.text()).toContain("lead.pdf");
    expect(wrapper.text()).toContain("Upload");
    expect(wrapper.text()).toContain("View All Documents");
    expect(payloadReload).toHaveBeenCalled();
  });

  it("routes lead documents action and opens document records", async () => {
    const wrapper = mountDetail();

    await nextTick();
    await Promise.resolve();

    const buttons = wrapper.findAll(".action-button-stub");
  const documentCenterButton = buttons.find((btn) => btn.text().includes("View All Documents"));
  const openDocumentButton = wrapper.findAll("button").find((btn) => btn.text().includes("external-link"));

    await documentCenterButton.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Lead",
        reference_name: "LEAD-001",
      },
    });

    await openDocumentButton.trigger("click");
    expect(openDocumentInNewTab).toHaveBeenCalledWith(
      expect.objectContaining({ name: "FILE-001", file_name: "lead.pdf" }),
      expect.objectContaining({ referenceDoctype: "AT Lead", referenceName: "LEAD-001" })
    );
  });

  it("opens and closes the upload modal", async () => {
    const wrapper = mountDetail();

    await nextTick();
    await Promise.resolve();

    const uploadButton = wrapper.findAll(".action-button-stub").find((btn) => btn.text().includes("Upload"));
    await uploadButton.trigger("click");
    await nextTick();

    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("true");

    await wrapper.find(".modal-stub-close").trigger("click");
    await nextTick();
    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("false");
  });
});
