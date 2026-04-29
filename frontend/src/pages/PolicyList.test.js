import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import PolicyList from "./PolicyList.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePolicyStore } from "../stores/policy";

const routeState = reactive({
  name: "policy-list",
  path: "/policies",
  fullPath: "/policies",
  query: {},
  hash: "",
});

const routerPush = vi.fn();
const routerReplace = vi.fn();
const createdResources = [];
const resourceCallSequence = [];

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
    resolve: (target) => ({ fullPath: target?.path || "/policies" }),
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
    createdResources.push(config);
    const url = String(config?.url || "");

    if (url === "frappe.client.get_list" && config?.auto === false) {
      const data = ref([]);
      const resource = {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => {
          const label = resource.params?.doctype || config?.params?.doctype || "unknown";
          resourceCallSequence.push(`get_list:${label}`);
          return [
            {
              name: "POL-001",
              policy_no: "TR-001",
              customer: "CUST-001",
              status: "Active",
              gross_premium: 12000,
              commission_amount: 1200,
              gwp_try: 12000,
            },
            {
              name: "POL-002",
              policy_no: "TR-002",
              customer: "CUST-002",
              status: "KYT",
              gross_premium: 8000,
              commission_amount: 800,
              gwp_try: 8000,
            },
          ];
        }),
        submit: vi.fn(async () => ({})),
      };
      createdResources.push({ config, resource });
      return resource;
    }

    if (url === "frappe.client.get_count") {
      const resource = {
        data: ref(0),
        loading: ref(false),
        error: ref(null),
        params: {},
        setData: vi.fn(),
        reload: vi.fn(async () => {
          const label = resource.params?.doctype || config?.params?.doctype || "unknown";
          resourceCallSequence.push(`get_count:${label}`);
          return 2;
        }),
        submit: vi.fn(async () => ({})),
      };
      createdResources.push({ config, resource });
      return resource;
    }

    const resource = {
      data: ref([]),
      loading: ref(false),
      error: ref(null),
      params: config?.params || {},
      setData: vi.fn(),
      reload: vi.fn(async () => {
        resourceCallSequence.push(`reload:${url}`);
        return [];
      }),
      submit: vi.fn(async () => ({})),
    };
    createdResources.push({ config, resource });
    return resource;
  },
}));

const genericStub = {
  template:
    `<div><slot /><slot name="actions" /><slot name="filters" /><slot name="default" /><slot name="footer" /><slot name="body-content" /><slot name="advanced" /><slot name="header" /></div>`,
};

async function waitForPolicyStoreRows(policyStore, expectedLength, timeoutMs = 1000) {
  const startedAt = Date.now();
  while ((policyStore.state.items || []).length !== expectedLength && Date.now() - startedAt < timeoutMs) {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("PolicyList page store integration", () => {
  beforeEach(() => {
    routerPush.mockReset();
    routerReplace.mockReset();
    createdResources.length = 0;
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

  it("writes list payload and filter state into policy store", async () => {
    const policyStore = usePolicyStore();
    const applyListPayloadSpy = vi.spyOn(policyStore, "applyListPayload");

    const wrapper = mount(PolicyList, {
      global: {
        stubs: {
          Dialog: true,
          ActionButton: true,
          DataTableCell: genericStub,
          StatusBadge: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: genericStub,
          QuickCreateFormRenderer: true,
          QuickCreateLauncher: true,
          TableEntityCell: true,
          TableFactsCell: true,
          TablePagerFooter: genericStub,
          WorkbenchFilterToolbar: genericStub,
        },
      },
    });

    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
    await waitForPolicyStoreRows(policyStore, 2);
    expect(applyListPayloadSpy).toHaveBeenCalled();

    expect(policyStore.state.items).toHaveLength(2);
    expect(policyStore.state.pagination.total).toBe(2);
    expect(policyStore.startRow).toBe(1);
    expect(policyStore.endRow).toBe(2);
    expect(wrapper.text()).toContain("Liste Özeti");
    expect(wrapper.text()).toContain("Sayfa Boyutu");
    expect(wrapper.text()).toContain("20");

    const inputs = wrapper.findAll(".input");
    await inputs[0].setValue("TR-001");
    await inputs[5].setValue("50");

    expect(policyStore.state.filters.query).toBe("TR-001");
    expect(policyStore.state.pagination.pageLength).toBe(50);
    expect(wrapper.text()).toContain("50");

    await wrapper.find("button.btn-primary").trigger("click");
    expect(wrapper.vm.showQuickPolicyDialog).toBe(true);
  });

  it("loads only convertible offers for the quick policy source offer picker", async () => {
    mount(PolicyList, {
      global: {
        stubs: {
          Dialog: true,
          ActionButton: true,
          DataTableCell: genericStub,
          StatusBadge: true,
          InlineActionRow: genericStub,
          PageToolbar: genericStub,
          QuickCreateDialogShell: genericStub,
          QuickCreateFormRenderer: true,
          QuickCreateLauncher: true,
          TableEntityCell: true,
          TableFactsCell: true,
          TablePagerFooter: genericStub,
          WorkbenchFilterToolbar: genericStub,
        },
      },
    });

    const offerResource = createdResources.find(
      (entry) => entry?.config?.url === "frappe.client.get_list" && entry?.config?.params?.doctype === "AT Offer"
    );
    const presetReadResource = createdResources.find(
      (entry) => entry?.config?.url === "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state"
    );
    const presetWriteResource = createdResources.find(
      (entry) => entry?.config?.url === "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state"
    );

    expect(offerResource?.config?.params?.filters).toEqual({ status: ["in", ["Sent", "Accepted"]] });
    expect(presetReadResource).toBeTruthy();
    expect(presetReadResource?.resource?.reload).toHaveBeenCalledWith({ screen: "policy_list" });
    expect(resourceCallSequence.indexOf("reload:acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state")).toBeLessThan(
      resourceCallSequence.indexOf("get_list:AT Policy")
    );
    expect(presetWriteResource).toBeTruthy();
  });
});
