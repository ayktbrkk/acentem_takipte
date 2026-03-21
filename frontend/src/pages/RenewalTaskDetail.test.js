import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

import RenewalTaskDetail from "./RenewalTaskDetail.vue";

const resourceQueue = [];
const routerPush = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("frappe-ui", () => ({
  createResource: () =>
    resourceQueue.shift() || {
      data: ref([]),
      loading: ref(false),
      error: ref(null),
      params: {},
      reload: vi.fn(async () => []),
      submit: vi.fn(async () => ({})),
    },
}));

const StatusBadgeStub = {
  props: ["domain", "status"],
  template: `<span class="status-badge-stub">{{ status }}</span>`,
};

const HeroStripStub = {
  props: ["cells"],
  template: `
    <div class="hero-strip-stub">
      <div v-for="cell in cells" :key="cell.label">{{ cell.label }}: {{ cell.value }}</div>
    </div>
  `,
};

const SectionPanelStub = {
  props: ["title"],
  template: `
    <section class="section-panel-stub">
      <h2>{{ title }}</h2>
      <slot />
    </section>
  `,
};

const FieldGroupStub = {
  props: ["fields"],
  template: `
    <div class="field-group-stub">
      <div v-for="field in fields" :key="field.label">{{ field.label }}: {{ field.value }}</div>
    </div>
  `,
};

const StepBarStub = {
  props: ["steps"],
  template: `
    <div class="step-bar-stub">
      <div v-for="step in steps" :key="step.label">{{ step.label }}: {{ step.state }}</div>
    </div>
  `,
};

describe("RenewalTaskDetail page", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routerPush.mockReset();

    resourceQueue.push(
      {
        data: ref({
          name: "REN-001",
          policy: "POL-001",
          status: "In Progress",
          due_date: "2026-04-01",
          renewal_date: "2026-04-15",
          priority: "high",
          assigned_to: "agent@example.com",
          next_contact_date: "2026-03-20",
          owner: "agent@example.com",
          creation: "2026-03-10T08:00:00Z",
          modified: "2026-03-18T10:00:00Z",
          modified_by: "agent@example.com",
          lost_reason_code: "Competitor",
        }),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
      },
      {
        data: ref({
          policy_no: "P-100",
          customer: "CUST-001",
          branch: "Kasko",
          end_date: "2026-12-31",
          status: "Active",
        }),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ({})),
      },
      {
        data: ref([
          { name: "OFF-001", status: "Open", offer_date: "2026-03-11" },
        ]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ([])),
      },
      {
        data: ref([
          { name: "COM-001", subject: "Arama", channel: "Phone", creation: "2026-03-18T09:00:00Z", owner: "agent@example.com" },
        ]),
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => ([])),
      },
    );
  });

  it("renders renewal detail data and routes to related records", async () => {
    const wrapper = mount(RenewalTaskDetail, {
      props: { name: "REN-001" },
      global: {
        stubs: {
          StatusBadge: StatusBadgeStub,
          HeroStrip: HeroStripStub,
          SectionPanel: SectionPanelStub,
          FieldGroup: FieldGroupStub,
          StepBar: StepBarStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Yenileme Süreci");
    expect(wrapper.text()).toContain("Eski Poliçe Bilgileri");
    expect(wrapper.text()).toContain("Yeni Teklifler");
    expect(wrapper.text()).toContain("Müşteri İletişim Geçmişi");
    expect(wrapper.text()).toContain("Hatırlatıcılar");
    expect(wrapper.text()).toContain("POL-001");
    expect(wrapper.text()).toContain("P-100");
    expect(wrapper.text()).toContain("OFF-001");
    expect(wrapper.text()).toContain("Arama");

    const buttons = wrapper.findAll("button");
    await buttons.find((button) => button.text().includes("Listeye Dön")).trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "renewals-board" });

    await buttons.find((button) => button.text().includes("Poliçeyi Aç")).trigger("click");
    expect(routerPush).toHaveBeenCalledWith({
      name: "policy-detail",
      params: { name: "POL-001" },
    });
  });
});
