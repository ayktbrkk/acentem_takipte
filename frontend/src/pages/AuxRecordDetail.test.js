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
const archiveDocumentSubmitMock = vi.fn();
const restoreDocumentSubmitMock = vi.fn();
const permanentDeleteDocumentSubmitMock = vi.fn();
const resolveReconciliationSubmitMock = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRoute: () => routeState,
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
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
                    task_title: "Poliçe yenileme kontrolü",
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
                    notes: "Yenileme öncesi teklif kontrolü",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Accounting Entry"
              ? {
                  message: {
                    name: "ACC-001",
                    status: "Synced",
                    entry_type: "Policy",
                    source_doctype: "AT Policy",
                    source_name: "POL-001",
                    policy: "POL-001",
                    customer: "CUST-001",
                    insurance_company: "IC-001",
                    currency: "TRY",
                    local_amount_try: 12500,
                    external_amount_try: 12450,
                    difference_try: 50,
                    needs_reconciliation: 1,
                    external_ref: "EXT-REF-001",
                    last_synced_on: "2026-03-09T09:30:00Z",
                    sync_attempt_count: 2,
                    payload_json: "{\"policy\":\"POL-001\"}",
                    error_message: "",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Reconciliation Item"
              ? {
                  message: {
                    name: "REC-001",
                    status: "Open",
                    accounting_entry: "ACC-001",
                    source_doctype: "AT Policy",
                    source_name: "POL-001",
                    mismatch_type: "Amount",
                    local_amount_try: 12500,
                    external_amount_try: 12450,
                    difference_try: 50,
                    resolution_action: "",
                    unique_key: "POL-001-202603",
                    notes: "Harici tutar farkı",
                    details_json: "{\"delta\":50}",
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
            : params?.doctype === "AT Activity"
              ? {
                  message: {
                    name: "ACT-001",
                    activity_title: "Müşteri ziyareti",
                    activity_type: "Visit",
                    source_doctype: "AT Customer",
                    source_name: "CUST-001",
                    customer: "CUST-001",
                    policy: "POL-001",
                    office_branch: "IST",
                    assigned_to: "agent@example.com",
                    status: "Logged",
                    activity_at: "2026-03-10T14:00:00Z",
                    notes: "Yüz yüze görüşme yapıldı",
                    modified: "2026-03-10T14:30:00Z",
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
            : params?.doctype === "AT Document"
              ? {
                  message: {
                    name: "DOC-001",
                    display_name: "POLICE_KOPYASI_20260522_001.pdf",
                    secondary_file_name: "Poliçe Kopyası",
                    original_file_name: "police-kopyasi-murat-can.pdf",
                    file: "FILE-001",
                    reference_doctype: "AT Policy",
                    reference_name: "POL-001",
                    policy: "POL-001",
                    customer: "CUST-001",
                    claim: "",
                    document_kind: "Policy",
                    document_sub_type: "Policy Copy",
                    is_sensitive: 1,
                    is_verified: 0,
                    document_date: "2026-05-22",
                    upload_date: "2026-05-22",
                    sequence_no: 1,
                    version_no: 1,
                    status: "Active",
                    notes: "İmzalı poliçe kopyası",
                    creation: "2026-05-22T08:30:00Z",
                    modified: "2026-05-22T08:45:00Z",
                    owner: "agent@example.com",
                  },
                }
            : params?.doctype === "AT Customer Relation"
              ? {
                  message: {
                    name: "REL-001",
                    customer: "CUST-001",
                    related_customer: "CUST-002",
                    relation_type: "Spouse",
                    is_household: 1,
                    notes: "Aynı hanede yaşayan eş kaydı",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Insured Asset"
              ? {
                  message: {
                    name: "AST-001",
                    customer: "CUST-001",
                    policy: "POL-001",
                    asset_type: "Vehicle",
                    asset_label: "34 ABC 123",
                    asset_identifier: "VIN-123456",
                    notes: "Kasko kapsamındaki araç",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Insurance Company"
              ? {
                  message: {
                    name: "IC-001",
                    company_name: "Anadolu Sigorta",
                    company_code: "ANS",
                    is_active: 1,
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Branch"
              ? {
                  message: {
                    name: "BR-001",
                    branch_name: "Kasko",
                    branch_code: "KAS",
                    insurance_company: "IC-001",
                    is_active: 1,
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Sales Entity"
              ? {
                  message: {
                    name: "SE-001",
                    full_name: "Merkez Acente",
                    entity_type: "Agency",
                    office_branch: "IST",
                    parent_entity: "",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Notification Template"
              ? {
                  message: {
                    name: "TPL-001",
                    template_key: "reminder_followup",
                    event_key: "reminder_followup",
                    channel: "Email",
                    language: "tr",
                    subject: "Hatırlatma şablonu",
                    body_template: "Merhaba {{ customer_name }}",
                    is_active: 1,
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Call Note"
              ? {
                  message: {
                    name: "CN-001",
                    customer: "CUST-001",
                    policy: "POL-001",
                    claim: "",
                    channel: "Phone Call",
                    direction: "Outbound",
                    call_status: "Completed",
                    call_outcome: "Teklif gönderildi",
                    note_at: "2026-03-10T10:30:00Z",
                    next_follow_up_on: "2026-03-17",
                    notes: "Müşteri yenileme teklifini değerlendirecek",
                    office_branch: "IST",
                    modified: "2026-03-10T10:35:00Z",
                    owner: "agent@example.com",
                  },
                }
            : params?.doctype === "AT Segment"
              ? {
                  message: {
                    name: "SEG-001",
                    segment_name: "Yenileme Riski",
                    segment_type: "Dynamic",
                    channel_focus: "WHATSAPP",
                    office_branch: "IST",
                    status: "Active",
                    estimated_customer_count: 128,
                    criteria_json: "{\"renewal_window_days\":30}",
                    notes: "Yüksek primli yenileme segmenti",
                    modified: "2026-03-09T10:00:00Z",
                    owner: "Administrator",
                  },
                }
            : params?.doctype === "AT Campaign"
              ? {
                  message: {
                    name: "CMP-001",
                    campaign_name: "Mart Yenileme",
                    segment: "SEG-001",
                    template: "TPL-001",
                    channel: "WHATSAPP",
                    office_branch: "IST",
                    status: "Running",
                    scheduled_for: "2026-03-12T09:00:00Z",
                    sent_count: 45,
                    matched_customer_count: 52,
                    skipped_count: 7,
                    last_run_on: "2026-03-11T14:00:00Z",
                    last_run_summary: "45 gönderim, 7 atlama",
                    notes: "Mart yenileme kampanyası",
                    modified: "2026-03-11T14:05:00Z",
                    owner: "Administrator",
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
        submit: archiveDocumentSubmitMock,
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
        submit: restoreDocumentSubmitMock,
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
        submit: permanentDeleteDocumentSubmitMock,
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

    if (url.includes("resolve_item")) {
      return {
        data,
        loading: ref(false),
        error: ref(null),
        params: {},
        setData(payload) {
          data.value = payload;
        },
        reload: vi.fn(async () => ({})),
        submit: resolveReconciliationSubmitMock,
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
    archiveDocumentSubmitMock.mockReset();
    restoreDocumentSubmitMock.mockReset();
    permanentDeleteDocumentSubmitMock.mockReset();
    auxUpdateSubmitMock.mockResolvedValue({ ok: true });
    sendDraftSubmitMock.mockResolvedValue({ ok: true });
    retryOutboxSubmitMock.mockResolvedValue({ ok: true });
    requeueOutboxSubmitMock.mockResolvedValue({ ok: true });
    archiveDocumentSubmitMock.mockResolvedValue({ ok: true });
    restoreDocumentSubmitMock.mockResolvedValue({ ok: true });
    permanentDeleteDocumentSubmitMock.mockResolvedValue({ ok: true });
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
    authStore.can = vi.fn(() => true);
    globalThis.confirm = vi.fn(() => true);
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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
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
    expect(wrapper.text()).toContain("Yüksek");
    expect(wrapper.text()).toContain("İşleme Al");
    expect(wrapper.text()).toContain("Bloke Et");
    expect(wrapper.text()).toContain("Kapat");

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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    await wrapper.vm.markAssignmentLifecycle("In Progress");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: {
        status: "In Progress",
      },
    });

    await wrapper.vm.markAssignmentLifecycle("Blocked");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Ownership Assignment",
      name: "ASN-001",
      data: {
        status: "Blocked",
      },
    });

    await wrapper.vm.markAssignmentLifecycle("Done");
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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    await wrapper.vm.markTaskLifecycle("In Progress");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Task",
      name: "TASK-001",
      data: {
        status: "In Progress",
      },
    });

    await wrapper.vm.markTaskLifecycle("Blocked");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Task",
      name: "TASK-001",
      data: {
        status: "Blocked",
      },
    });

    await wrapper.vm.markTaskLifecycle("Done");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Task",
      name: "TASK-001",
      data: {
        status: "Done",
      },
    });

    await wrapper.vm.markTaskLifecycle("Cancelled");
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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Hatırlatıcıyı Tamamla");
    expect(wrapper.text()).toContain("Hatırlatıcıyı İptal Et");
    expect(wrapper.text()).toContain("Hatırlatıcı Yaşam Döngüsü");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("Hatırlatıcı Bağlamı");

    await wrapper.vm.markReminderLifecycle("Done");
    expect(auxUpdateSubmitMock).toHaveBeenCalledWith({
      doctype: "AT Reminder",
      name: "REM-001",
      data: {
        status: "Done",
      },
    });

    await wrapper.vm.markReminderLifecycle("Cancelled");
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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    await wrapper.vm.retryOutboxLifecycle();

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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    await wrapper.vm.sendDraftLifecycle();

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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    wrapper.vm.openCommunicationContext();

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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    wrapper.vm.openCommunicationContext();

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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    wrapper.vm.openCommunicationContext();

    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        reference_doctype: "AT Task",
        reference_name: "TASK-001",
        reference_label: "Poliçe yenileme kontrolü",
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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    wrapper.vm.openCommunicationContext();

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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    await wrapper.vm.requeueOutboxLifecycle();

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
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
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

  it("renders document detail groups aligned with upload semantics", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "at-documents",
        name: "DOC-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Dosya");
    expect(wrapper.text()).toContain("Doküman Detayları");
    expect(wrapper.text()).toContain("Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Doküman Adı");
    expect(wrapper.text()).toContain("Poliçe Kopyası");
    expect(wrapper.text()).toContain("Hassas Veri");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");

    expect(wrapper.text()).toContain("Bağlı Kayıt");
    expect(wrapper.text()).toContain("Bağlantı Türü");
    expect(wrapper.text()).toContain("Poliçe");
  });

  it("runs at-document lifecycle actions from detail header", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "at-documents",
        name: "DOC-001",
      },
      global: {
        stubs: {
          ActionButton: ActionButtonStub,
          DetailActionRow: genericStub,
          DetailTabsBar: DetailTabsBarStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Arşivle");
    expect(wrapper.text()).toContain("Kalıcı Sil");

    await wrapper.vm.archiveDocument();
    expect(archiveDocumentSubmitMock).toHaveBeenCalledWith({ docname: "DOC-001" });

    await wrapper.vm.permanentDeleteDocument();
    expect(permanentDeleteDocumentSubmitMock).toHaveBeenCalledWith({ docname: "DOC-001" });
  });
});

describe("AuxRecordDetail customer and document detail pages", () => {
  const detailStubs = {
    ActionButton: ActionButtonStub,
    DetailActionRow: genericStub,
    DetailTabsBar: DetailTabsBarStub,
    MetaListCard: genericStub,
    QuickCreateManagedDialog: true,
    StatusBadge: true,
    SkeletonLoader: true,
  };

  beforeEach(() => {
    routerPush.mockReset();
    detailReload.mockReset();
    archiveDocumentSubmitMock.mockReset();
    permanentDeleteDocumentSubmitMock.mockReset();
    archiveDocumentSubmitMock.mockResolvedValue({ ok: true });
    permanentDeleteDocumentSubmitMock.mockResolvedValue({ ok: true });
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "admin@example.com",
      full_name: "Admin",
      roles: ["System Manager"],
      preferred_home: "/app",
      locale: "tr",
    });
    authStore.can = vi.fn(() => true);
    globalThis.confirm = vi.fn(() => true);
  });

  it("renders customer relation detail with context groups and related customers", async () => {
    routeState.fullPath = "/at/customer-relations/REL-001";
    routeState.path = "/at/customer-relations/REL-001";
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "customer-relations", name: "REL-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("CUST-002");
    expect(wrapper.text()).toContain("İlişki Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Eş");
    expect(wrapper.text()).toContain("Hane Halkı");
    expect(wrapper.text()).toContain("Listeye Dön");
    expect(wrapper.text()).toContain("Bağlı Kayda Git");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("İlişki Bağlamı");
    expect(wrapper.text()).toContain("CUST-001");
    expect(wrapper.text()).toContain("CUST-002");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("Aynı hanede yaşayan eş kaydı");
  });

  it("renders insured asset detail with context groups and policy panel", async () => {
    routeState.fullPath = "/at/insured-assets/AST-001";
    routeState.path = "/at/insured-assets/AST-001";
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "insured-assets", name: "AST-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("34 ABC 123");
    expect(wrapper.text()).toContain("Varlık Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Araç");
    expect(wrapper.text()).toContain("VIN-123456");
    expect(wrapper.text()).toContain("Bağlı Kayda Git");
    expect(wrapper.text()).toContain("Listeye Dön");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("Varlık Bağlamı");
    expect(wrapper.text()).toContain("CUST-001");
    expect(wrapper.text()).toContain("POL-001");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("Kasko kapsamındaki araç");
  });

  it("renders document detail groups aligned with upload semantics", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: {
        screenKey: "at-documents",
        name: "DOC-001",
      },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Dosya");
    expect(wrapper.text()).toContain("Doküman Detayları");
    expect(wrapper.text()).toContain("Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Poliçe Kopyası");
    expect(wrapper.text()).toContain("Arşivle");
    expect(wrapper.text()).toContain("Dokümanı Aç");
    expect(wrapper.text()).toContain("Bağlı Kayda Git");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("Bağlı Kayıt");
    expect(wrapper.text()).toContain("POL-001");
  });
});

describe("AuxRecordDetail master data detail pages", () => {
  const detailStubs = {
    ActionButton: ActionButtonStub,
    DetailActionRow: genericStub,
    DetailTabsBar: DetailTabsBarStub,
    MetaListCard: genericStub,
    QuickCreateManagedDialog: true,
    StatusBadge: true,
    SkeletonLoader: true,
  };

  beforeEach(() => {
    routerPush.mockReset();
    detailReload.mockReset();
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "admin@example.com",
      full_name: "Admin",
      roles: ["System Manager"],
      preferred_home: "/app",
      locale: "tr",
    });
  });

  it("renders company detail with localized field labels and summary", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "companies", name: "IC-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Anadolu Sigorta");
    expect(wrapper.text()).toContain("Şirket Adı");
    expect(wrapper.text()).toContain("Şirket Kodu");
    expect(wrapper.text()).toContain("Listeye Dön");
    expect(wrapper.text()).toContain("Durum Özeti");
  });

  it("renders branch detail with insurance company context", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "branches", name: "BR-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Kasko");
    expect(wrapper.text()).toContain("Branş Adı");
    expect(wrapper.text()).toContain("Sigorta Şirketi");
    expect(wrapper.text()).toContain("IC-001");
  });

  it("renders sales entity detail with entity type summary", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "sales-entities", name: "SE-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Merkez Acente");
    expect(wrapper.text()).toContain("Birim Türü");
    expect(wrapper.text()).toContain("Agency");
    expect(wrapper.text()).toContain("Ofis Şubesi");
  });
});

