import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive, ref } from "vue";

import AuxWorkbench from "./AuxWorkbench.vue";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const routeState = reactive({
  path: "/reminders",
  fullPath: "/reminders",
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
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
  }),
}));

const resourceQueue = [];
let reminderMutationSubmit;

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

const tableEntityCellStub = {
  props: ["title", "facts"],
  template: `
    <div class="table-entity-cell-stub">
      <div class="table-entity-title">{{ title }}</div>
      <div v-for="fact in facts || []" :key="fact.label" class="table-entity-fact">
        {{ fact.label }}: {{ fact.value }}
      </div>
      <slot />
    </div>
  `,
};

const tableFactsCellStub = {
  props: ["items"],
  template: `
    <div class="table-facts-cell-stub">
      <div v-for="item in items || []" :key="item.label" class="table-fact-item">
        {{ item.label }}: {{ item.value }}
      </div>
      <slot />
    </div>
  `,
};

const actionButtonStub = {
  props: ["disabled"],
  emits: ["click"],
  template: `<button class="action-button-stub" :disabled="disabled" @click="$emit('click', $event)"><slot /></button>`,
};

const commonStubs = {
  PageToolbar: passthroughStub,
  WorkbenchFilterToolbar: passthroughStub,
  DataTableCell: simpleStub,
  TableEntityCell: tableEntityCellStub,
  TableFactsCell: tableFactsCellStub,
  TablePagerFooter: simpleStub,
  InlineActionRow: simpleStub,
  ActionButton: actionButtonStub,
  QuickCreateLauncher: simpleStub,
  QuickCreateManagedDialog: true,
  StatusBadge: true,
};

async function settle() {
  await nextTick();
  await flushPromises();
  await nextTick();
}

