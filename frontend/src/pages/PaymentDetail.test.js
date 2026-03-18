import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";

import PaymentDetail from "./PaymentDetail.vue";

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

const DetailCardStub = {
  props: ["title"],
  template: `
    <section class="detail-card-stub">
      <h2>{{ title }}</h2>
      <slot name="action" />
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

describe("PaymentDetail page", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routerPush.mockReset();

    const paymentData = ref({
      name: "PAY-001",
      payment_no: "T-001",
      customer: "CUST-001",
      policy: "POL-001",
      claim: "CLM-001",
      office_branch: "IST",
      sales_entity: "S-001",
      payment_direction: "Inbound",
      payment_purpose: "Premium Collection",
      status: "Draft",
      payment_date: "2026-03-18",
      due_date: "2026-04-01",
      installment_count: 3,
      installment_interval_days: 30,
      currency: "TRY",
      fx_rate: 1,
      fx_date: "2026-03-17",
      amount: 3000,
      amount_try: 3000,
      reference_no: "REF-001",
      notes: "Açıklama notu",
      owner: "agent@example.com",
      creation: "2026-03-10T08:00:00Z",
      modified: "2026-03-18T10:00:00Z",
      modified_by: "agent@example.com",
    });

    const installmentData = ref([
      {
        name: "PINST-001",
        installment_no: 1,
        installment_count: 3,
        status: "Paid",
        due_date: "2026-03-18",
        paid_on: "2026-03-18",
        amount_try: 1000,
      },
      {
        name: "PINST-002",
        installment_no: 2,
        installment_count: 3,
        status: "Scheduled",
        due_date: "2026-04-18",
        paid_on: null,
        amount_try: 1000,
      },
    ]);

    const documentData = ref([
      {
        name: "FILE-001",
        file_name: "dekont.pdf",
        creation: "2026-03-18T09:00:00Z",
      },
    ]);

    resourceQueue.push(
      {
        data: paymentData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => paymentData.value),
      },
      {
        data: installmentData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => installmentData.value),
      },
      {
        data: documentData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => documentData.value),
      },
    );
  });

  it("renders payment detail data and routes back and into related actions", async () => {
    const wrapper = mount(PaymentDetail, {
      props: { name: "PAY-001" },
      global: {
        stubs: {
          StatusBadge: StatusBadgeStub,
          HeroStrip: HeroStripStub,
          DetailCard: DetailCardStub,
          FieldGroup: FieldGroupStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain("Ödeme Bilgileri");
    expect(wrapper.text()).toContain("Finansal Özet");
    expect(wrapper.text()).toContain("Ödeme Planı");
    expect(wrapper.text()).toContain("Dekont / Fatura");
    expect(wrapper.text()).toContain("T-001");
    expect(wrapper.text()).toContain("POL-001");
    expect(wrapper.text()).toContain("CLM-001");
    expect(wrapper.text()).toContain("Tahsilat Kaydet");
    expect(wrapper.text()).toContain("Dekont Ekle");
    expect(wrapper.text()).toContain("Hatırlatma Gönder");
    expect(wrapper.text()).toContain("dekont.pdf");

    const buttons = wrapper.findAll("button");
    await buttons.find((button) => button.text() === "Listeye Dön").trigger("click");
    expect(routerPush).toHaveBeenCalledWith("/payments");

    await buttons.find((button) => button.text() === "Hatırlatma Gönder").trigger("click");
    expect(routerPush).toHaveBeenCalledWith({
      name: "communication-center",
      query: {
        payment: "PAY-001",
        mode: "reminder",
      },
    });

    await buttons.find((button) => button.text().includes("Müşteri kaydını aç")).trigger("click");
    expect(routerPush).toHaveBeenCalledWith({
      name: "customer-detail",
      params: {
        name: "CUST-001",
      },
    });
  });
});