describe("AuxRecordDetail notification detail pages", () => {
  const detailStubs = {
    ActionButton: ActionButtonStub,
    DetailActionRow: genericStub,
    DetailTabsBar: DetailTabsBarStub,
    MetaListCard: genericStub,
    QuickCreateManagedDialog: true,
    StatusBadge: true,
    SkeletonLoader: true,
  };

  beforeEach(() => {
    routerPush.mockReset();
    detailReload.mockReset();
    sendDraftSubmitMock.mockReset();
    retryOutboxSubmitMock.mockReset();
    requeueOutboxSubmitMock.mockReset();
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
      locale: "tr",
    });
  });

  it("renders notification draft detail with localized labels and send action", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "notification-drafts", name: "DRF-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("reminder_followup");
    expect(wrapper.text()).toContain("Taslak Bilgisi");
    expect(wrapper.text()).toContain("Alıcı");
    expect(wrapper.text()).toContain("Listeye Dön");
    expect(wrapper.text()).toContain("Hemen Gönder");
    expect(wrapper.text()).toContain("İletişim Merkezini Aç");
    expect(wrapper.text()).toContain("Durum Özeti");
  });

  it("renders notification outbox detail with delivery groups and retry/requeue actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "notification-outbox", name: "OUT-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Tekrar Dene");
    expect(wrapper.text()).toContain("Kuyruğa Al");
    expect(wrapper.text()).toContain("Listeye Dön");

    const operationsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Operasyon"));
    await operationsTab.trigger("click");

    expect(wrapper.text()).toContain("Gönderim Özeti");
    expect(wrapper.text()).toContain("Deneme ve Zamanlama");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");

    expect(wrapper.text()).toContain("SMTP timeout");
  });

  it("renders notification template detail with template meta and body block", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "templates", name: "TPL-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("reminder_followup");
    expect(wrapper.text()).toContain("Şablon Özeti");
    expect(wrapper.text()).toContain("Şablon Anahtarı");
    expect(wrapper.text()).toContain("Yayın ve Kayıt");
    expect(wrapper.text()).toContain("Listeye Dön");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");

    expect(wrapper.text()).toContain("Şablon İçeriği");
    expect(wrapper.text()).toContain("Merhaba {{ customer_name }}");
  });
});

