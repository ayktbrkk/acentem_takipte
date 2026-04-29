import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import CustomerList from "./CustomerList.vue";
import { useAuthStore } from "../stores/auth";

const routeState = reactive({
  name: "customer-list",
  path: "/customers",
  fullPath: "/customers",
  query: {},
  hash: "",
});

const routerPush = vi.fn();
const routerReplace = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  Dialog: {
    template: `<div class="dialog-stub"><slot name="body-content" /></div>`,
  },
  createResource: (config = {}) => {
    const url = String(config?.url || "");

    if (url.includes("get_customer_workbench_rows")) {
      const data = ref({ rows: [], total: 0, active_count: 0, individual_count: 0, corporate_count: 0 });
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({
          rows: [
            { name: "CUST-001", full_name: "Aykut Bekir", consent_status: "Granted", customer_type: "Individual" },
            { name: "CUST-002", full_name: "Ayse Demir", consent_status: "Unknown", customer_type: "Corporate" },
          ],
          total: 2,
          active_count: 2,
          individual_count: 1,
          corporate_count: 1,
        })),
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

const genericStub = {
  template:
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="footer" /><slot name="body-content" /><slot name="advanced" /><slot name="header" /></div>`,
};

async function mountCustomerList(locale = "tr") {
  const authStore = useAuthStore();
  authStore.applyContext({
    user: "agent@example.com",
    full_name: "Agent",
    roles: ["Agent"],
    preferred_home: "/at",
    interface_mode: "spa",
    locale,
    office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
    default_office_branch: "IST",
    can_access_all_office_branches: false,
  });

  const wrapper = mount(CustomerList, {
    global: {
      stubs: {
        ActionButton: true,
        FilterBar: true,
        ListTable: true,
        SectionPanel: genericStub,
        SkeletonLoader: true,
        StatusBadge: true,
        WorkbenchPageLayout: genericStub,
      },
    },
  });

  await nextTick();
  return wrapper;
}

describe("CustomerList page", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerReplace.mockReset();
    routeState.query = {};
    setActivePinia(createPinia());
  });

  it("renders the current Turkish customer list contract", async () => {
    const wrapper = await mountCustomerList("tr");

    expect(wrapper.vm.summary.total).toBe(2);
    expect(wrapper.vm.rows).toHaveLength(2);
    expect(wrapper.vm.rows[0].identity_primary).toBe("Aykut Bekir");
    expect(wrapper.vm.rows[0].consent_status_label).toBe("Onay Verildi");

    const columns = Object.fromEntries(wrapper.vm.columns.map((col) => [col.key, col.label]));
    expect(columns.identity_primary).toBe("Kimlik");
    expect(columns.contact_primary).toBe("İletişim");
    expect(columns.personal_primary).toBe("Kişisel");
    expect(columns.mgmt_primary).toBe("Yönetim");
    expect(wrapper.vm.filterConfig[0].label).toBe("KVKK Onayı");
  });

  it("renders the current English customer list contract", async () => {
    const wrapper = await mountCustomerList("en");

    expect(wrapper.vm.summary.total).toBe(2);
    expect(wrapper.vm.rows[0].identity_primary).toBe("Aykut Bekir");
    expect(wrapper.vm.rows[0].consent_status_label).toBe("Granted");

    const columns = Object.fromEntries(wrapper.vm.columns.map((col) => [col.key, col.label]));
    expect(columns.identity_primary).toBe("Identity");
    expect(columns.contact_primary).toBe("Contact");
    expect(columns.personal_primary).toBe("Personal");
    expect(columns.mgmt_primary).toBe("Management");
    expect(wrapper.vm.filterConfig[0].label).toBe("Consent");
  });
});