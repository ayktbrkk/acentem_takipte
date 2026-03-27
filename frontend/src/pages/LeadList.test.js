import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { reactive, ref } from "vue";

import LeadList from "./LeadList.vue";
import { useAuthStore } from "../stores/auth";

const resourceQueue = [];
const routeState = reactive({ query: {} });
const routerPush = vi.fn();
const routerReplace = vi.fn();
const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="body-content" /></div>`,
};

function makeResource(data, reloadResult = data) {
  const resource = reactive({
    data,
    loading: false,
    error: null,
    params: {},
    reload: vi.fn(async () => reloadResult),
    submit: vi.fn(async () => ({})),
    setData: vi.fn((value) => {
      resource.data = value;
    }),
  });
  return resource;
}

vi.mock("frappe-ui", () => ({
  createResource: () => resourceQueue.shift() || makeResource([]),
  Dialog: { template: `<div><slot /><slot name="actions" /><slot name="body-content" /></div>` },
}));

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn(), push: vi.fn(), replace: vi.fn(), resolve: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
    resolve: (location) => ({ fullPath: `/at/${location?.name || "lead-list"}` }),
  }),
}));

describe("LeadList runtime integration", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routeState.query = {};
    routerPush.mockReset();
    routerReplace.mockReset();
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

  it("loads lead rows and opens the quick lead dialog", async () => {
    const leadRows = {
      rows: [
        {
          name: "LEAD-001",
          first_name: "Ayşe",
          last_name: "Yılmaz",
          customer: "CUS-001",
          branch: "Motor",
          sales_entity: "SE-001",
          insurance_company: "COMP-001",
          status: "Open",
          converted_offer: "",
          converted_policy: "",
          estimated_gross_premium: 1200,
          modified: "2026-03-25T10:00:00Z",
        },
      ],
      total: 1,
    };

    resourceQueue.push(
      makeResource(leadRows, leadRows),
      makeResource({ lead: "LEAD-NEW" }, { lead: "LEAD-NEW" }),
      makeResource({}),
      makeResource([]),
      makeResource([]),
      makeResource([]),
      makeResource([]),
      makeResource({ selected_key: "default", custom_presets: [] }, { selected_key: "default", custom_presets: [] }),
      makeResource({}),
    );

    const wrapper = mount(LeadList, {
      global: {
        stubs: {
          ActionButton: true,
          DataTableCell: true,
          FilterBar: true,
          InlineActionRow: true,
          ListTable: true,
          MiniFactList: true,
          QuickCreateDialogShell: genericStub,
          QuickCreateFormRenderer: genericStub,
          QuickCustomerPicker: true,
          SectionPanel: genericStub,
          StatusBadge: true,
          TableEntityCell: true,
          TableFactsCell: true,
          WorkbenchPageLayout: genericStub,
          Dialog: genericStub,
        },
      },
    });

    expect(wrapper.vm.leadPageSummary.open).toBe(1);
    expect(wrapper.vm.leadListRows).toHaveLength(1);
    expect(wrapper.vm.leadListRows[0].name).toBe("LEAD-001");
    expect(wrapper.vm.leadListRows[0].customer).toBe("CUS-001");

    await wrapper.vm.openQuickLeadDialog();
    expect(wrapper.vm.showQuickLeadDialog).toBe(true);
  });
});
