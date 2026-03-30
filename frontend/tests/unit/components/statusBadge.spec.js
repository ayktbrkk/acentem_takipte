import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import StatusBadge from "../../../src/components/ui/StatusBadge.vue";
import { useAuthStore } from "../../../src/stores/auth";
import { translateText } from "../../../src/utils/i18n";

describe("ui/StatusBadge", () => {
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
    });
  });

  function mountBadge(props) {
    return mount(StatusBadge, {
      props,
      global: {
        plugins: [pinia],
      },
    });
  }

  it("maps consent and lead statuses with localized labels", () => {
    const granted = mountBadge({ domain: "consent", status: "Granted" });
    expect(granted.text()).toBe(translateText("Granted", "tr"));
    expect(granted.find("span").classes()).toContain("status-active");

    const replied = mountBadge({ domain: "lead", status: "Replied" });
    expect(replied.text()).toBe(translateText("Replied", "tr"));
    expect(replied.find("span").classes()).toContain("status-active");
  });

  it("supports offer, claim, and stale lead badges", () => {
    const offer = mountBadge({ domain: "offer", status: "Accepted" });
    expect(offer.text()).toBe(translateText("Accepted", "tr"));
    expect(offer.find("span").classes()).toContain("status-open");

    const claim = mountBadge({ domain: "claim", status: "Under Review" });
    expect(claim.text()).toBe(translateText("Under Review", "tr"));
    expect(claim.find("span").classes()).toContain("status-waiting");

    const followUp = mountBadge({ domain: "lead_stale", status: "FollowUp" });
    expect(followUp.text()).toBe(translateText("Follow Up", "tr"));
    expect(followUp.find("span").classes()).toContain("status-waiting");

    const stale = mountBadge({ domain: "lead_stale", status: "Stale" });
    expect(stale.text()).toBe(translateText("Stale", "tr"));
    expect(stale.find("span").classes()).toContain("status-cancel");
  });

  it("supports payment, reminder, and notification labels", () => {
    const partiallyPaid = mountBadge({ domain: "payment", status: "Partially Paid" });
    expect(partiallyPaid.text()).toBe(translateText("Partially Paid", "tr"));
    expect(partiallyPaid.find("span").classes()).toContain("status-waiting");

    const reminder = mountBadge({ domain: "reminder", status: "Snoozed" });
    expect(reminder.text()).toBe(translateText("Snoozed", "tr"));
    expect(reminder.find("span").classes()).toContain("status-waiting");

    const notification = mountBadge({ domain: "notification_status", status: "Dead" });
    expect(notification.text()).toBe(translateText("Dead", "tr"));
    expect(notification.find("span").classes()).toContain("status-cancel");
  });

  it("respects explicit locale overrides", () => {
    const conversion = mountBadge({ domain: "lead_conversion", status: "Policy", locale: "en" });
    expect(conversion.text()).toBe("Converted to Policy");
    expect(conversion.find("span").classes()).toContain("status-active");
  });
});
