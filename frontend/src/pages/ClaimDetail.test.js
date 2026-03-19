import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";

import ClaimDetail from "./ClaimDetail.vue";

const resourceQueue = [];
const routerPush = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("frappe-ui", () => ({
  createResource: () =>
    resourceQueue.shift() || {
      data: ref({}),
      loading: ref(false),
      error: ref(null),
      params: {},
      reload: vi.fn(async () => ({})),
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
      <slot name="trailing" />
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

describe("ClaimDetail page", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routerPush.mockReset();

    const claimData = ref({
      name: "CLM-001",
      claim_no: "H-001",
      claim_status: "Under Review",
      customer: "CUST-001",
      policy: "POL-001",
      branch: "IST",
      incident_date: "2026-03-01",
      reported_date: "2026-03-02",
      estimated_amount: 5000,
      approved_amount: 3500,
      paid_amount: 1200,
      next_follow_up_on: "2026-03-25",
      notes: "Hasar notu",
      owner: "agent@example.com",
      creation: "2026-03-01T08:00:00Z",
      modified: "2026-03-18T10:00:00Z",
      modified_by: "agent@example.com",
      claim_type: "Kasko",
      office_branch: "IST",
      assigned_expert: "Expert A",
      appeal_status: "Açık",
    });

    const documentData = ref([
      { name: "FILE-001", file_name: "rapor.pdf", creation: "2026-03-18T09:00:00Z" },
    ]);

    const paymentsData = ref([
      { name: "PAY-001", payment_no: "P-001", payment_date: "2026-03-10", amount_try: 1200, status: "Paid" },
    ]);

    resourceQueue.push(
      {
        data: claimData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => claimData.value),
      },
      {
        data: documentData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => documentData.value),
      },
      {
        data: paymentsData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => paymentsData.value),
      },
    );
  });

  it("renders claim detail data and navigates to related records", async () => {
    const wrapper = mount(ClaimDetail, {
      props: { name: "CLM-001" },
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
    await nextTick();

    expect(wrapper.text()).toContain("Hasar Süreci");
    expect(wrapper.text()).toContain("Hasar Detayları");
    expect(wrapper.text()).toContain("Belgeler");
    expect(wrapper.text()).toContain("Ödeme Geçmişi");
    expect(wrapper.text()).toContain("Ekspertiz Raporlari");
    expect(wrapper.text()).toContain("H-001");
    expect(wrapper.text()).toContain("POL-001");
    expect(wrapper.text()).toContain("rapor.pdf");

    const buttons = wrapper.findAll("button");
    await buttons.find((button) => button.text() === "Listeye Dön").trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/claims");

    await wrapper.find(".cursor-pointer.rounded-lg.bg-gray-50.p-3").trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/policies/POL-001");

    await buttons.find((button) => button.text() === "Müşteri Kaydı").trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/customers/CUST-001");
  });
});
