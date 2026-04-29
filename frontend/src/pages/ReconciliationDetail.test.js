import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";

import ReconciliationDetail from "./ReconciliationDetail.vue";

const resourceQueue = [];
const routerPush = vi.fn();

vi.mock("../stores/auth", () => ({
  useAuthStore: vi.fn(() => ({ locale: "tr" })),
}));

vi.mock("../pinia", () => ({
  getAppPinia: vi.fn(() => null),
  setAppPinia: vi.fn(),
}));

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
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

const ListTableStub = {
  props: ["columns", "rows", "emptyMessage"],
  template: `
    <div class="list-table-stub">
      <div v-if="!rows.length">{{ emptyMessage }}</div>
      <div v-else>
        <div v-for="row in rows" :key="row.id">
          {{ row.sourceDoctype || row.policy }} {{ row.sourceName || row.customer }} {{ row.status }} {{ row.difference }}
        </div>
      </div>
    </div>
  `,
};

describe("ReconciliationDetail page", () => {
  beforeEach(() => {
    resourceQueue.length = 0;
    routerPush.mockReset();

    const itemData = ref({
      name: "REC-001",
      accounting_entry: "AE-001",
      source_doctype: "AT Policy",
      source_name: "POL-001",
      mismatch_type: "Amount",
      status: "Open",
      local_amount_try: 1000,
      external_amount_try: 1250,
      difference_try: 250,
      notes: "Manual reconciliation note",
      details_json: JSON.stringify({
        matched_by: "agent@example.com",
        auto_closed: false,
      }),
      creation: "2026-03-10T08:00:00Z",
      modified: "2026-03-18T10:00:00Z",
      resolved_on: null,
      resolved_by: null,
      resolution_action: "Matched",
    });

    const entryData = ref({
      name: "AE-001",
      insurance_company: "Anadolu",
      policy: "POL-001",
      customer: "CUST-001",
      status: "Synced",
      last_synced_on: "2026-03-18T09:30:00Z",
    });

    const relatedItemsData = ref([
      {
        name: "REC-001",
        source_doctype: "AT Policy",
        source_name: "POL-001",
        mismatch_type: "Amount",
        status: "Open",
        local_amount_try: 1000,
        external_amount_try: 1250,
        difference_try: 250,
      },
      {
        name: "REC-002",
        source_doctype: "AT Policy",
        source_name: "POL-002",
        mismatch_type: "Status",
        status: "Resolved",
        local_amount_try: 700,
        external_amount_try: 700,
        difference_try: 0,
      },
    ]);

    resourceQueue.push(
      {
        data: itemData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => itemData.value),
      },
      {
        data: entryData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => entryData.value),
      },
      {
        data: relatedItemsData,
        loading: ref(false),
        error: ref(null),
        params: {},
        reload: vi.fn(async () => relatedItemsData.value),
      },
    );
  });

  it("renders reconciliation detail data and navigates back", async () => {
    const wrapper = mount(ReconciliationDetail, {
      props: { name: "REC-001" },
      global: {
        stubs: {
          StatusBadge: StatusBadgeStub,
          HeroStrip: HeroStripStub,
          SectionPanel: SectionPanelStub,
          FieldGroup: FieldGroupStub,
          ListTable: ListTableStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain("Mutabakat Detayı");
    expect(wrapper.text()).toContain("REC-001");
    expect(wrapper.text()).toContain("Anadolu");
    expect(wrapper.text()).toContain("POL-001");
    expect(wrapper.text()).toContain("Manual reconciliation note");
    expect(wrapper.text()).toContain("matched_by");
    expect(wrapper.text()).toContain("AT Policy POL-001 Mismatch");
    expect(wrapper.text()).toContain("AT Policy POL-002 Matched");
    expect(wrapper.text()).toContain("Eşleşmeyen Kayıtlar");

    const buttons = wrapper.findAll("button");
    await buttons.find((button) => button.text() === "Listeye Dön").trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "reconciliation-workbench" });
  });
});
