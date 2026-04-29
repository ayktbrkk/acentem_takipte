import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";

import ExportData from "./ExportData.vue";
import ImportData from "./ImportData.vue";
import { useAuthStore } from "../stores/auth";

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  Dialog: {
    template: `<div class="dialog-stub"><slot name="body-content" /><slot name="actions" /></div>`,
  },
  createResource: () => ({
    data: { value: null },
    loading: { value: false },
    error: { value: null },
    params: {},
    reload: vi.fn(async () => null),
    submit: vi.fn(async () => ({})),
  }),
  frappeRequest: vi.fn(async () => ({})),
}));

const routerPush = vi.fn();
let pinia;

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRouter: () => ({ push: routerPush }),
}));

const SectionPanelStub = {
  props: ["title"],
  template: `
    <section class="section-panel-stub">
      <h2>{{ title }}</h2>
      <slot />
    </section>
  `,
};

class FileReaderMock {
  readAsText(file) {
    this.result = file.__content || "";
    if (typeof this.onload === "function") {
      this.onload();
    }
  }
}

describe("Import and export pages", () => {
  beforeEach(() => {
    routerPush.mockReset();
    vi.stubGlobal("FileReader", FileReaderMock);
    pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    authStore.setLocale("tr");
  });

  it("parses csv imports, enables import action, and returns to dashboard on cancel", async () => {
    const wrapper = mount(ImportData, {
      global: {
        plugins: [pinia],
        stubs: {
          SectionPanel: SectionPanelStub,
        },
      },
    });

    const fileInput = wrapper.find('input[type="file"]');
    const csvFile = {
      name: "musteriler.csv",
      __content: "Ad Soyad,E-posta\nAli Veli,ali@example.com\nAyse Yilmaz,ayse@example.com",
    };

    Object.defineProperty(fileInput.element, "files", {
      configurable: true,
      value: [csvFile],
    });
    await fileInput.trigger("change");
    await nextTick();

    expect(wrapper.text()).toContain("musteriler.csv");
    expect(wrapper.text()).toContain("Ad Soyad");
    expect(wrapper.text()).toContain("Ali Veli");

    const selects = wrapper.findAll("select");
    await selects[1].setValue("full_name");
    await nextTick();

    const actionButtons = wrapper.findAll("button");
    const importButton = actionButtons.find((button) => button.text() === "İçe Aktar");
    const cancelButton = actionButtons.find((button) => button.text() === "İptal");

    expect(importButton.element.disabled).toBe(false);

    await importButton.trigger("click");
    expect(wrapper.text()).toContain("1 kolon eşleştirildi");

    await cancelButton.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "dashboard" });
  });

  it("opens export url, records export history, resets form, and returns to dashboard", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const wrapper = mount(ExportData, {
      global: {
        plugins: [pinia],
        stubs: {
          SectionPanel: SectionPanelStub,
        },
      },
    });

    const selects = wrapper.findAll("select");
    const inputs = wrapper.findAll("input");

    await selects[0].setValue("claims_board");
    await selects[1].setValue("csv");
    await inputs.find((input) => input.attributes("type") === "text").setValue("hasar_export");
    const dateInputs = inputs.filter((input) => input.attributes("type") === "date");
    await dateInputs[0].setValue("2026-03-01");
    await dateInputs[1].setValue("2026-03-31");
    await selects[2].setValue("Open");

    const buttons = wrapper.findAll("button");
    const exportButton = buttons.find((button) => button.text() === "Dışa Aktar");
    const resetButton = buttons.find((button) => button.text() === "Sıfırla");
    const cancelButton = buttons.find((button) => button.text() === "İptal");

    await exportButton.trigger("click");

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("screen=claims_board"),
      "_blank",
      "noopener,noreferrer",
    );
    expect(openSpy.mock.calls[0][0]).toContain("format=csv");
    expect(openSpy.mock.calls[0][0]).toContain("filename=hasar_export");
    expect(openSpy.mock.calls[0][0]).toContain("start_date=2026-03-01");
    expect(openSpy.mock.calls[0][0]).toContain("end_date=2026-03-31");
    expect(openSpy.mock.calls[0][0]).toContain("status=Open");
    expect(wrapper.text()).toContain("Dışa aktarma işlemi başlatıldı.");
    expect(wrapper.text()).toContain("Hasarlar");
    expect(wrapper.text()).toContain("hasar_export");

    await resetButton.trigger("click");
    expect(wrapper.find('input[type="text"]').element.value).toBe("");
    expect(wrapper.findAll('input[type="date"]')[0].element.value).toBe("");
    expect(wrapper.findAll('input[type="date"]')[1].element.value).toBe("");

    await cancelButton.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "dashboard" });

    openSpy.mockRestore();
  });

  it("renders the export page copy in English when locale changes", async () => {
    const authStore = useAuthStore();
    authStore.setLocale("en");

    const wrapper = mount(ExportData, {
      global: {
        plugins: [pinia],
        stubs: {
          SectionPanel: SectionPanelStub,
        },
      },
    });

    expect(wrapper.text()).toContain("Data Export");
    expect(wrapper.text()).toContain("Export");
    expect(wrapper.text()).toContain("Recent Exports");
  });
});
