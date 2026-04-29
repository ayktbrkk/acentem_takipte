import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

import PolicyDetail from "./PolicyDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();
const policyDetailReload = vi.fn();
const confirmMock = vi.fn();
const archiveSubmitMock = vi.fn();
const restoreSubmitMock = vi.fn();
const deleteSubmitMock = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("../utils/documentOpen", () => ({
  openDocumentInNewTab: vi.fn(async () => true),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  createResource: (config = {}) => {
    const data = ref({});
    const url = String(config?.url || "");

    if (url.includes("get_policy_detail_payload")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => {
          policyDetailReload();
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
            },
            customer: {
              name: "CUST-001",
              full_name: "Aykut Bekir",
              phone: "05550000000",
              email: "aykut@example.com",
            },
            endorsements: [],
            payments: [],
            files: [
              {
                name: "FILE-001",
                file_name: "police.pdf",
                file_url: "/private/files/police.pdf",
                file_size: 102400,
                is_private: 1,
                creation: "2026-03-09T09:00:00Z",
              },
            ],
            at_documents: [
              {
                name: "AT-DOC-001",
                display_name: "POL001_RUHSAT_20260309_001.PDF",
                file: "FILE-AT-001",
                file_url: "/private/files/police-at-doc.pdf",
                file_size: 204800,
                is_private: 1,
                is_verified: 1,
                status: "Active",
                document_sub_type: "Vehicle Registration",
                creation: "2026-03-09T10:00:00Z",
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

const WorkbenchFileUploadModalStub = {
  props: ["open", "attachedToDoctype", "attachedToName"],
  emits: ["close", "uploaded"],
  template: `
    <div class="upload-modal-stub" :data-open="String(open)" :data-doctype="attachedToDoctype" :data-name="attachedToName">
      <button class="modal-stub-close" @click="$emit('close')">Close</button>
      <button class="modal-stub-uploaded" @click="$emit('uploaded')">Uploaded</button>
    </div>
  `,
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
    </div>
  `,
};

const StandardCustomerCardStub = {
  props: ["title"],
  emits: ["view-full"],
  template: `
    <section class="standard-customer-card-stub">
      <h3>{{ title }}</h3>
      <button class="action-button-stub" @click="$emit('view-full')">Profilin Tamamını Gör</button>
      <slot />
    </section>
  `,
};

const SectionPanelStub = {
  props: ["title"],
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

const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="trailing" /></div>`,
};

const commonStubs = {
  ActionButton: ActionButtonStub,
  MetaListCard: MetaListCardStub,
  SectionPanel: SectionPanelStub,
  WorkbenchFileUploadModal: WorkbenchFileUploadModalStub,
  HeroStrip: genericStub,
  WorkbenchPageLayout: genericStub,
  ListTable: genericStub,
  StatusBadge: true,
  StandardCustomerCard: StandardCustomerCardStub,
  EditableCard: genericStub,
  SkeletonLoader: genericStub,
};

function mountPolicyDetail() {
  return mount(PolicyDetail, {
    props: { name: "POL-001" },
    global: { stubs: commonStubs },
  });
}

describe("PolicyDetail document management", () => {
  beforeEach(() => {
    routerPush.mockReset();
    policyDetailReload.mockReset();
    archiveSubmitMock.mockReset();
    restoreSubmitMock.mockReset();
    deleteSubmitMock.mockReset();
    confirmMock.mockReset();
    archiveSubmitMock.mockResolvedValue({ ok: true });
    restoreSubmitMock.mockResolvedValue({ ok: true });
    deleteSubmitMock.mockResolvedValue({ ok: true });
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

  it("loads the policy detail payload on mount", async () => {
    mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    expect(policyDetailReload).toHaveBeenCalledTimes(1);
  });

  it("renders the new overview layout", async () => {
    const wrapper = mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Müşteri Bilgileri");
    expect(wrapper.text()).toContain("Dokümanlar");
    expect(wrapper.text()).toContain("Listeye Dön");
    expect(wrapper.text()).toContain("Yenile");
    expect(wrapper.text()).toContain("Profilin Tamamını Gör");
  });

  it("routes back to policy list and customer detail", async () => {
    const wrapper = mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    const clickByText = async (label) => {
      const button = wrapper.findAll("button").find((candidate) => candidate.text().includes(label));
      expect(button).toBeTruthy();
      await button.trigger("click");
    };

    await clickByText("Listeye Dön");
    expect(routerPush).toHaveBeenLastCalledWith({ name: "policy-list" });

    await clickByText("Profilin Tamamını Gör");
    expect(routerPush).toHaveBeenLastCalledWith({ name: "customer-detail", params: { name: "CUST-001" } });
  });

  it("routes policy documents action to document center", async () => {
    const wrapper = mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    const openButton = wrapper.findAll("button").find((node) => node.text().includes("Tüm Dokümanları Görüntüle"));
    expect(openButton).toBeTruthy();
    await openButton.trigger("click");

    expect(routerPush).toHaveBeenLastCalledWith({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Policy",
        reference_name: "POL-001",
      },
    });
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

    const wrapper = mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Yükle"));
    expect(uploadBtn).toBeTruthy();
  });

  it("hides upload button when user lacks write permission", async () => {
    const wrapper = mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Yükle"));
    expect(uploadBtn).toBeFalsy();
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
      capabilities: { doctypes: { "AT Policy": { write: true } } },
    });

    const wrapper = mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Yükle"));
    await uploadBtn.trigger("click");

    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("true");

    await wrapper.find(".modal-stub-close").trigger("click");
    await Promise.resolve();

    expect(wrapper.find(".upload-modal-stub").attributes("data-open")).toBe("false");
  });

  it("reloads policy detail after a successful upload", async () => {
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

    const wrapper = mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    const callsBefore = policyDetailReload.mock.calls.length;
    const uploadBtn = wrapper.findAll("button").find((n) => n.text().includes("Yükle"));
    await uploadBtn.trigger("click");
    await wrapper.find(".modal-stub-uploaded").trigger("click");
    await Promise.resolve();
    await Promise.resolve();

    expect(policyDetailReload.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("renders document cards with file metadata", async () => {
    const wrapper = mountPolicyDetail();

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("POL001_RUHSAT_20260309_001.PDF");
    expect(wrapper.text()).toContain("Vehicle Registration");
    expect(wrapper.text()).toContain("external-link");
  });
});