describe("AuxRecordDetail finance and task detail pages", () => {
  const detailStubs = {
    ActionButton: ActionButtonStub,
    DetailActionRow: genericStub,
    DetailTabsBar: DetailTabsBarStub,
    MetaListCard: genericStub,
    QuickCreateManagedDialog: true,
    StatusBadge: true,
    SkeletonLoader: true,
  };

  beforeEach(() => {
    routerPush.mockReset();
    detailReload.mockReset();
    auxUpdateSubmitMock.mockReset();
    resolveReconciliationSubmitMock.mockReset();
    auxUpdateSubmitMock.mockResolvedValue({ ok: true });
    resolveReconciliationSubmitMock.mockResolvedValue({ ok: true });
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "admin@example.com",
      full_name: "Admin",
      roles: ["System Manager"],
      preferred_home: "/app",
      locale: "tr",
    });
  });

  it("renders accounting entry detail with finance groups and localized labels", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "accounting-entries", name: "ACC-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Tutarlar");
    expect(wrapper.text()).toContain("Yerel Tutar (TRY)");
    expect(wrapper.text()).toContain("12.500");
    expect(wrapper.text()).toContain("Listeye Dön");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("Kaynak Bağlamı");

    const operationsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Operasyon"));
    await operationsTab.trigger("click");
    expect(wrapper.text()).toContain("Senkronizasyon");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("Payload (JSON)");
  });

  it("renders reconciliation item detail with resolve actions and amount groups", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "reconciliation-items", name: "REC-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Kaynak ve Kayıt Bağlamı");
    expect(wrapper.text()).toContain("Mutabakat Tutar Özeti");
    expect(wrapper.text()).toContain("Çözüm ve Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Çöz");
    expect(wrapper.text()).toContain("Yoksay");
    expect(wrapper.text()).toContain("Fark (TRY)");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("Harici tutar farkı");
  });

  it("resolves reconciliation item from detail header actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "reconciliation-items", name: "REC-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    await wrapper.vm.resolveReconciliationLifecycle("Matched");
    expect(resolveReconciliationSubmitMock).toHaveBeenCalledWith({
      item_name: "REC-001",
      resolution_action: "Matched",
    });
    expect(detailReload).toHaveBeenCalled();
  });

  it("renders task detail with lifecycle groups and header actions", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "tasks", name: "TASK-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Görev Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Takibe Al");
    expect(wrapper.text()).toContain("Tamamla");
    expect(wrapper.text()).toContain("İletişim Merkezini Aç");
    expect(wrapper.text()).toContain("Yenileme");
    expect(wrapper.text()).toContain("Yüksek");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("Görev Bağlamı");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("Yenileme öncesi teklif kontrolü");
  });

  it("renders activity detail with context and lifecycle groups", async () => {
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "activities", name: "ACT-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Müşteri ziyareti");
    expect(wrapper.text()).toContain("Aktivite Yaşam Döngüsü");
    expect(wrapper.text()).toContain("Ziyaret");
    expect(wrapper.text()).toContain("Durum Özeti");
    expect(wrapper.text()).toContain("Listeye Dön");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("Aktivite Bağlamı");
    expect(wrapper.text()).toContain("CUST-001");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("Yüz yüze görüşme yapıldı");
  });
});

