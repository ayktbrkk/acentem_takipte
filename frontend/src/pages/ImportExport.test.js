import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import ExportData from "./ExportData.vue";
import ImportData from "./ImportData.vue";

const routerPush = vi.fn();

vi.mock("vue-router", () => ({
  createRouter: () => ({ beforeEach: vi.fn() }),
  createWebHistory: vi.fn(() => ({})),
  useRouter: () => ({ push: routerPush }),
}));

const DetailCardStub = {
  props: ["title"],
  template: `
    <section class="detail-card-stub">
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
  });

  it("parses csv imports, enables import action, and returns to dashboard on cancel", async () => {
    const wrapper = mount(ImportData, {
      global: {
        stubs: {
          DetailCard: DetailCardStub,
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
    const importButton = actionButtons.find((button) => button.text() === "Ice Aktar");
    const cancelButton = actionButtons.find((button) => button.text() === "Iptal");

    expect(importButton.element.disabled).toBe(false);

    await importButton.trigger("click");
    expect(wrapper.text()).toContain("1 kolon eslestirildi");

    await cancelButton.trigger("click");
    expect(routerPush).toHaveBeenCalledWith({ name: "dashboard" });
  });

  it("opens export url, records export history, resets form, and returns to dashboard", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const wrapper = mount(ExportData, {
      global: {
        stubs: {
          DetailCard: DetailCardStub,
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
    const exportButton = buttons.find((button) => button.text() === "Disa Aktar");
    const resetButton = buttons.find((button) => button.text() === "Sifirla");
    const cancelButton = buttons.find((button) => button.text() === "Iptal");

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
    expect(wrapper.text()).toContain("Export islemi baslatildi.");
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
});
