import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import AuxWorkbench from "./AuxWorkbench.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const routeState = reactive({
  path: "/reminders",
  query: {},
  params: {},
  hash: "",
});

const routerPush = vi.fn(async (target) => target);
const routerReplace = vi.fn(async (target) => {
  routeState.query = { ...(target.query || {}) };
  routeState.path = target.path || routeState.path;
});

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

const resourceQueue = [];

vi.mock("frappe-ui", () => ({
  createResource: () => {
    const next = resourceQueue.shift() || {};
    return {
      data: ref(next.data ?? []),
      loading: ref(next.loading ?? false),
      error: ref(next.error ?? null),
      params: next.params ?? {},
      setData: next.setData ?? ((payload) => payload),
      reload: next.reload ?? vi.fn(async () => (next.data ?? [])),
      submit: next.submit ?? vi.fn(async () => ({})),
    };
  },
}));

const passthroughStub = {
  template: `<div><slot name="actions" /><slot name="filters" /><slot name="header" /><slot /><slot name="footer" /><slot name="trailing" /></div>`,
};

const simpleStub = {
  template: `<div><slot /></div>`,
};

const actionButtonStub = {
  props: ["disabled"],
  emits: ["click"],
  template: `<button class="action-button-stub" :disabled="disabled" @click="$emit('click')"><slot /></button>`,
};

describe("AuxWorkbench reminders", () => {
  beforeEach(() => {
    routeState.path = "/reminders";
    routeState.query = {};
    routeState.params = {};
    routeState.hash = "";
    routerPush.mockClear();
    routerReplace.mockClear();
    resourceQueue.length = 0;

    const reminderRows = [
      {
        name: "REM-001",
        reminder_title: "Teklif hatirlatmasi",
        source_doctype: "AT Customer",
        source_name: "CUST-001",
        customer: "CUST-001",
        assigned_to: "agent@example.com",
        status: "Open",
        priority: "High",
        remind_at: "2026-03-10 10:00:00",
        modified: "2026-03-09 12:00:00",
      },
    ];

    const mutationSubmit = vi.fn(async () => ({}));

    resourceQueue.push(
      {
        data: reminderRows,
        reload: vi.fn(async function () {
          this.data.value = reminderRows;
          return reminderRows;
        }),
      },
      {
        data: 1,
        reload: vi.fn(async function () {
          this.data.value = 1;
          return 1;
        }),
      },
      { data: [] },
      { data: {} },
      { data: {} },
      { data: {} },
      { data: {} },
      { data: {}, submit: mutationSubmit },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    );

    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "Manager",
      roles: ["Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      capabilities: {},
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });

    const branchStore = useBranchStore();
    branchStore.hydrateFromSession();
  });

  it("renders reminder summary cards and completes a reminder row", async () => {
    const wrapper = mount(AuxWorkbench, {
      props: { screenKey: "reminders" },
      global: {
        stubs: {
          PageToolbar: passthroughStub,
          WorkbenchFilterToolbar: passthroughStub,
          DataTableShell: passthroughStub,
          DataTableCell: simpleStub,
          TableEntityCell: simpleStub,
          TableFactsCell: simpleStub,
          TablePagerFooter: simpleStub,
          InlineActionRow: simpleStub,
          ActionButton: actionButtonStub,
          QuickCreateLauncher: simpleStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await nextTick();
    await nextTick();

    expect(wrapper.text()).toContain("Toplam Hatirlatici");
    expect(wrapper.text()).toContain("Yuksek Oncelik");
    expect(wrapper.text()).toContain("Teklif hatirlatmasi");

    const completeButton = wrapper
      .findAll(".action-button-stub")
      .find((node) => node.text().includes("Tamamla"));

    expect(completeButton).toBeTruthy();
    await completeButton.trigger("click");

    const mutationResource = resourceQueue[7];
    expect(mutationResource.submit).toHaveBeenCalledWith({
      doctype: "AT Reminder",
      name: "REM-001",
      field: "status",
      value: "Done",
    });
  });
});