describe("AuxRecordDetail communication aux detail pages", () => {
  const detailStubs = {
    ActionButton: ActionButtonStub,
    DetailActionRow: genericStub,
    DetailTabsBar: DetailTabsBarStub,
    MetaListCard: genericStub,
    QuickCreateManagedDialog: true,
    StatusBadge: true,
    SkeletonLoader: true,
  };

  beforeEach(() => {
    routerPush.mockReset();
    detailReload.mockReset();
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "admin@example.com",
      full_name: "Admin",
      roles: ["System Manager"],
      preferred_home: "/app",
      locale: "tr",
    });
  });

  it("renders call note detail with context and communication groups", async () => {
    routeState.fullPath = "/at/call-notes/CN-001";
    routeState.path = "/at/call-notes/CN-001";
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "call-notes", name: "CN-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Teklif gönderildi");
    expect(wrapper.text()).toContain("İletişim Detayı");
    expect(wrapper.text()).toContain("Tamamlandı");
    expect(wrapper.text()).toContain("Telefon Görüşmesi");
    expect(wrapper.text()).toContain("İletişim Merkezini Aç");
    expect(wrapper.text()).toContain("Listeye Dön");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("Arama Bağlamı");
    expect(wrapper.text()).toContain("CUST-001");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("Müşteri yenileme teklifini değerlendirecek");
  });

  it("renders segment detail with communication and lifecycle groups", async () => {
    routeState.fullPath = "/at/segments/SEG-001";
    routeState.path = "/at/segments/SEG-001";
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "segments", name: "SEG-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Yenileme Riski");
    expect(wrapper.text()).toContain("Segment Bağlamı");
    expect(wrapper.text()).toContain("İletişim Kanalı");
    expect(wrapper.text()).toContain("Segment Yaşam Döngüsü");
    expect(wrapper.text()).toContain("WhatsApp");
    expect(wrapper.text()).toContain("Dinamik");
    expect(wrapper.text()).toContain("İletişim Merkezini Aç");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("Yüksek primli yenileme segmenti");
    expect(wrapper.text()).toContain("renewal_window_days");
  });

  it("renders campaign detail with delivery groups and related records", async () => {
    routeState.fullPath = "/at/campaigns/CMP-001";
    routeState.path = "/at/campaigns/CMP-001";
    const wrapper = mount(AuxRecordDetail, {
      props: { screenKey: "campaigns", name: "CMP-001" },
      global: { stubs: detailStubs },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Mart Yenileme");
    expect(wrapper.text()).toContain("Kampanya İletişimi");
    expect(wrapper.text()).toContain("Devam Ediyor");
    expect(wrapper.text()).toContain("İletişim Merkezini Aç");

    const relatedTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("İlişkili"));
    await relatedTab.trigger("click");
    expect(wrapper.text()).toContain("Kampanya Bağlamı");
    expect(wrapper.text()).toContain("SEG-001");
    expect(wrapper.text()).toContain("TPL-001");

    const operationsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Operasyon"));
    await operationsTab.trigger("click");
    expect(wrapper.text()).toContain("Gönderim Özeti");
    expect(wrapper.text()).toContain("45");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");
    expect(wrapper.text()).toContain("45 gönderim, 7 atlama");
  });
});