describe("AuxWorkbench reminders", () => {
  beforeEach(() => {
    routeState.path = "/reminders";
    routeState.fullPath = "/reminders";
    routeState.query = {};
    routeState.params = {};
    routeState.hash = "";
    routerPush.mockClear();
    routerReplace.mockClear();
    resourceQueue.length = 0;

    const reminderRows = [
      {
        name: "REM-001",
        reminder_title: "Teklif hatırlatması",
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

    reminderMutationSubmit = vi.fn(async () => ({}));

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
      { data: {}, submit: reminderMutationSubmit },
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
        stubs: commonStubs,
      },
    });

    await settle();

    expect(wrapper.text()).toContain("Toplam Hatırlatıcı");
    expect(wrapper.text()).toContain("Yüksek Öncelik");
    expect(wrapper.text()).toContain("Teklif hatırlatması");

    const completeButton = wrapper
      .findAll(".action-button-stub")
      .find((node) => node.text().includes("Tamamla"));

    expect(completeButton).toBeTruthy();
    await completeButton.trigger("click");

    expect(reminderMutationSubmit).toHaveBeenCalledWith({
      doctype: "AT Reminder",
      name: "REM-001",
      data: { status: "Done" },
    });
  });

  it("runs ownership assignment lifecycle row actions", async () => {
    resourceQueue.length = 0;

    const assignmentRows = [
      {
        name: "ASN-001",
        source_doctype: "AT Customer",
        source_name: "CUST-001",
        customer: "CUST-001",
        policy: "POL-001",
        assigned_to: "agent@example.com",
        assignment_role: "Owner",
        status: "Open",
        priority: "High",
        due_date: "2026-03-15",
        modified: "2026-03-09 12:00:00",
      },
    ];

    const mutationSubmit = vi.fn(async () => ({}));

    resourceQueue.push(
      {
        data: assignmentRows,
        reload: vi.fn(async function () {
          this.data.value = assignmentRows;
          return assignmentRows;
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

    routeState.path = "/ownership-assignments";
    routeState.fullPath = "/ownership-assignments";
    routeState.query = {};

    const wrapper = mount(AuxWorkbench, {
      props: { screenKey: "ownership-assignments" },
      global: {
        stubs: commonStubs,
      },
    });

    await settle();

    expect(wrapper.text()).toContain("agent@example.com");

    let buttons = wrapper.find("tbody tr").findAll(".action-button-stub");

    await buttons.find((node) => node.text().includes("Takibe Al")).trigger("click");
    expect(mutationSubmit).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: { status: "In Progress" },
    });

    await settle();
    buttons = wrapper.find("tbody tr").findAll(".action-button-stub");
    await buttons.find((node) => node.text().includes("Bloke Et")).trigger("click");
    expect(mutationSubmit).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: { status: "Blocked" },
    });

    await settle();
    buttons = wrapper.find("tbody tr").findAll(".action-button-stub");
    await buttons.find((node) => node.text().includes("Tamamla")).trigger("click");
    expect(mutationSubmit).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: { status: "Done" },
    });
  });

  it("opens communication center context from notification draft rows", async () => {
    resourceQueue.length = 0;

    const draftRows = [
      {
        name: "DRF-001",
        event_key: "reminder_followup",
        channel: "Email",
        customer: "CUST-001",
        recipient: "customer@example.com",
        reference_doctype: "AT Customer",
        reference_name: "CUST-001",
        template: "TPL-001",
        status: "Draft",
        sent_at: "",
        modified: "2026-03-09 12:00:00",
      },
    ];

    resourceQueue.push(
      {
        data: draftRows,
        reload: vi.fn(async function () {
          this.data.value = draftRows;
          return draftRows;
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
      { data: {}, submit: vi.fn(async () => ({})) },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    );

    routeState.path = "/notification-drafts";
    routeState.fullPath = "/notification-drafts";
    routeState.query = {};

    const wrapper = mount(AuxWorkbench, {
      props: { screenKey: "notification-drafts" },
      global: {
        stubs: commonStubs,
      },
    });

    await settle();

    const button = wrapper.find("tbody tr").findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezini Aç"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Notification Draft",
        reference_name: "DRF-001",
        reference_label: "reminder_followup",
        return_to: "/notification-drafts",
      },
    });
  });

  it("opens communication center context from notification outbox rows", async () => {
    resourceQueue.length = 0;

    const outboxRows = [
      {
        name: "OUT-001",
        event_key: "reminder_followup",
        channel: "Email",
        customer: "CUST-001",
        recipient: "customer@example.com",
        reference_doctype: "AT Customer",
        reference_name: "CUST-001",
        provider: "SMTP",
        status: "Failed",
        attempt_count: 2,
        next_retry_on: "2026-03-10 10:00:00",
        modified: "2026-03-09 12:00:00",
      },
    ];

    resourceQueue.push(
      {
        data: outboxRows,
        reload: vi.fn(async function () {
          this.data.value = outboxRows;
          return outboxRows;
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
      { data: {}, submit: vi.fn(async () => ({})) },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    );

    routeState.path = "/notification-outbox";
    routeState.fullPath = "/notification-outbox";
    routeState.query = {};

    const wrapper = mount(AuxWorkbench, {
      props: { screenKey: "notification-outbox" },
      global: {
        stubs: commonStubs,
      },
    });

    await settle();

    const button = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezini Aç"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush.mock.calls[0][0]).toEqual(expect.objectContaining({ name: "communication-center" }));
  });

  it("opens communication center context from reminder rows", async () => {
    resourceQueue.length = 0;

    const reminderRows = [
      {
        name: "REM-001",
        reminder_title: "Teklif hatırlatması",
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
      { data: {}, submit: vi.fn(async () => ({})) },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    );

    routeState.path = "/reminders";
    routeState.fullPath = "/reminders";
    routeState.query = {};

    const wrapper = mount(AuxWorkbench, {
      props: { screenKey: "reminders" },
      global: {
        stubs: commonStubs,
      },
    });

    await settle();

    const button = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezini Aç"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Reminder",
        reference_name: "REM-001",
        reference_label: "REM-001",
        return_to: "/reminders",
      },
    });
  });

  it("opens communication center context from task rows", async () => {
    resourceQueue.length = 0;

    const taskRows = [
      {
        name: "TASK-001",
        task_title: "Yenileme kontrolü",
        task_type: "Renewal",
        source_doctype: "AT Policy",
        source_name: "POL-001",
        customer: "CUST-001",
        assigned_to: "agent@example.com",
        status: "Open",
        priority: "High",
        due_date: "2026-03-10 10:00:00",
        modified: "2026-03-09 12:00:00",
      },
    ];

    resourceQueue.push(
      {
        data: taskRows,
        reload: vi.fn(async function () {
          this.data.value = taskRows;
          return taskRows;
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
      { data: {}, submit: vi.fn(async () => ({})) },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    );

    routeState.path = "/tasks";
    routeState.fullPath = "/tasks";
    routeState.query = {};

    const wrapper = mount(AuxWorkbench, {
      props: { screenKey: "tasks" },
      global: {
        stubs: commonStubs,
      },
    });

    await settle();

    const button = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezini Aç"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Task",
        reference_name: "TASK-001",
        reference_label: "TASK-001",
        return_to: "/tasks",
      },
    });
  });

  it("opens communication center context from ownership assignment rows", async () => {
    resourceQueue.length = 0;

    const assignmentRows = [
      {
        name: "ASN-001",
        source_doctype: "AT Customer",
        source_name: "CUST-001",
        customer: "CUST-001",
        policy: "POL-001",
        assigned_to: "agent@example.com",
        assignment_role: "Owner",
        status: "Open",
        priority: "High",
        due_date: "2026-03-15",
        modified: "2026-03-09 12:00:00",
      },
    ];

    resourceQueue.push(
      {
        data: assignmentRows,
        reload: vi.fn(async function () {
          this.data.value = assignmentRows;
          return assignmentRows;
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
      { data: {}, submit: vi.fn(async () => ({})) },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [] },
    );

    routeState.path = "/ownership-assignments";
    routeState.fullPath = "/ownership-assignments";
    routeState.query = {};

    const wrapper = mount(AuxWorkbench, {
      props: { screenKey: "ownership-assignments" },
      global: {
        stubs: commonStubs,
      },
    });

    await settle();

    const button = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezini Aç"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Ownership Assignment",
        reference_name: "ASN-001",
        reference_label: "ASN-001",
        return_to: "/ownership-assignments",
      },
    });
  });
});
