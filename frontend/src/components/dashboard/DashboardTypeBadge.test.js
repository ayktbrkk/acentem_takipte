import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import DashboardTypeBadge from "./DashboardTypeBadge.vue";

describe("DashboardTypeBadge", () => {
  it("renders Turkish labels for dashboard list pills", () => {
    const wrapper = mount(DashboardTypeBadge, {
      props: {
        kind: "renewal",
        t: (key) => ({
          dashboardBadgeRenewal: "Yenileme",
          dashboardBadgeRecord: "Kayıt",
        })[key] || key,
      },
    });

    expect(wrapper.text()).toBe("Yenileme");
    expect(wrapper.classes().join(" ")).toContain("bg-orange-100");
  });

  it("falls back to the shared record label for unknown kinds", () => {
    const wrapper = mount(DashboardTypeBadge, {
      props: {
        kind: "unexpected",
        t: (key) => ({
          dashboardBadgeRecord: "Record",
        })[key] || key,
      },
    });

    expect(wrapper.text()).toBe("Record");
  });
});
