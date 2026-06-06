import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import OfferBoardPipelineSection from "./OfferBoardPipelineSection.vue";

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: "<i>{{ name }}</i>",
  },
  Dialog: {
    template: "<div><slot /></div>",
  },
}));

const stubs = {
  SectionPanel: { template: "<div><slot /></div>" },
  EmptyState: { template: "<div class='empty-state-stub'></div>" },
  SkeletonLoader: { template: "<div class='skeleton-stub'></div>" },
  StatusBadge: { props: ["status"], template: "<span class='status-badge-stub'>{{ status }}</span>" },
  ActionButton: { template: "<button><slot /></button>" },
};

function makeOffer(index) {
  return {
    name: `AT-OFF-${index}`,
    status: "Draft",
    customer_full_name: `Customer ${index}`,
    insurance_company: `Company ${index}`,
    gross_premium: 1000,
    currency: "TRY",
    valid_until: "2026-06-01",
  };
}

describe("OfferBoardPipelineSection", () => {
  it("shows at most five cards per lane and keeps an overflow badge", () => {
    const offers = Array.from({ length: 6 }, (_, index) => makeOffer(index + 1));
    const wrapper = mount(OfferBoardPipelineSection, {
      props: {
        title: "Offer Board",
        count: 6,
        lanes: [{ key: "Draft", label: "Draft", hint: "Draft offers" }],
        rowsForLane: () => offers,
        rowCountForLane: () => offers.length,
        offerCardFacts: (offer) => [{ key: "premium", value: `₺${offer.gross_premium}` }],
        isConvertible: () => false,
        emptyLaneLabel: "No offers",
        locale: "tr",
      },
      global: { stubs },
    });

    expect(wrapper.text()).toContain("5+");
    expect(wrapper.text()).toContain("AT-OFF-1");
    expect(wrapper.text()).toContain("AT-OFF-5");
    expect(wrapper.text()).not.toContain("AT-OFF-6");
  });
});
