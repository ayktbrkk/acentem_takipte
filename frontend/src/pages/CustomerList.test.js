import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import CustomerList from "./CustomerList.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useCustomerStore } from "../stores/customer";

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
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

vi.mock("frappe-ui", () => ({
  Dialog: {
    template: `<div class="dialog-stub"><slot name="body-content" /></div>`,
  },
  createResource: (config = {}) => {
    const url = String(config?.url || "");

    if (url.includes("get_customer_workbench_rows")) {
      const data = ref({ rows: [], total: 0 });
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
            { name: "CUST-001", full_name: "Aykut Bekir", active_policy_count: 2, open_offer_count: 1 },
            { name: "CUST-002", full_name: "Ayse Demir", active_policy_count: 1, open_offer_count: 0 },
          ],
          total: 2,
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

describe("CustomerList page store integration", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerReplace.mockReset();
    routeState.query = {};
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

    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  it("writes list payload and pagination state into customer store", async () => {
    const wrapper = mount(CustomerList, {
      global: {
        stubs: {
          Dialog: true,
          ActionButton: true,
          DataTableCell: genericStub,
          DataTableShell: genericStub,
          InlineActionRow: genericStub,
          MiniFactList: true,
          PageToolbar: genericStub,
          QuickCreateDialogShell: genericStub,
          QuickCreateFormRenderer: true,
          QuickCreateLauncher: true,
          TableEntityCell: true,
          TableFactsCell: true,
          TablePagerFooter: genericStub,
          WorkbenchFilterToolbar: genericStub,
          StatusBadge: true,
        },
      },
    });

    const customerStore = useCustomerStore();
    await nextTick();

    expect(customerStore.state.items).toHaveLength(2);
    expect(customerStore.state.pagination.total).toBe(2);
    expect(customerStore.startRow).toBe(1);
    expect(customerStore.endRow).toBe(2);
    expect(wrapper.text()).toContain("Liste Ozeti");
    expect(wrapper.text()).toContain("Sayfa Boyutu");
    expect(wrapper.text()).toContain("20");

    const inputs = wrapper.findAll(".input");
    await inputs[0].setValue("aykut");
    await inputs[4].setValue("50");

    expect(customerStore.state.filters.query).toBe("aykut");
    expect(customerStore.state.pagination.pageLength).toBe(50);
    expect(wrapper.text()).toContain("50");
  });
});
