import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { reactive, ref } from "vue";

import { usePolicyListRuntime } from "./usePolicyListRuntime";

const createdResources = [];
const exportCalls = [];

vi.mock("frappe-ui", () => ({
  createResource: (config = {}) => {
    const url = String(config?.url || "");
    const resource = {
      data: ref([]),
      loading: ref(false),
      error: ref(null),
      params: {},
      setData: vi.fn(),
      reload: vi.fn(async () => {
        createdResources.push({ url, params: { ...resource.params } });
        if (url === "frappe.client.get_list") {
          return [{ name: "POL-001", status: "Active", gross_premium: 1000 }];
        }
        return 1;
      }),
      submit: vi.fn(async () => ({})),
    };
    return resource;
  },
}));

vi.mock("../utils/listExport", () => ({
  openListExport: (...args) => {
    exportCalls.push(args[0]);
  },
}));

describe("usePolicyListRuntime", () => {
  beforeEach(() => {
    createdResources.length = 0;
    exportCalls.length = 0;
    setActivePinia(createPinia());
  });

  it("builds query params and refreshes the list", async () => {
    const filters = reactive({
      query: "TR-001",
      insurance_company: "Acme",
      end_date: "2026-04-01",
      status: "Active",
      customer: "Aykut",
      gross_min: "100",
      gross_max: "",
      sort: "modified desc",
    });
    const pagination = reactive({ page: 1, pageLength: 20, total: 0 });
    const policyStore = {
      state: reactive({ items: [], loading: false, pagination }),
      totalPages: 1,
      hasNextPage: false,
      startRow: 1,
      endRow: 0,
      setLoading: vi.fn((value) => {
        policyStore.state.loading = value;
      }),
      clearError: vi.fn(),
      setError: vi.fn(),
      applyListPayload: vi.fn((items, total) => {
        policyStore.state.items = items;
        policyStore.state.pagination.total = total;
      }),
    };
    const branchStore = reactive({ requestBranch: "IST" });

    const runtime = usePolicyListRuntime({
      t: (key) => key,
      branchStore,
      policyStore,
      filters,
      pagination,
    });

    await runtime.refreshPolicyList();

    expect(runtime.policyLoading.value).toBe(false);
    expect(createdResources[0].url).toBe("frappe.client.get_list");
    expect(createdResources[0].params.filters.office_branch).toBe("IST");
    expect(exportCalls).toHaveLength(0);

    runtime.downloadPolicyExport("xlsx");
    expect(exportCalls[0].screen).toBe("policy_list");
    expect(exportCalls[0].format).toBe("xlsx");
  });

  it("exposes pagination helpers", async () => {
    const filters = reactive({
      query: "",
      insurance_company: "",
      end_date: "",
      status: "",
      customer: "",
      gross_min: "",
      gross_max: "",
      sort: "modified desc",
    });
    const pagination = reactive({ page: 2, pageLength: 50, total: 0 });
    const policyStore = {
      state: reactive({ items: [], loading: false, pagination }),
      totalPages: 3,
      hasNextPage: true,
      startRow: 51,
      endRow: 100,
      setLoading: vi.fn(),
      clearError: vi.fn(),
      setError: vi.fn(),
      applyListPayload: vi.fn(),
    };

    const runtime = usePolicyListRuntime({
      t: (key) => key,
      branchStore: reactive({ requestBranch: "" }),
      policyStore,
      filters,
      pagination,
    });

    expect(runtime.policyListPage.value).toBe(2);
    expect(runtime.policyListPageSize.value).toBe(50);
    runtime.policyListPage.value = 3;
    expect(pagination.page).toBe(3);
  });
});
