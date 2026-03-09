import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, ref } from "vue";

import AuxRecordDetail from "./AuxRecordDetail.vue";
import { useAuthStore } from "../stores/auth";

const routerPush = vi.fn();
const detailReload = vi.fn();

vi.mock("vue-router", () => ({
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
                  notes: "Musteri ile tekrar gorusulecek",
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
                  strengths_json: JSON.stringify(["2 aktif police", "Yuksek toplam prim"]),
                  risks_json: JSON.stringify(["1 geciken taksit"]),
                  score_reason_json: JSON.stringify(["Yenileme penceresinde aktif police mevcut"]),
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
          DocSummaryGrid: true,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(detailReload).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Snapshot Baglami");
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
          DocSummaryGrid: true,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");

    expect(wrapper.text()).toContain("Guclu Sinyaller");
    expect(wrapper.text()).toContain("Risk Sinyalleri");
    expect(wrapper.text()).toContain("Skor Gerekceleri");
    expect(wrapper.text()).toContain("2 aktif police");
    expect(wrapper.text()).toContain("1 geciken taksit");
    expect(wrapper.text()).toContain("Yenileme penceresinde aktif police mevcut");
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
          DocSummaryGrid: true,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Atama Baglami");
    expect(wrapper.text()).toContain("Atama Yasam Dongusu");
    expect(wrapper.text()).toContain("AT Claim");
    expect(wrapper.text()).toContain("CLM-001");
    expect(wrapper.text()).toContain("agent@example.com");
    expect(wrapper.text()).toContain("High");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");

    expect(wrapper.text()).toContain("Atama Notlari");
    expect(wrapper.text()).toContain("Musteri ile tekrar gorusulecek");
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
          DocSummaryGrid: true,
          DataTableShell: genericStub,
          MetaListCard: genericStub,
          QuickCreateManagedDialog: true,
          SectionCardHeader: genericStub,
          StatusBadge: true,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Audit Baglami");
    expect(wrapper.text()).toContain("Karar ve Eylem");
    expect(wrapper.text()).toContain("AT Campaign");
    expect(wrapper.text()).toContain("CMP-001");
    expect(wrapper.text()).toContain("Campaign executed via segment SEG-001");

    const logsTab = wrapper.findAll(".detail-tab-stub").find((node) => node.text().includes("Log"));
    await logsTab.trigger("click");

    expect(wrapper.text()).toContain("Eylem Ozeti");
    expect(wrapper.text()).toContain("Karar Baglami");
    expect(wrapper.text()).toContain("created=12");
    expect(wrapper.text()).toContain("skipped=3");
    expect(wrapper.text()).toContain("matched=15");
  });
});
