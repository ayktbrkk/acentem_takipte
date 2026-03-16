import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import StatusBadge from "../../../src/components/ui/StatusBadge.vue";

describe("ui/StatusBadge", () => {
  it("maps consent statuses with customer-facing labels", () => {
    const granted = mount(StatusBadge, {
      props: { domain: "consent", status: "Granted" },
    });
    expect(granted.text()).toBe("Onaylı");
    expect(granted.find("span").classes()).toContain("status-active");

    const unknown = mount(StatusBadge, {
      props: { domain: "consent", status: "Unknown" },
    });
    expect(unknown.text()).toBe("Bilinmiyor");
    expect(unknown.find("span").classes()).toContain("status-draft");
  });

  it("supports customer detail activity and reminder domains", () => {
    const activity = mount(StatusBadge, {
      props: { domain: "activity", status: "Done" },
    });
    expect(activity.text()).toBe("Tamamlandı");
    expect(activity.find("span").classes()).toContain("status-active");

    const reminder = mount(StatusBadge, {
      props: { domain: "reminder", status: "Snoozed" },
    });
    expect(reminder.text()).toBe("Ertelendi");
    expect(reminder.find("span").classes()).toContain("status-waiting");
  });

  it("supports payment statuses used in customer timelines", () => {
    const partiallyPaid = mount(StatusBadge, {
      props: { domain: "payment", status: "Partially Paid" },
    });
    expect(partiallyPaid.text()).toBe("Kısmi Ödendi");
    expect(partiallyPaid.find("span").classes()).toContain("status-waiting");

    const failed = mount(StatusBadge, {
      props: { domain: "payment", status: "Failed" },
    });
    expect(failed.text()).toBe("Başarısız");
    expect(failed.find("span").classes()).toContain("status-cancel");
  });

  it("supports lead stale and conversion domain mappings", () => {
    const stale = mount(StatusBadge, {
      props: { domain: "lead_stale", status: "Stale" },
    });
    expect(stale.text()).toBe("Bekliyor");
    expect(stale.find("span").classes()).toContain("status-cancel");

    const conversion = mount(StatusBadge, {
      props: { domain: "lead_conversion", status: "Policy" },
    });
    expect(conversion.text()).toBe("Poliçeye Dönüştü");
    expect(conversion.find("span").classes()).toContain("status-active");
  });
});
