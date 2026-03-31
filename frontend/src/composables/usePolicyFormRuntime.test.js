import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { usePolicyFormRuntime } from "./usePolicyFormRuntime";

function buildSubject(locale = "tr") {
  return usePolicyFormRuntime({
    props: {
      model: {},
      fieldErrors: {},
      optionsMap: {},
      disabled: false,
      loading: false,
      hasSourceOffer: false,
      officeBranch: "",
    },
    authStore: {
      locale: ref(locale),
    },
    emit: vi.fn(),
  });
}

describe("usePolicyFormRuntime", () => {
  it("returns Turkish customer picker copy for tr locale", () => {
    const subject = buildSubject("tr");

    expect(subject.customerPickerLabel.value).toBe("Müşteri Ara / Yeni Müşteri");
    expect(subject.customerSearchPlaceholder.value).toBe("Müşteri adı, şirket adı veya vergi numarası ile arayın...");
    expect(subject.customerNoResultsText.value).toBe(
      "Müşteri bulunamadı. Aynı arama çubuğundan yeni müşteri ekleyebilirsiniz."
    );
    expect(subject.customerLockedMessage.value).toBe(
      "Kaynak teklif seçildiğinde müşteri bilgileri otomatik devralınır."
    );
  });

  it("returns English customer picker copy for en locale", () => {
    const subject = buildSubject("en");

    expect(subject.customerPickerLabel.value).toBe("Customer Search / New Customer");
    expect(subject.customerSearchPlaceholder.value).toBe("Search by customer name, company name, or tax ID...");
    expect(subject.customerNoResultsText.value).toBe(
      "No customer found. You can add a new customer from the same search bar."
    );
    expect(subject.customerLockedMessage.value).toBe(
      "Customer information is inherited automatically when a source offer is selected."
    );
  });
});
