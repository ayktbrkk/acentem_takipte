import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, nextTick, ref } from "vue";

import ClaimDetail from "./ClaimDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();
const claimDetailReload = vi.fn();
const archiveSubmitMock = vi.fn();
const restoreSubmitMock = vi.fn();
const deleteSubmitMock = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("../utils/documentOpen", () => ({
  openDocumentInNewTab: vi.fn(async () => true),
}));

vi.mock("frappe-ui", () => ({
  createResource: (config = {}) => {
    const data = ref({});
    const url = String(config?.url || "");

    if (url.includes("get_claim_detail_payload")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => {
          claimDetailReload();
          const payload = {
            claim: {
              name: "CLM-001",
              customer: "CUST-001",
              customer_name: "Aykut Bekir",
              policy: "POL-001",
              incident_date: "2026-03-01",
              claim_status: "Under Review",
              claim_type: "Kasko",
              insurance_company: "Anadolu",
              assigned_expert: "Expert A",
              currency: "TRY",
              estimated_amount: 5000,
              total_amount: 5000,
            },
            documents: [
              {
                name: "AT-DOC-001",
                file: "FILE-001",
                display_name: "hasar-raporu.pdf",
                document_kind: "Claim",
                document_sub_type: "Damage Photo",
                status: "Active",
                is_verified: 1,
                creation: "2026-03-18T09:00:00Z",
              },
            ],
            payments: [
              {
                name: "PAY-001",
                payment_no: "P-001",
                payment_date: "2026-03-10",
                amount: 1200,
                currency: "TRY",
                status: "Paid",
              },
            ],
          };
          data.value = payload;
          return payload;
        }),
        submit: vi.fn(async () => ({})),
      };
    }

    if (url.includes("archive_document")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: archiveSubmitMock,
      };
    }

    if (url.includes("restore_document")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: restoreSubmitMock,
      };
    }

    if (url.includes("permanent_delete_document")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: deleteSubmitMock,
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

const MetaListCardStub = defineComponent({
  props: ["title", "subtitle", "meta"],
  template: `
    <article class="meta-list-card-stub">
      <div>{{ title }}</div>
      <div v-if="subtitle">{{ subtitle }}</div>
      <div v-if="meta">{{ meta }}</div>
      <slot />
      <slot name="trailing" />
    </article>
  `,
});

const ListTableStub = defineComponent({
  props: ["columns", "rows", "loading"],
  template: `<div class="list-table-stub">{{ rows?.length || 0 }}</div>`,
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

const commonStubs = {
  ActionButton: ActionButtonStub,
  MetaListCard: MetaListCardStub,
  FieldGroup: FieldGroupStub,
  HeroStrip: HeroStripStub,
  SectionPanel: { template: `<section><h2>{{ title }}</h2><slot /><slot name="trailing" /></section>`, props: ["title"] },
  SkeletonLoader: true,
  StatusBadge: true,
  ListTable: ListTableStub,
  WorkbenchFileUploadModal: WorkbenchFileUploadModalStub,
  WorkbenchPageLayout: { props: ["title", "subtitle"], template: `<div><h1>{{ title }}</h1><div v-if="subtitle">{{ subtitle }}</div><slot name="actions" /><slot name="metrics" /><slot /></div>` },
};

function mountDetail() {
  return mount(ClaimDetail, {
    props: { name: "CLM-001" },
    global: { stubs: commonStubs },
  });
}

describe("ClaimDetail page", () => {
  beforeEach(() => {
    routerPush.mockReset();
    claimDetailReload.mockReset();
    archiveSubmitMock.mockReset();
    restoreSubmitMock.mockReset();
    deleteSubmitMock.mockReset();
    archiveSubmitMock.mockResolvedValue({ ok: true });
    restoreSubmitMock.mockResolvedValue({ ok: true });
    deleteSubmitMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("confirm", vi.fn(() => true));
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

  it("loads the claim detail payload on mount", async () => {
    mountDetail();
    await Promise.resolve();
    await Promise.resolve();
    expect(claimDetailReload).toHaveBeenCalledTimes(1);
  });

  it("renders the current claim overview contract", async () => {
    const wrapper = mountDetail();
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain("Hasar Detayı");
    expect(wrapper.text()).toContain("CLM-001");
    expect(wrapper.text()).toContain("Müşteri Detayları");
    expect(wrapper.text()).toContain("Dosyalar");
    expect(wrapper.text()).toContain("hasar-raporu.pdf");
  });

  it("routes to claims list and document center", async () => {
    const wrapper = mountDetail();
    await Promise.resolve();
    await Promise.resolve();

    const backButton = wrapper.findAll(".action-button-stub").find((button) => button.text().includes("Listeye Dön"));
    await backButton.trigger("click");
    expect(routerPush).toHaveBeenLastCalledWith({ name: "claims-board" });

    const documentCenterButton = wrapper.findAll(".action-button-stub").find((button) => button.text().includes("Doküman Merkezine Git"));
    await documentCenterButton.trigger("click");
    expect(routerPush).toHaveBeenLastCalledWith({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Claim",
        reference_name: "CLM-001",
      },
    });
  });

  it("shows upload action only when claim write permission exists", async () => {
    const withoutPermission = mountDetail();
    await Promise.resolve();
    await Promise.resolve();
    expect(withoutPermission.findAll(".action-button-stub").some((button) => button.text().includes("Doküman Yükle"))).toBe(false);

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
      capabilities: { doctypes: { "AT Claim": { write: true } } },
    });

    const withPermission = mountDetail();
    await Promise.resolve();
    await Promise.resolve();
    expect(withPermission.findAll(".action-button-stub").some((button) => button.text().includes("Doküman Yükle"))).toBe(true);
  });

  it("opens and closes the upload modal", async () => {
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
      capabilities: { doctypes: { "AT Claim": { write: true } } },
    });

    const wrapper = mountDetail();
    await Promise.resolve();
    await Promise.resolve();

    const uploadButton = wrapper.findAll(".action-button-stub").find((button) => button.text().includes("Doküman Yükle"));
    await uploadButton.trigger("click");
    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("true");

    await wrapper.find(".modal-stub-close").trigger("click");
    await nextTick();
    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("false");
  });

  it("renders restored document actions and verified badge", async () => {
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
      capabilities: { doctypes: { "AT Document": { write: true, delete: true } } },
    });

    const wrapper = mountDetail();
    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain("hasar-raporu.pdf");
    expect(wrapper.text()).toContain("Damage Photo");
    expect(wrapper.text()).toContain("Doğrulandı");
    expect(wrapper.text()).toContain("Arşivle");
    expect(wrapper.text()).toContain("Kalıcı Sil");
    expect(wrapper.text()).toContain("Dokümanı Aç");
  });
});
