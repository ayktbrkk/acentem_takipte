import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";

import AuxRecordDetail from "./AuxRecordDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();
const routeState = { fullPath: "/at/aux-records/notification-drafts/DRF-001", path: "/at/aux-records/notification-drafts/DRF-001" };
const detailReload = vi.fn();
const auxUpdateSubmitMock = vi.fn();
const sendDraftSubmitMock = vi.fn();
const retryOutboxSubmitMock = vi.fn();
const requeueOutboxSubmitMock = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("frappe-ui", () => ({
  createResource: (config = {}) => {
    const data = ref({});
    const url = String(config?.url || "");

    if (url.includes("frappe.client.get")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async (params = {}) => {
          detailReload();
          const payload = params?.doctype === "AT Ownership Assignment"
            ? {
                message: {
                  name: "ASN-001",
                  source_doctype: "AT Claim",
                  source_name: "CLM-001",
                  customer: "CUST-001",
                  policy: "POL-001",
                  office_branch: "IST",
                  assigned_to: "agent@example.com",
                  assignment_role: "Owner",
                  status: "Open",
                  priority: "High",
                  due_date: "2026-03-15",
                  notes: "Müşteri ile tekrar görüşülecek",
                  modified: "2026-03-09T10:00:00Z",
                  owner: "Administrator",
                },
              }
            : params?.doctype === "AT Task"
              ? {
                  message: {
                    name: "TASK-001",
                    task_title: "Poliçe yenileme kontrolu",
                    task_type: "Renewal",
                    source_doctype: "AT Policy",
                    source_name: "POL-001",
                    customer: "CUST-001",
                    policy: "POL-001",
                    office_branch: "IST",
                    assigned_to: "agent@example.com",
                    status: "Open",
                    priority: "High",
                    due_date: "2026-03-18",
                    notes: "Yenileme öncesi teklif kontrolu",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Notification Draft"
              ? {
                  message: {
                    name: "DRF-001",
                    status: "Draft",
                    channel: "Email",
                    customer: "CUST-001",
                    recipient: "customer@example.com",
                    reference_doctype: "AT Customer",
                    reference_name: "CUST-001",
                    template: "TPL-001",
                    event_key: "reminder_followup",
                    language: "tr",
                    subject: "Hatırlatma",
                    body: "Merhaba",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Notification Outbox"
              ? {
                  message: {
                    name: "OUT-001",
                    status: "Failed",
                    channel: "Email",
                    recipient: "customer@example.com",
                    provider: "SMTP",
                    priority: "High",
                    attempt_count: 2,
                    max_attempts: 5,
                    reference_doctype: "AT Customer",
                    reference_name: "CUST-001",
                    customer: "CUST-001",
                    error_message: "SMTP timeout",
                    response_log: "{\"error\":\"timeout\"}",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Reminder"
              ? {
                  message: {
                    name: "REM-001",
                    reminder_title: "Evrak hatırlatması",
                    source_doctype: "AT Customer",
                    source_name: "CUST-001",
                    customer: "CUST-001",
                    office_branch: "IST",
                    assigned_to: "agent@example.com",
                    status: "Open",
                    priority: "High",
                    remind_at: "2026-03-18T09:00:00Z",
                    notes: "Eksik evrak takibi",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Access Log"
              ? {
                  message: {
                    name: "LOG-001",
                    reference_doctype: "AT Campaign",
                    reference_name: "CMP-001",
                    viewed_by: "admin@example.com",
                    action: "Run",
                    action_summary: "Campaign executed via segment SEG-001",
                    decision_context: JSON.stringify([
                      "created=12",
                      "skipped=3",
                      "matched=15",
                    ]),
                    ip_address: "127.0.0.1",
                    viewed_on: "2026-03-09T11:00:00Z",
                  },
                }
            : {
                message: {
                  name: "SNAP-001",
                  customer: "CUST-001",
                  office_branch: "IST",
                  snapshot_date: "2026-03-09",
                  segment: "Gold",
                  value_band: "High",
                  claim_risk: "Medium",
                  score: 82,
                  source_version: "v1",
                  strengths_json: JSON.stringify(["2 aktif poliçe", "Yüksek toplam prim"]),
                  risks_json: JSON.stringify(["1 geciken taksit"]),
                  score_reason_json: JSON.stringify(["Yenileme penceresinde aktif poliçe mevcut"]),
                  modified: "2026-03-09T10:00:00Z",
                  owner: "Administrator",
                },
              };
          data.value = payload;
          return payload;
        }),
        submit: vi.fn(async () => ({})),
      };
    }

    if (url.includes("update_quick_aux_record")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: auxUpdateSubmitMock,
      };
    }

    if (url.includes("send_draft_now")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: sendDraftSubmitMock,
      };
    }

    if (url.includes("retry_outbox_item")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: retryOutboxSubmitMock,
      };
    }

    if (url.includes("requeue_outbox_item")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: requeueOutboxSubmitMock,
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
      reload: vi.fn(async () => ([])),
      submit: vi.fn(async () => ({})),
    };
  },
}));

const ActionButtonStub = {
  emits: ["click"],
  template: `<button class="action-button-stub" @click="$emit('click')"><slot /></button>`,
};

const DetailTabsBarStub = defineComponent({
  props: ["modelValue", "tabs"],
  emits: ["update:modelValue"],
  template: `
    <div>
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="detail-tab-stub"
        @click="$emit('update:modelValue', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
  `,
});

const DocSummaryGridStub = defineComponent({
  props: ["items"],
  template: `
    <dl class="doc-summary-grid-stub">
      <div v-for="item in items" :key="item.key">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>
  `,
});

const SectionCardHeaderStub = defineComponent({
  props: ["title", "count"],
  template: `
    <header class="section-card-header-stub">
      <h3>{{ title }}</h3>
      <span v-if="count != null">{{ count }}</span>
      <slot />
    </header>
  `,
});

const genericStub = {
  template: `<div><slot /><slot name="actions" /><slot name="trailing" /><slot name="footer" /></div>`,
};

describe("AuxRecordDetail customer segment snapshot rendering", () => {
  beforeEach(() => {
    routerPush.mockReset();
    detailReload.mockReset();
    auxUpdateSubmitMock.mockReset();
    sendDraftSubmitMock.mockReset();
    retryOutboxSubmitMock.mockReset();
    requeueOutboxSubmitMock.mockReset();
    auxUpdateSubmitMock.mockResolvedValue({ ok: true });
    sendDraftSubmitMock.mockResolvedValue({ ok: true });
    retryOutboxSubmitMock.mockResolvedValue({ ok: true });
    requeueOutboxSubmitMock.mockResolvedValue({ ok: true });
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "admin@example.com",
      full_name: "Admin",
      roles: ["System Manager"],
      preferred_home: "/app",
      interface_mode: "desk",
      locale: "tr",
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: true,
    });
  });

  it("renders snapshot context and signal summaries", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "customer-segment-snapshots",
        name: "SNAP-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(detailReload).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Snapshot Bağlamı");
    expect(wrapper.text()).toContain("Segment Sinyalleri");
    expect(wrapper.text()).toContain("Gold");
    expect(wrapper.text()).toContain("High");
    expect(wrapper.text()).toContain("82");
  });

  it("renders parsed signal blocks on logs tab", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "customer-segment-snapshots",
        name: "SNAP-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");

    expect(wrapper.text()).toContain("Güçlü Sinyaller");
    expect(wrapper.text()).toContain("Risk Sinyalleri");
    expect(wrapper.text()).toContain("Skor Gerekçeleri");
    expect(wrapper.text()).toContain("2 aktif poliçe");
    expect(wrapper.text()).toContain("1 geciken taksit");
    expect(wrapper.text()).toContain("Yenileme penceresinde aktif poliçe mevcut");
  });

  it("renders readable ownership assignment detail blocks", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "ownership-assignments",
        name: "ASN-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Atama Bağlamı");
    expect(wrapper.text()).toContain("Atama Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Hasar");
    expect(wrapper.text()).toContain("CLM-001");
    expect(wrapper.text()).toContain("agent@example.com");
    expect(wrapper.text()).toContain("High");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");

    expect(wrapper.text()).toContain("Atama Notları");
    expect(wrapper.text()).toContain("Müşteri ile tekrar görüşülecek");
  });

  it("updates ownership assignment lifecycle from detail header actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "ownership-assignments",
        name: "ASN-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const buttons = wrapper.findAll(".action-button-stub");

    await buttons.find((node) => node.text().includes("İşleme Al")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: {
        status: "In Progress",
      },
    });

    await buttons.find((node) => node.text().includes("Bloke Et")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: {
        status: "Blocked",
      },
    });

    await buttons.find((node) => node.text().includes("Kapat")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: {
        status: "Done",
      },
    });
    expect(detailReload).toHaveBeenCalled();
  });

  it("updates task lifecycle from detail header actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "tasks",
        name: "TASK-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const buttons = wrapper.findAll(".action-button-stub");

    await buttons.find((node) => node.text().includes("Takibe Al")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Task",
      name: "TASK-001",
      data: {
        status: "In Progress",
      },
    });

    await buttons.find((node) => node.text().includes("Bloke Et")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Task",
      name: "TASK-001",
      data: {
        status: "Blocked",
      },
    });

    await buttons.find((node) => node.text().includes("Tamamla")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Task",
      name: "TASK-001",
      data: {
        status: "Done",
      },
    });

    await buttons.find((node) => node.text().includes("İptal Et")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Task",
      name: "TASK-001",
      data: {
        status: "Cancelled",
      },
    });
  });

  it("updates reminder lifecycle from detail header actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "reminders",
        name: "REM-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const buttons = wrapper.findAll(".action-button-stub");

    await buttons.find((node) => node.text().includes("Tamamla")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Reminder",
      name: "REM-001",
      data: {
        status: "Done",
      },
    });

    await buttons.find((node) => node.text().includes("İptal Et")).trigger("click");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Reminder",
      name: "REM-001",
      data: {
        status: "Cancelled",
      },
    });
  });

  it("retries outbox lifecycle from detail header actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "notification-outbox",
        name: "OUT-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const retryButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Tekrar Dene"));
    await retryButton.trigger("click");

    expect(retryOutboxSubmitMock).toHaveBeenCalledWith({
      outbox_name: "OUT-001",
    });
    expect(detailReload).toHaveBeenCalled();
  });

  it("sends draft lifecycle from detail header actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "notification-drafts",
        name: "DRF-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const sendButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Hemen Gönder"));
    await sendButton.trigger("click");

    expect(sendDraftSubmitMock).toHaveBeenCalledWith({
      draft_name: "DRF-001",
    });
    expect(detailReload).toHaveBeenCalled();
  });

  it("opens communication center from notification draft detail header", async () => {
    routeState.fullPath = "/at/aux-records/notification-drafts/DRF-001";
    routeState.path = "/at/aux-records/notification-drafts/DRF-001";
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "notification-drafts",
        name: "DRF-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const button = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezi"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Notification Draft",
        reference_name: "DRF-001",
        reference_label: "reminder_followup",
        return_to: "/at/aux-records/notification-drafts/DRF-001",
      },
    });
  });

  it("opens communication center from reminder detail header", async () => {
    routeState.fullPath = "/at/aux-records/reminders/REM-001";
    routeState.path = "/at/aux-records/reminders/REM-001";
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "reminders",
        name: "REM-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const button = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezi"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Reminder",
        reference_name: "REM-001",
        reference_label: "Evrak hatırlatması",
        return_to: "/at/aux-records/reminders/REM-001",
      },
    });
  });

  it("opens communication center from task detail header", async () => {
    routeState.fullPath = "/at/aux-records/tasks/TASK-001";
    routeState.path = "/at/aux-records/tasks/TASK-001";
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "tasks",
        name: "TASK-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const button = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezi"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Task",
        reference_name: "TASK-001",
        reference_label: "Poliçe yenileme kontrolu",
        return_to: "/at/aux-records/tasks/TASK-001",
      },
    });
  });

  it("opens communication center from ownership assignment detail header", async () => {
    routeState.fullPath = "/at/aux-records/ownership-assignments/ASN-001";
    routeState.path = "/at/aux-records/ownership-assignments/ASN-001";
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "ownership-assignments",
        name: "ASN-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const button = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("İletişim Merkezi"));
    await button.trigger("click");

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Ownership Assignment",
        reference_name: "ASN-001",
        reference_label: "agent@example.com",
        return_to: "/at/aux-records/ownership-assignments/ASN-001",
      },
    });
  });

  it("requeues outbox lifecycle from detail header actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "notification-outbox",
        name: "OUT-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const requeueButton = wrapper.findAll(".action-button-stub").find((node) => node.text().includes("Kuyruğa Al"));
    await requeueButton.trigger("click");

    expect(requeueOutboxSubmitMock).toHaveBeenCalledWith({
      outbox_name: "OUT-001",
    });
    expect(detailReload).toHaveBeenCalled();
  });

  it("renders readable access log decision blocks", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "access-logs",
        name: "LOG-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          DocHeaderCard: genericStub,
          DocSummaryGrid: DocSummaryGridStub,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: SectionCardHeaderStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Kayıt Bağlamı");
    expect(wrapper.text()).toContain("Karar ve Eylem");
    expect(wrapper.text()).toContain("AT Campaign");
    expect(wrapper.text()).toContain("CMP-001");
    expect(wrapper.text()).toContain("Campaign executed via segment SEG-001");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");

    expect(wrapper.text()).toContain("Eylem Özeti");
    expect(wrapper.text()).toContain("Karar Bağlamı");
    expect(wrapper.text()).toContain("created=12");
    expect(wrapper.text()).toContain("skipped=3");
    expect(wrapper.text()).toContain("matched=15");
  });
});
