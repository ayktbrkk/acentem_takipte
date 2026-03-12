import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import ScheduledReportsManager from "./ScheduledReportsManager.vue";

const reportCatalog = {
  policy_list: {
    label: { tr: "Poliçe Listesi", en: "Policy List" },
  },
  claims_operations: {
    label: { tr: "Hasar Operasyonlari", en: "Claims Operations" },
  },
};

describe("ScheduledReportsManager", () => {
  it("validates recipient email before emit save", async () => {
    const wrapper = mount(ScheduledReportsManager, {
      props: {
        items: [],
        loading: false,
        running: false,
        locale: "tr",
        reportCatalog,
      },
    });

    const newButton = wrapper.findAll("button").find((button) => button.text() === "Yeni Kural");
    await newButton?.trigger("click");

    await wrapper.find("textarea").setValue("invalid-email");
    await wrapper.find("form").trigger("submit.prevent");

    expect(wrapper.text()).toContain("Gecersiz alici adresi");
    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("emits save payload with normalized fields on valid form", async () => {
    const wrapper = mount(ScheduledReportsManager, {
      props: {
        items: [],
        loading: false,
        running: false,
        locale: "tr",
        reportCatalog,
      },
    });

    const newButton = wrapper.findAll("button").find((button) => button.text() === "Yeni Kural");
    await newButton?.trigger("click");

    await wrapper.find("textarea").setValue("ops@example.com");
    await wrapper.find("form").trigger("submit.prevent");

    const emitted = wrapper.emitted("save");
    expect(emitted).toHaveLength(1);
    const payload = emitted[0][0][0];
    expect(payload.config.report_key).toBe("policy_list");
    expect(payload.config.recipients).toEqual(["ops@example.com"]);
    expect(payload.config.delivery_channel).toBe("email");
  });

  it("confirms before emitting remove", async () => {
    const wrapper = mount(ScheduledReportsManager, {
      props: {
        items: [
          {
            index: 1,
            report_key: "policy_list",
            enabled: 1,
            frequency: "daily",
            format: "xlsx",
            delivery_channel: "email",
            limit: 1000,
            recipients: ["ops@example.com"],
            filters: {},
            last_status: "sent",
            last_run_at: "",
          },
        ],
        loading: false,
        running: false,
        locale: "tr",
        reportCatalog,
      },
    });

    vi.spyOn(window, "confirm").mockReturnValue(true);

    const removeButton = wrapper.findAll("button").find((button) => button.text() === "Sil");
    await removeButton?.trigger("click");

    expect(wrapper.emitted("remove")).toHaveLength(1);
    expect(wrapper.emitted("remove")[0][0]).toEqual([1]);

    vi.mocked(window.confirm).mockRestore();
  });

  it("shows branch, company, status and date filters for claims operations", async () => {
    const wrapper = mount(ScheduledReportsManager, {
      props: {
        items: [],
        loading: false,
        running: false,
        locale: "tr",
        reportCatalog,
      },
    });

    const newButton = wrapper.findAll("button").find((button) => button.text() === "Yeni Kural");
    await newButton?.trigger("click");

    const selects = wrapper.findAll("select");
    await selects[0].setValue("claims_operations");

    expect(wrapper.text()).toContain("Sigorta Branşı");
    expect(wrapper.text()).toContain("Sigorta Şirketi");
    expect(wrapper.text()).toContain("Durum");
    expect(wrapper.text()).toContain("Başlangıç Tarihi");
    expect(wrapper.text()).toContain("Bitiş Tarihi");
  });
});
