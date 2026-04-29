import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import ScheduledReportsManager from "./ScheduledReportsManager.vue";

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

const reportCatalog = {
  policy_list: {
    label: { tr: "Poliçe Listesi", en: "Policy List" },
  },
  claims_operations: {
    label: { tr: "Hasar Operasyonları", en: "Claims Operations" },
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

    wrapper.vm.beginCreate();
    await nextTick();
    wrapper.vm.form.recipients = "invalid-email";
    wrapper.vm.submit();
    await nextTick();

    expect(wrapper.vm.formError).toContain("Geçersiz alıcı adresi");
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

    wrapper.vm.beginCreate();
    await nextTick();
    wrapper.vm.form.recipients = "ops@example.com";
    wrapper.vm.submit();

    const emitted = wrapper.emitted("save");
    expect(emitted).toHaveLength(1);
    const payload = emitted[0][0];
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
    expect(wrapper.emitted("remove")[0][0]).toBe(1);

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

    wrapper.vm.beginCreate();
    await nextTick();
    wrapper.vm.form.reportKey = "claims_operations";

    expect(wrapper.vm.isFilterVisible("branch")).toBe(true);
    expect(wrapper.vm.isFilterVisible("insurance_company")).toBe(true);
    expect(wrapper.vm.isFilterVisible("status")).toBe(true);
    expect(wrapper.vm.isFilterVisible("from_date")).toBe(true);
    expect(wrapper.vm.isFilterVisible("to_date")).toBe(true);
  });
});
